using System.IdentityModel.Tokens.Jwt;
using Gagebu_Server.Data;
using GagebuShared;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace Gagebu_Server.Auth
{
    // 인증 뒤, 요청의 사용자와 소속 가계부를 CurrentUser에 채운다.
    // 가계부 소속은 토큰이 아니라 DB에서 매번 읽는다 → 내보내기·나가기가 바로 반영됨
    public class CurrentUserMiddleware
    {
        private readonly RequestDelegate _next;

        public CurrentUserMiddleware(RequestDelegate next) => _next = next;

        public async Task InvokeAsync(HttpContext context, CurrentUser current, AppDbContext db,
            IOptions<AuthSettings> settings, IWebHostEnvironment env)
        {
            var sub = context.User.FindFirst(JwtRegisteredClaimNames.Sub)?.Value;
            if (context.User.Identity?.IsAuthenticated == true && int.TryParse(sub, out var userId))
            {
                if (await db.Users.AnyAsync(u => u.Id == userId))
                {
                    var membership = await db.HouseholdMembers
                        .Where(m => m.UserId == userId)
                        .OrderBy(m => m.JoinedAt)
                        .FirstOrDefaultAsync();
                    current.Set(userId, membership?.HouseholdId, membership?.Role);
                }
            }
            // 로그인 없는 지금 앱용 (개발 환경 + 설정 켬 + 토큰을 아예 안 보냈을 때만).
            // 토큰을 보냈는데 틀렸거나 만료됐으면 기본 가계부로 새지 않고 401
            else if (env.IsDevelopment() && settings.Value.AllowAnonymous
                     && !context.Request.Headers.ContainsKey("Authorization")
                     && !context.Request.Query.ContainsKey("access_token")) // SignalR 웹소켓은 토큰을 쿼리로
            {
                current.Set(null, Household.DefaultId, null);
            }

            await _next(context);
        }
    }
}
