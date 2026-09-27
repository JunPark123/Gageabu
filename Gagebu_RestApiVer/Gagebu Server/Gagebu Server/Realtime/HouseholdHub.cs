using System.IdentityModel.Tokens.Jwt;
using Gagebu_Server.Auth;
using Gagebu_Server.Data;
using GagebuShared;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace Gagebu_Server.Realtime
{
    // 실시간 반영: 앱은 연결만 해 두고, 서버가 보내는 "changed" 신호를 받으면 해당 조회만 다시 가져온다.
    // 신호에는 데이터가 없다 (보는 권한은 매번 API가 확인)
    // 연결: /hubs/household (웹소켓은 ?access_token=, 그 외는 Authorization 헤더)
    public class HouseholdHub : Hub
    {
        public const string Path = "/hubs/household";
        public const string ChangedEvent = "changed";
        public const string Policy = "household-hub";

        private readonly AppDbContext _db;
        private readonly IOptions<AuthSettings> _settings;
        private readonly IWebHostEnvironment _env;

        public HouseholdHub(AppDbContext db, IOptions<AuthSettings> settings, IWebHostEnvironment env)
        {
            _db = db;
            _settings = settings;
            _env = env;
        }

        public static string GroupName(int householdId) => $"household:{householdId}";

        public override async Task OnConnectedAsync()
        {
            var householdId = await ResolveHouseholdAsync();
            if (householdId is null)
            {
                Context.Abort();
                return;
            }
            await Groups.AddToGroupAsync(Context.ConnectionId, GroupName(householdId.Value));
            await base.OnConnectedAsync();
        }

        // 연결 확인용. 서버는 OnConnectedAsync(그룹 가입)가 끝난 뒤에 호출을 처리하므로,
        // 응답이 오면 그때부터 신호를 놓치지 않는다 (연결 직후 바뀐 내용은 앱이 연결 뒤 한 번 다시 조회해서 맞춘다)
        public string Ping() => "pong";

        // CurrentUserMiddleware와 같은 규칙: 로그인 사용자는 소속 가계부, 개발 모드에서 토큰이 아예 없으면 기본 가계부
        private async Task<int?> ResolveHouseholdAsync()
        {
            var sub = Context.User?.FindFirst(JwtRegisteredClaimNames.Sub)?.Value;
            if (Context.User?.Identity?.IsAuthenticated == true && int.TryParse(sub, out var userId))
            {
                return await _db.HouseholdMembers
                    .Where(m => m.UserId == userId)
                    .OrderBy(m => m.JoinedAt)
                    .Select(m => (int?)m.HouseholdId)
                    .FirstOrDefaultAsync();
            }

            var request = Context.GetHttpContext()?.Request;
            var sentToken = request != null
                && (request.Headers.ContainsKey("Authorization") || request.Query.ContainsKey("access_token"));
            if (_env.IsDevelopment() && _settings.Value.AllowAnonymous && !sentToken)
                return Household.DefaultId;
            return null;
        }
    }

    // 바뀐 종류: transactions(내역), budget(예산), household(멤버·이름·프로필)
    public record ChangedMessage(string Kind);

    public interface IHouseholdNotifier
    {
        Task ChangedAsync(int householdId, string kind);
    }

    public class HouseholdNotifier : IHouseholdNotifier
    {
        public const string Transactions = "transactions";
        public const string Budget = "budget";
        public const string Household = "household";

        private readonly IHubContext<HouseholdHub> _hub;
        private readonly ILogger<HouseholdNotifier> _logger;

        public HouseholdNotifier(IHubContext<HouseholdHub> hub, ILogger<HouseholdNotifier> logger)
        {
            _hub = hub;
            _logger = logger;
        }

        // 알림 실패가 저장 요청을 실패시키지 않게 삼킨다 (앱은 화면 복귀·당겨서 새로고침으로도 갱신됨)
        public async Task ChangedAsync(int householdId, string kind)
        {
            try
            {
                await _hub.Clients.Group(HouseholdHub.GroupName(householdId)).SendAsync(HouseholdHub.ChangedEvent, new ChangedMessage(kind));
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to notify household {HouseholdId} ({Kind})", householdId, kind);
            }
        }
    }
}
