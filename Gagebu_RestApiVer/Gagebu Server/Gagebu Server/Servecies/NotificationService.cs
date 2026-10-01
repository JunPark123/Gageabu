using System.Text.RegularExpressions;
using Gagebu_Server.Auth;
using Gagebu_Server.Data;
using Gagebu_Server.DTO;
using GagebuShared;
using Microsoft.EntityFrameworkCore;

namespace Gagebu_Server.Servecies
{
    // 푸시 토큰 등록·해제, 알림 설정
    public partial class NotificationService
    {
        private readonly AppDbContext _db;
        private readonly CurrentUser _current;

        public NotificationService(AppDbContext db, CurrentUser current)
        {
            _db = db;
            _current = current;
        }

        [GeneratedRegex(@"^Expo(nent)?PushToken\[[A-Za-z0-9_\-]{10,180}\]$")]
        private static partial Regex ExpoTokenPattern();

        // 같은 토큰이 이미 있으면(같은 폰에서 다시 로그인·다른 사람으로 로그인) 지금 사용자·기기로 옮긴다
        public async Task<ServiceResult<bool>> RegisterAsync(RegisterPushTokenRequest req)
        {
            var token = req.Token?.Trim() ?? "";
            if (!ExpoTokenPattern().IsMatch(token))
                return ServiceResult<bool>.ValidationError("푸시 토큰 형식이 아니에요");
            var platform = req.Platform is "android" or "ios" ? req.Platform : "unknown";
            var now = DateTime.UtcNow;

            var existing = await _db.PushTokens.SingleOrDefaultAsync(p => p.Token == token);
            if (existing == null)
            {
                _db.PushTokens.Add(new PushToken
                {
                    UserId = _current.UserId!.Value,
                    SessionId = _current.SessionId,
                    Token = token,
                    Platform = platform,
                    CreatedAt = now,
                    UpdatedAt = now,
                });
            }
            else
            {
                existing.UserId = _current.UserId!.Value;
                existing.SessionId = _current.SessionId;
                existing.Platform = platform;
                existing.UpdatedAt = now;
            }
            try
            {
                await _db.SaveChangesAsync();
            }
            catch (DbUpdateException)
            {
                // 같은 토큰을 동시에 두 번 등록 → 이미 들어간 것으로 충분
            }
            return ServiceResult<bool>.Success(true);
        }

        public async Task<ServiceResult<bool>> UnregisterAsync(UnregisterPushTokenRequest req)
        {
            await _db.PushTokens.Where(p => p.Token == req.Token && p.UserId == _current.UserId).ExecuteDeleteAsync();
            return ServiceResult<bool>.Success(true);
        }

        public async Task<ServiceResult<NotificationSettingsDto>> GetSettingsAsync()
        {
            var u = await _db.Users.AsNoTracking().SingleAsync(x => x.Id == _current.UserId);
            return ServiceResult<NotificationSettingsDto>.Success(new NotificationSettingsDto { PartnerRecords = u.NotifyPartnerRecords, Budget = u.NotifyBudget });
        }

        public async Task<ServiceResult<NotificationSettingsDto>> UpdateSettingsAsync(NotificationSettingsDto req)
        {
            var u = await _db.Users.SingleAsync(x => x.Id == _current.UserId);
            u.NotifyPartnerRecords = req.PartnerRecords;
            u.NotifyBudget = req.Budget;
            await _db.SaveChangesAsync();
            return ServiceResult<NotificationSettingsDto>.Success(req);
        }
    }
}
