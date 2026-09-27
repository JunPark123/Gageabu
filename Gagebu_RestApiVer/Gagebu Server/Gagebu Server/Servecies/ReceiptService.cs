using System.Text.Json;
using Gagebu_Server.Auth;
using Gagebu_Server.Data;
using Gagebu_Server.DTO;
using Gagebu_Server.Realtime;
using GagebuShared;
using Microsoft.EntityFrameworkCore;

namespace Gagebu_Server.Servecies
{
    // 영수증 분석 (docs/PLAN.md 4단계)
    // 앱: OCR 글자 제출 → (워커가 추천 초안) → 확인·수정 → 확정 = 거래 저장. 추천만으로는 거래를 만들지 않는다
    public class ReceiptService
    {
        public const int MaxLines = 500;
        public const int MaxTextLength = 20_000;
        public const int MaxAttempts = 3;
        public static readonly TimeSpan Lease = TimeSpan.FromMinutes(2);   // 워커가 가져가고 이 시간 안에 결과가 없으면 다시 대기열로

        private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web);

        private readonly AppDbContext _db;
        private readonly CurrentUser _current;
        private readonly IHouseholdNotifier _notifier;

        public ReceiptService(AppDbContext db, CurrentUser current, IHouseholdNotifier notifier)
        {
            _db = db;
            _current = current;
            _notifier = notifier;
        }

        // ── 앱 ─────────────────────────────────────────────────

        // 분석 요청. 같은 ClientRequestId면 새로 만들지 않고 기존 작업을 돌려준다 (Created = false)
        public async Task<ServiceResult<(ReceiptDto Receipt, bool Created)>> CreateAsync(CreateReceiptRequest req)
        {
            var requestId = req.ClientRequestId?.Trim() ?? "";
            if (requestId.Length is < 1 or > 100)
                return ServiceResult<(ReceiptDto, bool)>.ValidationError("clientRequestId는 1~100자");
            var lines = (req.Lines ?? new()).Where(l => !string.IsNullOrWhiteSpace(l.Text)).ToList();
            if (lines.Count == 0)
                return ServiceResult<(ReceiptDto, bool)>.ValidationError("OCR 결과(lines)가 비어 있어요");
            if (lines.Count > MaxLines || lines.Sum(l => l.Text.Length) > MaxTextLength)
                return ServiceResult<(ReceiptDto, bool)>.ValidationError($"영수증 글자가 너무 많아요 (최대 {MaxLines}줄, {MaxTextLength:N0}자)");

            var householdId = _current.HouseholdId!.Value;
            var existing = await _db.ReceiptJobs.SingleOrDefaultAsync(r => r.ClientRequestId == requestId);
            if (existing != null)
                return ServiceResult<(ReceiptDto, bool)>.Success((ToDto(existing), false));

            var job = new ReceiptJob
            {
                HouseholdId = householdId,
                CreatedByUserId = _current.UserId,
                ClientRequestId = requestId,
                Status = eReceiptStatus.Pending,
                CreatedAt = DateTime.UtcNow,
                CapturedAt = req.CapturedAt?.UtcDateTime,
                OcrJson = JsonSerializer.Serialize(lines, Json),
            };
            _db.ReceiptJobs.Add(job);
            try
            {
                await _db.SaveChangesAsync();
            }
            catch (DbUpdateException)
            {
                // 같은 요청이 동시에 두 번 온 경우(유일 인덱스 충돌): 먼저 저장된 쪽을 돌려준다
                _db.Entry(job).State = EntityState.Detached;
                var winner = await _db.ReceiptJobs.AsNoTracking().SingleOrDefaultAsync(r => r.ClientRequestId == requestId);
                if (winner == null) throw;
                return ServiceResult<(ReceiptDto, bool)>.Success((ToDto(winner), false));
            }
            return ServiceResult<(ReceiptDto, bool)>.Success((ToDto(job), true));
        }

        public async Task<ServiceResult<ReceiptDto>> GetAsync(int id)
        {
            var job = await _db.ReceiptJobs.SingleOrDefaultAsync(r => r.Id == id);
            return job == null
                ? ServiceResult<ReceiptDto>.NotFound("영수증을 찾을 수 없어요")
                : ServiceResult<ReceiptDto>.Success(ToDto(job));
        }

        // 아직 확정·버리지 않은 영수증 (최근 순)
        public async Task<ServiceResult<List<ReceiptDto>>> ListOpenAsync()
        {
            var jobs = await _db.ReceiptJobs
                .Where(r => r.Status != eReceiptStatus.Confirmed && r.Status != eReceiptStatus.Discarded)
                .OrderByDescending(r => r.Id)
                .Take(50)
                .ToListAsync();
            return ServiceResult<List<ReceiptDto>>.Success(jobs.Select(ToDto).ToList());
        }

        // 확정: 사용자가 고친 값으로 거래를 한 번에 저장. 이미 확정된 영수증이면 같은 결과를 돌려준다 (재전송 안전)
        public async Task<ServiceResult<ReceiptDto>> ConfirmAsync(int id, ConfirmReceiptRequest req)
        {
            var job = await _db.ReceiptJobs.SingleOrDefaultAsync(r => r.Id == id);
            if (job == null)
                return ServiceResult<ReceiptDto>.NotFound("영수증을 찾을 수 없어요");
            if (job.Status == eReceiptStatus.Confirmed)
                return ServiceResult<ReceiptDto>.Success(ToDto(job));
            if (job.Status == eReceiptStatus.Discarded)
                return ServiceResult<ReceiptDto>.Conflict("버린 영수증이에요");
            // 분석이 끝나기 전이라도 사용자가 직접 입력해 확정할 수 있다 (워커 결과는 이후 무시됨)

            var items = req.Transactions ?? new();
            if (items.Count is < 1 or > 50)
                return ServiceResult<ReceiptDto>.ValidationError("거래는 1~50건");
            foreach (var item in items)
            {
                if (TransactionService.Validate(item) is string error)
                    return ServiceResult<ReceiptDto>.ValidationError(error);
            }

            await using var tx = await _db.Database.BeginTransactionAsync();
            // 동시에 두 번 확정해도 한 번만: 상태를 먼저 바꾼 요청만 진행
            var now = DateTime.UtcNow;
            var claimed = await _db.ReceiptJobs
                .Where(r => r.Id == id && r.Status != eReceiptStatus.Confirmed && r.Status != eReceiptStatus.Discarded)
                .ExecuteUpdateAsync(s => s.SetProperty(r => r.Status, eReceiptStatus.Confirmed).SetProperty(r => r.ConfirmedAt, now));
            if (claimed == 0)
            {
                await tx.RollbackAsync();
                await _db.Entry(job).ReloadAsync();
                return job.Status == eReceiptStatus.Confirmed
                    ? ServiceResult<ReceiptDto>.Success(ToDto(job))
                    : ServiceResult<ReceiptDto>.Conflict("버린 영수증이에요");
            }

            var entities = items.Select(item => new GagebuTransaction
            {
                HouseholdId = job.HouseholdId,
                CreatedByUserId = _current.UserId,
                Type = item.Type,
                Cost = item.Cost,
                Date = item.Date.UtcDateTime,
                Paytype = (int)item.Paytype,
                Category = item.Category ?? "",
                Content = item.Content ?? "",
            }).ToList();
            _db.Transactions.AddRange(entities);
            await _db.SaveChangesAsync();

            job.Status = eReceiptStatus.Confirmed;
            job.ConfirmedAt = now;
            job.ConfirmedJson = JsonSerializer.Serialize(items, Json);
            job.TransactionIds = entities.Select(e => e.Id).ToList();
            await _db.SaveChangesAsync();
            await tx.CommitAsync();

            await _notifier.ChangedAsync(job.HouseholdId, HouseholdNotifier.Transactions);
            await _notifier.ChangedAsync(job.HouseholdId, HouseholdNotifier.Receipts);
            return ServiceResult<ReceiptDto>.Success(ToDto(job));
        }

        public async Task<ServiceResult<bool>> DiscardAsync(int id)
        {
            var job = await _db.ReceiptJobs.SingleOrDefaultAsync(r => r.Id == id);
            if (job == null)
                return ServiceResult<bool>.NotFound("영수증을 찾을 수 없어요");
            if (job.Status == eReceiptStatus.Confirmed)
                return ServiceResult<bool>.Conflict("이미 저장한 영수증이에요. 거래를 삭제하세요");
            job.Status = eReceiptStatus.Discarded;
            await _db.SaveChangesAsync();
            await _notifier.ChangedAsync(job.HouseholdId, HouseholdNotifier.Receipts);
            return ServiceResult<bool>.Success(true);
        }

        // ── 워커 (/internal) — 가계부 필터 없이 전체 대기열을 본다 ──────────

        // 다음 작업 하나를 가져간다. 없으면 null
        public async Task<ReceiptWorkDto?> ClaimAsync()
        {
            // 너무 여러 번 실패한(시간 초과된) 작업은 포기
            var failedIds = await _db.Database.SqlQueryRaw<int>("""
                UPDATE "ReceiptJobs" SET "Status" = {0}, "FailureReason" = '분석 시간 초과', "ProcessedAt" = now()
                WHERE "Status" = {1} AND "ClaimedAt" < now() - {2} AND "AttemptCount" >= {3}
                RETURNING "HouseholdId" AS "Value"
                """, (int)eReceiptStatus.Failed, (int)eReceiptStatus.Processing, Lease, MaxAttempts).ToListAsync();
            foreach (var householdId in failedIds.Distinct())
                await _notifier.ChangedAsync(householdId, HouseholdNotifier.Receipts);

            // 대기 중이거나, 가져간 뒤 시간이 지난 작업 (여러 워커가 동시에 와도 한 작업은 한 곳만: SKIP LOCKED)
            var claimedId = (await _db.Database.SqlQueryRaw<int>("""
                UPDATE "ReceiptJobs" SET "Status" = {0}, "ClaimedAt" = now(), "AttemptCount" = "AttemptCount" + 1
                WHERE "Id" = (
                    SELECT "Id" FROM "ReceiptJobs"
                    WHERE "Status" = {1} OR ("Status" = {0} AND "ClaimedAt" < now() - {2})
                    ORDER BY "Id"
                    FOR UPDATE SKIP LOCKED
                    LIMIT 1)
                RETURNING "Id" AS "Value"
                """, (int)eReceiptStatus.Processing, (int)eReceiptStatus.Pending, Lease).ToListAsync()).FirstOrDefault();
            if (claimedId == 0)
                return null;

            var job = await _db.ReceiptJobs.IgnoreQueryFilters().AsNoTracking().SingleAsync(r => r.Id == claimedId);
            return new ReceiptWorkDto
            {
                Id = job.Id,
                CapturedAt = job.CapturedAt is DateTime c ? new DateTimeOffset(c, TimeSpan.Zero) : null,
                Lines = JsonSerializer.Deserialize<List<OcrLineDto>>(job.OcrJson, Json) ?? new(),
                Attempt = job.AttemptCount,
            };
        }

        public async Task<ServiceResult<bool>> CompleteAsync(int id, ReceiptResultRequest req)
        {
            if (string.IsNullOrWhiteSpace(req.EngineVersion) || req.EngineVersion.Length > 50)
                return ServiceResult<bool>.ValidationError("engineVersion은 1~50자");
            if (req.Suggestion.Total is < 0)
                return ServiceResult<bool>.ValidationError("total은 0 이상");

            return await FinishAsync(id, job =>
            {
                job.Status = eReceiptStatus.Ready;
                job.EngineVersion = req.EngineVersion;
                job.SuggestionJson = JsonSerializer.Serialize(req.Suggestion, Json);
                job.FailureReason = null;
            });
        }

        public async Task<ServiceResult<bool>> FailAsync(int id, ReceiptFailRequest req)
        {
            var reason = req.Reason?.Trim() ?? "";
            if (reason.Length is < 1 or > 500)
                return ServiceResult<bool>.ValidationError("reason은 1~500자");

            return await FinishAsync(id, job =>
            {
                job.Status = eReceiptStatus.Failed;
                job.EngineVersion = req.EngineVersion;
                job.FailureReason = reason;
            });
        }

        // 분석 중인 작업만 결과를 받는다 (그 사이 사용자가 확정·버렸거나, 시간 초과로 다른 워커가 가져갔으면 409)
        private async Task<ServiceResult<bool>> FinishAsync(int id, Action<ReceiptJob> apply)
        {
            var job = await _db.ReceiptJobs.IgnoreQueryFilters().SingleOrDefaultAsync(r => r.Id == id);
            if (job == null)
                return ServiceResult<bool>.NotFound("작업이 없어요");
            if (job.Status != eReceiptStatus.Processing)
                return ServiceResult<bool>.Conflict($"분석 중인 작업이 아니에요 ({job.Status})");

            apply(job);
            job.ProcessedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync();
            await _notifier.ChangedAsync(job.HouseholdId, HouseholdNotifier.Receipts);
            return ServiceResult<bool>.Success(true);
        }

        private static ReceiptDto ToDto(ReceiptJob job) => new()
        {
            Id = job.Id,
            ClientRequestId = job.ClientRequestId,
            Status = job.Status,
            CreatedAt = new DateTimeOffset(job.CreatedAt, TimeSpan.Zero),
            CapturedAt = job.CapturedAt is DateTime c ? new DateTimeOffset(c, TimeSpan.Zero) : null,
            Suggestion = job.SuggestionJson == null ? null : JsonSerializer.Deserialize<ReceiptSuggestionDto>(job.SuggestionJson, Json),
            FailureReason = job.FailureReason,
            TransactionIds = job.TransactionIds,
        };
    }
}
