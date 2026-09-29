using System.Security.Cryptography;
using Gagebu_Server.Auth;
using Gagebu_Server.Data;
using Gagebu_Server.DTO;
using Gagebu_Server.Realtime;
using GagebuShared;
using Microsoft.EntityFrameworkCore;

namespace Gagebu_Server.Servecies
{
    // 사용자·가계부 멤버·초대 (docs/PLAN.md 4장)
    // 정책(2026-09-27 기본안, 바꿀 수 있음): 1인 1가계부, 최대 10명, 초대 코드 1회용·24시간, 초대·내보내기는 방장만
    public class HouseholdService
    {
        public const int MaxMembers = 10;
        public static readonly TimeSpan InviteLifetime = TimeSpan.FromHours(24);
        // 헷갈리는 글자(0/O, 1/I/L) 제외
        private const string CodeAlphabet = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
        private const int CodeLength = 8;

        private readonly AppDbContext _db;
        private readonly CurrentUser _current;
        private readonly SessionService _sessions;
        private readonly IHouseholdNotifier _notifier;

        public HouseholdService(AppDbContext db, CurrentUser current, SessionService sessions, IHouseholdNotifier notifier)
        {
            _db = db;
            _current = current;
            _sessions = sessions;
            _notifier = notifier;
        }

        // ── 로그인 ──────────────────────────────────────────────

        // 개발용 로그인: Key로 사용자를 찾거나 만든다. 컨트롤러가 Development + 설정일 때만 호출
        public async Task<ServiceResult<LoginResponse>> DevLoginAsync(DevLoginRequest req)
        {
            var key = req.Key?.Trim() ?? "";
            if (key.Length is < 1 or > 50)
                return ServiceResult<LoginResponse>.ValidationError("key는 1~50자");

            var user = await _db.Users.SingleOrDefaultAsync(u => u.DevKey == key)
                ?? await CreateUserAsync(new User
                {
                    DevKey = key,
                    Nickname = CleanNickname(req.Nickname) ?? key,
                    Avatar = CleanAvatar(req.Avatar) ?? "🐷",
                });
            return ServiceResult<LoginResponse>.Success(await LoginResponseAsync(user.Id, req.DeviceName, req.DeviceId));
        }

        // 카카오 로그인: 앱이 카카오 SDK로 받은 액세스 토큰을 카카오에 확인하고, 우리 앱에서 발급된 토큰일 때만 로그인
        public async Task<ServiceResult<LoginResponse>> KakaoLoginAsync(KakaoLoginRequest req, IKakaoApi kakao, long? appId)
        {
            if (appId is null)
                return ServiceResult<LoginResponse>.Unavailable("카카오 로그인이 설정되지 않았어요 (Kakao__AppId)");
            if (string.IsNullOrWhiteSpace(req.AccessToken))
                return ServiceResult<LoginResponse>.ValidationError("accessToken이 필요해요");

            var info = await kakao.GetTokenInfoAsync(req.AccessToken);
            if (info == null)
                return ServiceResult<LoginResponse>.Unauthorized("카카오 로그인이 만료됐거나 유효하지 않아요");
            // 다른 앱에서 받은 토큰으로 우리 사용자가 되는 것을 막는다
            if (info.AppId != appId)
                return ServiceResult<LoginResponse>.Unauthorized("이 앱에서 발급된 카카오 토큰이 아니에요");

            var kakaoId = info.UserId.ToString();
            var user = await _db.Users.SingleOrDefaultAsync(u => u.KakaoId == kakaoId);
            if (user == null)
            {
                var profile = await kakao.GetProfileAsync(req.AccessToken);
                user = await CreateUserAsync(new User
                {
                    KakaoId = kakaoId,
                    Nickname = CleanNickname(profile?.Nickname) ?? "새 사용자",
                    Avatar = "🐷",
                });
            }
            return ServiceResult<LoginResponse>.Success(await LoginResponseAsync(user.Id, req.DeviceName, req.DeviceId));
        }

        private async Task<User> CreateUserAsync(User user)
        {
            user.CreatedAt = DateTime.UtcNow;
            await using var tx = await _db.Database.BeginTransactionAsync();
            _db.Users.Add(user);
            await _db.SaveChangesAsync();
            await AssignFirstHouseholdAsync(user);
            await tx.CommitAsync();

            // 기본 가계부에 들어갔으면 로그인 없이 연결된 앱에도 멤버가 생겼다고 알림
            var joined = await _db.HouseholdMembers.Where(m => m.UserId == user.Id).Select(m => m.HouseholdId).FirstAsync();
            await _notifier.ChangedAsync(joined, HouseholdNotifier.Household);
            return user;
        }

        private async Task<LoginResponse> LoginResponseAsync(int userId, string? deviceName, string? deviceId)
        {
            var tokens = await _sessions.StartAsync(userId, deviceName, deviceId);
            return new LoginResponse
            {
                Token = tokens.Token,
                ExpiresAt = tokens.ExpiresAt,
                RefreshToken = tokens.RefreshToken,
                SessionId = tokens.SessionId,
                Me = await BuildMeAsync(userId),
            };
        }

        // 새 사용자의 첫 가계부: 기존 기본 가계부(로그인 도입 전 내역)에 아무도 없으면 그 방장이 되고, 아니면 새로 만든다
        private async Task AssignFirstHouseholdAsync(User user)
        {
            var defaultHasMembers = await _db.HouseholdMembers.AnyAsync(m => m.HouseholdId == Household.DefaultId);
            if (!defaultHasMembers)
            {
                _db.HouseholdMembers.Add(new HouseholdMember
                {
                    HouseholdId = Household.DefaultId, UserId = user.Id, Role = eHouseholdRole.Owner, JoinedAt = DateTime.UtcNow,
                });
                await _db.SaveChangesAsync();
                return;
            }
            await CreatePersonalHouseholdAsync(user);
        }

        private async Task<Household> CreatePersonalHouseholdAsync(User user)
        {
            var household = new Household { Name = $"{user.Nickname}의 가계부", CreatedAt = DateTime.UtcNow };
            _db.Households.Add(household);
            await _db.SaveChangesAsync();
            _db.HouseholdMembers.Add(new HouseholdMember
            {
                HouseholdId = household.Id, UserId = user.Id, Role = eHouseholdRole.Owner, JoinedAt = DateTime.UtcNow,
            });
            await _db.SaveChangesAsync();
            return household;
        }

        // ── 내 정보 ─────────────────────────────────────────────

        public async Task<ServiceResult<MeDto>> GetMeAsync() =>
            ServiceResult<MeDto>.Success(await BuildMeAsync(_current.UserId!.Value));

        public async Task<ServiceResult<MeDto>> UpdateProfileAsync(UpdateProfileRequest req)
        {
            var user = await _db.Users.SingleAsync(u => u.Id == _current.UserId);
            if (req.Nickname != null)
            {
                var nickname = CleanNickname(req.Nickname);
                if (nickname == null) return ServiceResult<MeDto>.ValidationError("닉네임은 1~20자");
                user.Nickname = nickname;
            }
            if (req.Avatar != null)
            {
                var avatar = CleanAvatar(req.Avatar);
                if (avatar == null) return ServiceResult<MeDto>.ValidationError("아바타는 1~16자");
                user.Avatar = avatar;
            }
            await _db.SaveChangesAsync();
            if (_current.HouseholdId is int householdId)
                await _notifier.ChangedAsync(householdId, HouseholdNotifier.Household); // 멤버 목록의 닉네임·아바타
            return ServiceResult<MeDto>.Success(await BuildMeAsync(user.Id));
        }

        // ── 가계부 ──────────────────────────────────────────────

        public async Task<ServiceResult<HouseholdDto>> GetHouseholdAsync()
        {
            if (_current.HouseholdId is not int householdId || _current.Role is not eHouseholdRole role)
                return ServiceResult<HouseholdDto>.NotFound("가계부가 없습니다");
            return ServiceResult<HouseholdDto>.Success(await BuildHouseholdAsync(householdId, role));
        }

        public async Task<ServiceResult<HouseholdDto>> RenameHouseholdAsync(UpdateHouseholdRequest req)
        {
            if (_current.Role != eHouseholdRole.Owner)
                return ServiceResult<HouseholdDto>.Forbidden("방장만 이름을 바꿀 수 있어요");
            var name = req.Name?.Trim() ?? "";
            if (name.Length is < 1 or > 30)
                return ServiceResult<HouseholdDto>.ValidationError("이름은 1~30자");

            var household = await _db.Households.SingleAsync(h => h.Id == _current.HouseholdId);
            household.Name = name;
            await _db.SaveChangesAsync();
            await _notifier.ChangedAsync(household.Id, HouseholdNotifier.Household);
            return ServiceResult<HouseholdDto>.Success(await BuildHouseholdAsync(household.Id, eHouseholdRole.Owner));
        }

        // 나가기: 혼자면 못 나감. 방장이 나가면 가장 먼저 들어온 멤버가 방장. 나간 사람은 새 개인 가계부를 받는다
        public async Task<ServiceResult<MeDto>> LeaveAsync()
        {
            var userId = _current.UserId!.Value;
            var householdId = _current.HouseholdId!.Value;
            if (await _db.HouseholdMembers.CountAsync(m => m.HouseholdId == householdId) <= 1)
                return ServiceResult<MeDto>.ValidationError("혼자 쓰는 가계부는 나갈 수 없어요");

            await using var tx = await _db.Database.BeginTransactionAsync();
            await RemoveMembershipAsync(householdId, userId);
            await CreatePersonalHouseholdAsync(await _db.Users.SingleAsync(u => u.Id == userId));
            await tx.CommitAsync();
            await _notifier.ChangedAsync(householdId, HouseholdNotifier.Household);
            return ServiceResult<MeDto>.Success(await BuildMeAsync(userId));
        }

        // 내보내기 (방장만). 내보낸 사람은 새 개인 가계부를 받고, 그 사람이 쓴 내역은 이 가계부에 남는다
        public async Task<ServiceResult<bool>> RemoveMemberAsync(int targetUserId)
        {
            if (_current.Role != eHouseholdRole.Owner)
                return ServiceResult<bool>.Forbidden("방장만 내보낼 수 있어요");
            if (targetUserId == _current.UserId)
                return ServiceResult<bool>.ValidationError("자기 자신은 내보낼 수 없어요. 나가기를 쓰세요");

            var householdId = _current.HouseholdId!.Value;
            if (!await _db.HouseholdMembers.AnyAsync(m => m.HouseholdId == householdId && m.UserId == targetUserId))
                return ServiceResult<bool>.NotFound("이 가계부의 멤버가 아닙니다");

            await using var tx = await _db.Database.BeginTransactionAsync();
            await RemoveMembershipAsync(householdId, targetUserId);
            await CreatePersonalHouseholdAsync(await _db.Users.SingleAsync(u => u.Id == targetUserId));
            await tx.CommitAsync();
            // 내보낸 사람의 앱도 이 신호를 받고 내 정보를 다시 읽으면 새 가계부로 바뀐다 (연결은 재접속 때 새 그룹으로)
            await _notifier.ChangedAsync(householdId, HouseholdNotifier.Household);
            return ServiceResult<bool>.Success(true);
        }

        // 멤버십 제거 + 방장 승계. 아무도 안 남으면 안 쓴 초대를 지운다 (방장 없는 가계부에 누가 들어오지 않게)
        private async Task RemoveMembershipAsync(int householdId, int userId)
        {
            var membership = await _db.HouseholdMembers.SingleAsync(m => m.HouseholdId == householdId && m.UserId == userId);
            _db.HouseholdMembers.Remove(membership);
            await _db.SaveChangesAsync();

            var remaining = await _db.HouseholdMembers
                .Where(m => m.HouseholdId == householdId)
                .OrderBy(m => m.JoinedAt).ThenBy(m => m.UserId)
                .ToListAsync();
            if (remaining.Count == 0)
            {
                await _db.Invites.Where(i => i.HouseholdId == householdId && i.UsedAt == null).ExecuteDeleteAsync();
                return;
            }
            if (membership.Role == eHouseholdRole.Owner && remaining.All(m => m.Role != eHouseholdRole.Owner))
            {
                remaining[0].Role = eHouseholdRole.Owner;
                await _db.SaveChangesAsync();
            }
        }

        // ── 초대 ────────────────────────────────────────────────

        public async Task<ServiceResult<InviteDto>> CreateInviteAsync()
        {
            if (_current.Role != eHouseholdRole.Owner)
                return ServiceResult<InviteDto>.Forbidden("방장만 초대할 수 있어요");
            var householdId = _current.HouseholdId!.Value;

            await using var tx = await _db.Database.BeginTransactionAsync();
            // 같은 가계부에서 동시에 생성해도 마지막 코드 하나만 유효하도록 직렬화한다.
            // FK 검사에 필요한 KEY SHARE와 충돌하지 않는 잠금을 사용한다.
            await _db.Database.ExecuteSqlInterpolatedAsync(
                $"SELECT 1 FROM \"Households\" WHERE \"Id\" = {householdId} FOR NO KEY UPDATE");
            if (await _db.HouseholdMembers.CountAsync(m => m.HouseholdId == householdId) >= MaxMembers)
                return ServiceResult<InviteDto>.Conflict($"최대 {MaxMembers}명까지 함께 쓸 수 있어요");

            var now = DateTime.UtcNow;
            // 기록은 유지하되, 새 코드 발급 시 이전 미사용 코드는 모두 만료시킨다.
            await _db.Invites
                .Where(i => i.HouseholdId == householdId && i.UsedAt == null && i.ExpiresAt > now)
                .ExecuteUpdateAsync(s => s.SetProperty(i => i.ExpiresAt, now));
            var invite = new Invite
            {
                Code = RandomNumberGenerator.GetString(CodeAlphabet, CodeLength),
                HouseholdId = householdId,
                InviterUserId = _current.UserId!.Value,
                CreatedAt = now,
                ExpiresAt = now + InviteLifetime,
            };
            _db.Invites.Add(invite);
            await _db.SaveChangesAsync();
            await tx.CommitAsync();
            return ServiceResult<InviteDto>.Success(new InviteDto { Code = invite.Code, ExpiresAt = ToOffset(invite.ExpiresAt) });
        }

        public async Task<ServiceResult<InvitePreviewDto>> PreviewInviteAsync(string code)
        {
            var (invite, error) = await FindUsableInviteAsync(code);
            if (invite == null) return Fail<InvitePreviewDto>(error!);

            var household = await _db.Households.SingleAsync(h => h.Id == invite.HouseholdId);
            var inviter = await _db.Users.SingleAsync(u => u.Id == invite.InviterUserId);
            return ServiceResult<InvitePreviewDto>.Success(new InvitePreviewDto
            {
                HouseholdName = household.Name,
                InviterNickname = inviter.Nickname,
                MemberCount = await _db.HouseholdMembers.CountAsync(m => m.HouseholdId == invite.HouseholdId),
                ExpiresAt = ToOffset(invite.ExpiresAt),
            });
        }

        // 수락: 지금 가계부에서 나와 초대한 가계부로. 혼자 쓰던 가계부면 내역을 가져올 수 있다
        public async Task<ServiceResult<MeDto>> AcceptInviteAsync(string code, AcceptInviteRequest req)
        {
            var userId = _current.UserId!.Value;
            var (invite, error) = await FindUsableInviteAsync(code);
            if (invite == null) return Fail<MeDto>(error!);

            var oldHouseholdId = _current.HouseholdId;
            if (oldHouseholdId == invite.HouseholdId)
                return ServiceResult<MeDto>.Conflict("이미 이 가계부의 멤버예요");
            if (await _db.HouseholdMembers.CountAsync(m => m.HouseholdId == invite.HouseholdId) >= MaxMembers)
                return ServiceResult<MeDto>.Conflict($"최대 {MaxMembers}명까지 함께 쓸 수 있어요");

            var aloneInOld = oldHouseholdId is int oldId
                && await _db.HouseholdMembers.CountAsync(m => m.HouseholdId == oldId) == 1;
            if (req.MergeMyTransactions && !aloneInOld)
                return ServiceResult<MeDto>.ValidationError("다른 멤버와 같이 쓰던 가계부의 내역은 옮길 수 없어요");

            await using var tx = await _db.Database.BeginTransactionAsync();

            // 1회용: 아직 안 쓴 경우에만 사용 처리 (동시에 두 명이 눌러도 한 명만 성공)
            var now = DateTime.UtcNow;
            var claimed = await _db.Invites
                .Where(i => i.Id == invite.Id && i.UsedAt == null && i.ExpiresAt > now)
                .ExecuteUpdateAsync(s => s.SetProperty(i => i.UsedAt, now).SetProperty(i => i.UsedByUserId, userId));
            if (claimed == 0)
                return ServiceResult<MeDto>.Gone("만료되었거나 이미 사용된 초대 코드예요");

            if (oldHouseholdId is int from)
            {
                if (req.MergeMyTransactions)
                {
                    await _db.Transactions.IgnoreQueryFilters()
                        .Where(t => t.HouseholdId == from)
                        .ExecuteUpdateAsync(s => s.SetProperty(t => t.HouseholdId, invite.HouseholdId));
                }
                await RemoveMembershipAsync(from, userId);
            }

            _db.HouseholdMembers.Add(new HouseholdMember
            {
                HouseholdId = invite.HouseholdId, UserId = userId, Role = eHouseholdRole.Member, JoinedAt = now,
            });
            await _db.SaveChangesAsync();
            await tx.CommitAsync();

            await _notifier.ChangedAsync(invite.HouseholdId, HouseholdNotifier.Household);
            if (req.MergeMyTransactions)
                await _notifier.ChangedAsync(invite.HouseholdId, HouseholdNotifier.Transactions);
            if (oldHouseholdId is int previous)
                await _notifier.ChangedAsync(previous, HouseholdNotifier.Household);
            return ServiceResult<MeDto>.Success(await BuildMeAsync(userId));
        }

        private async Task<(Invite? Invite, ServiceResult<bool>? Error)> FindUsableInviteAsync(string code)
        {
            var normalized = new string((code ?? "").Where(char.IsLetterOrDigit).ToArray()).ToUpperInvariant();
            var invite = await _db.Invites.SingleOrDefaultAsync(i => i.Code == normalized);
            if (invite == null)
                return (null, ServiceResult<bool>.NotFound("초대 코드를 찾을 수 없어요"));
            if (invite.UsedAt != null)
                return (null, ServiceResult<bool>.Gone("이미 사용된 초대 코드예요"));
            if (invite.ExpiresAt <= DateTime.UtcNow)
                return (null, ServiceResult<bool>.Gone("만료된 초대 코드예요"));
            return (invite, null);
        }

        // ── 공통 ────────────────────────────────────────────────

        private async Task<MeDto> BuildMeAsync(int userId)
        {
            var user = await _db.Users.SingleAsync(u => u.Id == userId);
            var membership = await _db.HouseholdMembers
                .Where(m => m.UserId == userId)
                .OrderBy(m => m.JoinedAt)
                .FirstAsync();
            return new MeDto
            {
                User = new UserDto { Id = user.Id, Nickname = user.Nickname, Avatar = user.Avatar },
                Household = await BuildHouseholdAsync(membership.HouseholdId, membership.Role),
            };
        }

        private async Task<HouseholdDto> BuildHouseholdAsync(int householdId, eHouseholdRole myRole)
        {
            var household = await _db.Households.SingleAsync(h => h.Id == householdId);
            var members = await (
                from m in _db.HouseholdMembers
                join u in _db.Users on m.UserId equals u.Id
                where m.HouseholdId == householdId
                orderby m.JoinedAt, m.UserId
                select new { m.UserId, u.Nickname, u.Avatar, m.Role, m.JoinedAt }
            ).ToListAsync();

            return new HouseholdDto
            {
                Id = household.Id,
                Name = household.Name,
                MyRole = myRole,
                MaxMembers = MaxMembers,
                Members = members.Select(m => new MemberDto
                {
                    UserId = m.UserId, Nickname = m.Nickname, Avatar = m.Avatar, Role = m.Role, JoinedAt = ToOffset(m.JoinedAt),
                }).ToList(),
            };
        }

        private static ServiceResult<T> Fail<T>(ServiceResult<bool> error) =>
            ServiceResult<T>.Failure(error.ErrorMessage!, error.ErrorType);

        private static DateTimeOffset ToOffset(DateTime utc) => new(utc, TimeSpan.Zero);

        private static string? CleanNickname(string? value)
        {
            var s = value?.Trim() ?? "";
            return s.Length is >= 1 and <= 20 ? s : null;
        }

        private static string? CleanAvatar(string? value)
        {
            var s = value?.Trim() ?? "";
            return s.Length is >= 1 and <= 16 ? s : null;
        }
    }
}
