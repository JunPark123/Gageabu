using Gagebu_Server.Auth;
using Gagebu_Server.Data;
using Gagebu_Server.DTO;
using GagebuShared;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace Gagebu_Server.Servecies
{
    // 기기별 로그인 (docs/PLAN.md 3단계 토큰 갱신 B안)
    //  - 로그인 = 세션(기기) 하나 + 접근 토큰(짧게) + 갱신 토큰(쓸 때마다 교체)
    //  - 이미 교체된 갱신 토큰이 다시 오면 도난 의심 → 그 기기 로그아웃. 단 교체 직후 1분은 재전송으로 보고 봐준다
    public class SessionService
    {
        public static readonly TimeSpan ReuseGrace = TimeSpan.FromMinutes(1);

        private readonly AppDbContext _db;
        private readonly CurrentUser _current;
        private readonly TokenService _tokens;
        private readonly AuthSettings _settings;
        private readonly ILogger<SessionService> _logger;

        public SessionService(AppDbContext db, CurrentUser current, TokenService tokens, IOptions<AuthSettings> settings,
            ILogger<SessionService> logger)
        {
            _db = db;
            _current = current;
            _tokens = tokens;
            _settings = settings.Value;
            _logger = logger;
        }

        private TimeSpan RefreshLifetime => TimeSpan.FromDays(_settings.RefreshTokenDays);

        // 로그인 성공 → 새 기기 세션
        public async Task<TokenResponse> StartAsync(int userId, string? deviceName)
        {
            var now = DateTime.UtcNow;
            var (refresh, hash) = TokenService.NewRefreshToken();
            var session = new UserSession
            {
                UserId = userId,
                DeviceName = CleanDeviceName(deviceName),
                RefreshTokenHash = hash,
                CreatedAt = now,
                LastUsedAt = now,
                ExpiresAt = now + RefreshLifetime,
            };
            _db.UserSessions.Add(session);
            await _db.SaveChangesAsync();
            return Tokens(session, refresh);
        }

        public async Task<ServiceResult<TokenResponse>> RefreshAsync(RefreshRequest req)
        {
            if (string.IsNullOrWhiteSpace(req.RefreshToken))
                return ServiceResult<TokenResponse>.ValidationError("refreshToken이 필요해요");

            var now = DateTime.UtcNow;
            var hash = TokenService.Hash(req.RefreshToken);
            var session = await _db.UserSessions.SingleOrDefaultAsync(s => s.RefreshTokenHash == hash || s.PreviousTokenHash == hash);
            if (session == null || session.RevokedAt != null || session.ExpiresAt <= now)
                return ServiceResult<TokenResponse>.Unauthorized("다시 로그인해 주세요");

            if (session.RefreshTokenHash != hash)
            {
                // 바로 전 토큰: 교체 직후(응답을 못 받아 재전송)면 한 번 더 교체해 주고, 아니면 도난 의심
                if (session.RotatedAt is not DateTime rotated || now - rotated > ReuseGrace)
                {
                    session.RevokedAt = now;
                    await _db.SaveChangesAsync();
                    _logger.LogWarning("Refresh token reuse detected, session {SessionId} revoked", session.Id);
                    return ServiceResult<TokenResponse>.Unauthorized("다시 로그인해 주세요");
                }
            }

            // 교체: 같은 토큰으로 동시에 두 번 와도 DB에서 먼저 바꾼 쪽만 성공
            var expected = session.RefreshTokenHash;
            var (refresh, newHash) = TokenService.NewRefreshToken();
            var changed = await _db.UserSessions
                .Where(s => s.Id == session.Id && s.RefreshTokenHash == expected && s.RevokedAt == null)
                .ExecuteUpdateAsync(s => s
                    .SetProperty(x => x.PreviousTokenHash, expected)
                    .SetProperty(x => x.RefreshTokenHash, newHash)
                    .SetProperty(x => x.RotatedAt, now)
                    .SetProperty(x => x.LastUsedAt, now)
                    .SetProperty(x => x.ExpiresAt, now + RefreshLifetime));
            if (changed == 0)
                return ServiceResult<TokenResponse>.Unauthorized("다시 로그인해 주세요");

            session.RefreshTokenHash = newHash;
            return ServiceResult<TokenResponse>.Success(Tokens(session, refresh));
        }

        public async Task<ServiceResult<List<SessionDto>>> ListAsync()
        {
            var now = DateTime.UtcNow;
            var sessions = await _db.UserSessions
                .Where(s => s.UserId == _current.UserId && s.RevokedAt == null && s.ExpiresAt > now)
                .OrderByDescending(s => s.LastUsedAt)
                .ToListAsync();
            return ServiceResult<List<SessionDto>>.Success(sessions.Select(s => new SessionDto
            {
                Id = s.Id,
                DeviceName = s.DeviceName,
                CreatedAt = new DateTimeOffset(s.CreatedAt, TimeSpan.Zero),
                LastUsedAt = new DateTimeOffset(s.LastUsedAt, TimeSpan.Zero),
                Current = s.Id == _current.SessionId,
            }).ToList());
        }

        // 내 기기 하나 로그아웃 (분실한 폰 등). 다른 사람 세션은 없는 것과 같게 404
        public async Task<ServiceResult<bool>> RevokeAsync(int sessionId)
        {
            var revoked = await _db.UserSessions
                .Where(s => s.Id == sessionId && s.UserId == _current.UserId && s.RevokedAt == null)
                .ExecuteUpdateAsync(s => s.SetProperty(x => x.RevokedAt, DateTime.UtcNow));
            return revoked == 0
                ? ServiceResult<bool>.NotFound("로그인된 기기를 찾을 수 없어요")
                : ServiceResult<bool>.Success(true);
        }

        public Task<ServiceResult<bool>> LogoutAsync() => RevokeAsync(_current.SessionId!.Value);

        private TokenResponse Tokens(UserSession session, string refresh)
        {
            var (token, expiresAt) = _tokens.IssueAccessToken(session.UserId, session.Id);
            return new TokenResponse { Token = token, ExpiresAt = expiresAt, RefreshToken = refresh, SessionId = session.Id };
        }

        private static string CleanDeviceName(string? name)
        {
            var s = name?.Trim() ?? "";
            if (s.Length == 0) return "알 수 없는 기기";
            return s.Length > 50 ? s[..50] : s;
        }
    }
}
