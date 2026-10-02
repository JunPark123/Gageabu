using Gagebu_Server.Data;
using GagebuShared;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace Gagebu_Server.Push
{
    // 큐의 알림 작업을 하나씩 꺼내 받을 사람·문구를 정하고 보낸다
    public class PushWorker : BackgroundService
    {
        public static readonly int[] BudgetThresholds = [80, 100];
        private static readonly TimeSpan Kst = TimeSpan.FromHours(9);

        private readonly PushQueue _queue;
        private readonly IServiceScopeFactory _scopes;
        private readonly PushSettings _settings;
        private readonly ILogger<PushWorker> _logger;

        public PushWorker(PushQueue queue, IServiceScopeFactory scopes, IOptions<PushSettings> settings, ILogger<PushWorker> logger)
        {
            _queue = queue;
            _scopes = scopes;
            _settings = settings.Value;
            _logger = logger;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            await foreach (var job in _queue.Reader.ReadAllAsync(stoppingToken))
            {
                if (!_settings.Enabled) continue;
                try
                {
                    await using var scope = _scopes.CreateAsyncScope();
                    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
                    var sender = scope.ServiceProvider.GetRequiredService<IPushSender>();
                    var messages = job switch
                    {
                        TransactionCreatedJob t => await ComposeAsync(db, t, stoppingToken),
                        MemberJoinedJob j => await ComposeAsync(db, j, stoppingToken),
                        _ => [],
                    };
                    if (messages.Count == 0) continue;

                    var results = await sender.SendAsync(messages, stoppingToken);
                    // 앱 삭제 등으로 더 이상 받을 수 없는 토큰은 지운다
                    var dead = results.Where(r => r.Error == "DeviceNotRegistered").Select(r => r.To).ToList();
                    if (dead.Count > 0)
                        await db.PushTokens.Where(p => dead.Contains(p.Token)).ExecuteDeleteAsync(stoppingToken);
                    foreach (var r in results.Where(r => !r.Ok))
                        _logger.LogWarning("Push to {Token} failed: {Error}", Mask(r.To), r.Error);
                }
                catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
                {
                    break;
                }
                catch (Exception ex)
                {
                    // 알림 실패는 기록만 (저장은 이미 끝남)
                    _logger.LogWarning(ex, "Push job {Job} failed", job);
                }
            }
        }

        // 받을 사람: 같은 가계부 멤버 중 설정을 켠 사람의, 로그인이 살아 있는 기기 토큰
        public static async Task<List<PushMessage>> ComposeAsync(AppDbContext db, TransactionCreatedJob job, CancellationToken ct)
        {
            var t = await db.Transactions.IgnoreQueryFilters().AsNoTracking()
                .SingleOrDefaultAsync(x => x.Id == job.TransactionId && x.HouseholdId == job.HouseholdId, ct);
            if (t == null) return [];

            var members = await (from m in db.HouseholdMembers
                                 join u in db.Users on m.UserId equals u.Id
                                 where m.HouseholdId == job.HouseholdId
                                 select u).AsNoTracking().ToListAsync(ct);
            var actor = members.FirstOrDefault(u => u.Id == job.ActorUserId);
            if (actor == null) return [];

            var now = DateTime.UtcNow;
            var tokens = await (from p in db.PushTokens
                                join s in db.UserSessions on p.SessionId equals s.Id
                                where s.RevokedAt == null && s.ExpiresAt > now
                                select p).AsNoTracking().ToListAsync(ct);
            var tokensByUser = tokens.GroupBy(p => p.UserId).ToDictionary(g => g.Key, g => g.Select(p => p.Token).ToList());
            List<string> TokensOf(IEnumerable<User> users) => users.SelectMany(u => tokensByUser.GetValueOrDefault(u.Id) ?? []).Distinct().ToList();

            var messages = new List<PushMessage>();
            var isExpense = t.Paytype == (int)ePayType.Expense;
            var data = new Dictionary<string, object?> { ["kind"] = "transaction", ["transactionId"] = t.Id };

            // 1) 함께 쓰는 사람이 기록함
            var what = string.IsNullOrWhiteSpace(t.Category) ? (isExpense ? "지출" : "수입") : t.Category;
            // 내역 이름(예: 점심)이 카테고리와 다르면 뒤에 붙인다
            var memo = string.IsNullOrWhiteSpace(t.Type) || t.Type == t.Category ? "" : $" · {Trim(t.Type, 20)}";
            var body = $"{actor.Nickname}님이 {what} {t.Cost:N0}원 {(isExpense ? "지출" : "수입")}을 기록했어요{memo}";
            foreach (var to in TokensOf(members.Where(u => u.Id != actor.Id && u.NotifyPartnerRecords)))
                messages.Add(new PushMessage(to, "새 기록 🐷", body, data));

            // 2) 이 지출로 그 달 예산의 80%·100%를 처음 넘었으면 모두에게
            if (isExpense)
            {
                var local = t.Date + Kst;
                var monthStart = new DateTime(local.Year, local.Month, 1, 0, 0, 0, DateTimeKind.Utc) - Kst;
                var monthEnd = monthStart.AddMonths(1);
                var budget = await MonthBudgetAsync(db, job.HouseholdId, local.Year, local.Month, ct);
                if (budget is int b && b > 0)
                {
                    // 이 거래까지(먼저 기록된 것만)의 합계 — 알림은 늦게 처리될 수 있어 뒤에 기록된 지출이 섞이면 같은 알림이 두 번 나감
                    var after = await db.Transactions.IgnoreQueryFilters()
                        .Where(x => x.HouseholdId == job.HouseholdId && x.Paytype == (int)ePayType.Expense && x.Date >= monthStart && x.Date < monthEnd && x.Id <= t.Id)
                        .SumAsync(x => (long)x.Cost, ct);
                    var before = after - t.Cost;
                    var crossed = BudgetThresholds.LastOrDefault(p => before * 100 < (long)b * p && after * 100 >= (long)b * p);
                    if (crossed > 0)
                    {
                        var (title, text) = crossed >= 100
                            ? ("예산을 넘었어요 🐷💦", $"{local.Month}월 예산 {b:N0}원을 넘었어요. 지금까지 {after:N0}원 썼어요")
                            : ($"예산 {crossed}% 사용", $"{local.Month}월 예산 {b:N0}원 중 {after:N0}원을 썼어요. 남은 날도 같이 아껴요!");
                        var budgetData = new Dictionary<string, object?> { ["kind"] = "budget", ["percent"] = crossed };
                        foreach (var to in TokensOf(members.Where(u => u.NotifyBudget)))
                            messages.Add(new PushMessage(to, title, text, budgetData));
                    }
                }
            }
            return messages;
        }

        // 새 멤버: 원래 있던 멤버 모두에게 (가계부 구성이 바뀌는 일이라 알림 설정과 관계없이)
        public static async Task<List<PushMessage>> ComposeAsync(AppDbContext db, MemberJoinedJob job, CancellationToken ct)
        {
            var joiner = await db.Users.AsNoTracking().SingleOrDefaultAsync(u => u.Id == job.UserId, ct);
            var household = await db.Households.AsNoTracking().SingleOrDefaultAsync(h => h.Id == job.HouseholdId, ct);
            if (joiner == null || household == null) return [];

            var others = await db.HouseholdMembers.Where(m => m.HouseholdId == job.HouseholdId && m.UserId != job.UserId)
                .Select(m => m.UserId).ToListAsync(ct);
            var now = DateTime.UtcNow;
            var tokens = await (from p in db.PushTokens
                                join s in db.UserSessions on p.SessionId equals s.Id
                                where others.Contains(p.UserId) && s.RevokedAt == null && s.ExpiresAt > now
                                select p.Token).Distinct().ToListAsync(ct);
            var data = new Dictionary<string, object?> { ["kind"] = "member", ["userId"] = joiner.Id };
            return tokens.Select(t => new PushMessage(t, "새 멤버가 들어왔어요 🎉", $"{joiner.Nickname}님이 「{household.Name}」에 함께하게 됐어요", data)).ToList();
        }

        // 그 달 적용 예산: 달별 예외(0 = 그 달 예산 없음)가 있으면 그것, 없으면 기본 예산
        private static async Task<int?> MonthBudgetAsync(AppDbContext db, int householdId, int year, int month, CancellationToken ct)
        {
            var over = await db.BudgetOverrides.AsNoTracking().SingleOrDefaultAsync(o => o.HouseholdId == householdId && o.Year == year && o.Month == month, ct);
            if (over != null) return over.Amount == 0 ? null : over.Amount;
            return await db.Households.Where(h => h.Id == householdId).Select(h => h.DefaultMonthlyBudget).SingleOrDefaultAsync(ct);
        }

        private static string Trim(string s, int max) => s.Length <= max ? s : s[..max] + "…";

        private static string Mask(string token) => token.Length > 24 ? token[..22] + "…" : token;
    }
}
