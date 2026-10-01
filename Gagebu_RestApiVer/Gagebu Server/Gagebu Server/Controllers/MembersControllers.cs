using Gagebu_Server.Auth;
using Gagebu_Server.DTO;
using Gagebu_Server.Servecies;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.Extensions.Options;

namespace Gagebu_Server.Controllers
{
    [Route("api/auth")]
    public class AuthController : ApiControllerBase
    {
        private readonly HouseholdService _service;
        private readonly AuthSettings _settings;
        private readonly IWebHostEnvironment _env;

        public AuthController(HouseholdService service, IOptions<AuthSettings> settings, IWebHostEnvironment env)
        {
            _service = service;
            _settings = settings.Value;
            _env = env;
        }

        public const string TestLoginPolicy = "test-login";

        // 개발용 로그인. 개발 환경(설정 켬)이거나, 운영 테스트 코드가 설정돼 있고 요청 코드가 맞을 때만. 그 밖에는 404
        // (코드 추측 방지: IP마다 10분에 10번)
        [HttpPost("dev-login")]
        [EnableRateLimiting(TestLoginPolicy)]
        public async Task<IActionResult> DevLogin(DevLoginRequest req)
        {
            var devAllowed = _env.IsDevelopment() && _settings.DevLoginEnabled;
            if (!devAllowed && !(_settings.TestLoginConfigured && CodeMatches(req.TestCode, _settings.TestLoginCode!)))
                return NotFound();
            return OkOrError(await _service.DevLoginAsync(req));
        }

        private static bool CodeMatches(string? given, string expected) =>
            given != null && System.Security.Cryptography.CryptographicOperations.FixedTimeEquals(
                System.Text.Encoding.UTF8.GetBytes(given.Trim()), System.Text.Encoding.UTF8.GetBytes(expected));

        // 접근 토큰이 만료되면(401) 갱신 토큰으로 새 토큰 한 벌. 받은 새 갱신 토큰으로 바꿔 저장해야 한다
        [HttpPost("refresh")]
        public async Task<IActionResult> Refresh(RefreshRequest req, [FromServices] SessionService sessions) =>
            OkOrError(await sessions.RefreshAsync(req));

        // 이 기기 로그아웃
        [HttpPost("logout")]
        [RequireUser]
        public async Task<IActionResult> Logout([FromServices] SessionService sessions)
        {
            var result = await sessions.LogoutAsync();
            return result.IsSuccess ? NoContent() : ErrorResponse(result);
        }

        // 내가 로그인한 기기 목록 (최근 사용 순)
        [HttpGet("sessions")]
        [RequireUser]
        public async Task<IActionResult> Sessions([FromServices] SessionService sessions) => OkOrError(await sessions.ListAsync());

        // 기기 하나 로그아웃 (분실한 폰 등)
        [HttpDelete("sessions/{id:int}")]
        [RequireUser]
        public async Task<IActionResult> RevokeSession(int id, [FromServices] SessionService sessions)
        {
            var result = await sessions.RevokeAsync(id);
            return result.IsSuccess ? NoContent() : ErrorResponse(result);
        }

        // 카카오 로그인: 앱의 카카오 SDK accessToken → 우리 토큰. Kakao__AppId가 없으면 503
        [HttpPost("kakao")]
        public async Task<IActionResult> Kakao(KakaoLoginRequest req, [FromServices] IKakaoApi kakao,
            [FromServices] IOptions<KakaoSettings> kakaoSettings) =>
            OkOrError(await _service.KakaoLoginAsync(req, kakao, kakaoSettings.Value.ParsedAppId));
    }

    [Route("api/me")]
    [RequireUser]
    public class MeController : ApiControllerBase
    {
        private readonly HouseholdService _service;

        public MeController(HouseholdService service) => _service = service;

        [HttpGet]
        public async Task<IActionResult> Get() => OkOrError(await _service.GetMeAsync());

        [HttpPatch]
        public async Task<IActionResult> Update(UpdateProfileRequest req) => OkOrError(await _service.UpdateProfileAsync(req));

        // 이 기기의 푸시 토큰 (앱 시작·로그인 때마다)
        [HttpPut("push-token")]
        public async Task<IActionResult> RegisterPushToken(RegisterPushTokenRequest req, [FromServices] NotificationService notifications)
        {
            var result = await notifications.RegisterAsync(req);
            return result.IsSuccess ? NoContent() : ErrorResponse(result);
        }

        [HttpDelete("push-token")]
        public async Task<IActionResult> UnregisterPushToken(UnregisterPushTokenRequest req, [FromServices] NotificationService notifications)
        {
            var result = await notifications.UnregisterAsync(req);
            return result.IsSuccess ? NoContent() : ErrorResponse(result);
        }

        [HttpGet("notifications")]
        public async Task<IActionResult> GetNotifications([FromServices] NotificationService notifications) =>
            OkOrError(await notifications.GetSettingsAsync());

        [HttpPut("notifications")]
        public async Task<IActionResult> UpdateNotifications(NotificationSettingsDto req, [FromServices] NotificationService notifications) =>
            OkOrError(await notifications.UpdateSettingsAsync(req));
    }

    // 지금 내 가계부 (1인 1가계부라 id 대신 현재 가계부)
    [Route("api/household")]
    [RequireUser]
    [RequireHousehold]
    public class HouseholdController : ApiControllerBase
    {
        private readonly HouseholdService _service;

        public HouseholdController(HouseholdService service) => _service = service;

        [HttpGet]
        public async Task<IActionResult> Get() => OkOrError(await _service.GetHouseholdAsync());

        [HttpPatch]
        public async Task<IActionResult> Rename(UpdateHouseholdRequest req) => OkOrError(await _service.RenameHouseholdAsync(req));

        // 나가기 → 새 개인 가계부가 담긴 내 정보
        [HttpDelete("members/me")]
        public async Task<IActionResult> Leave() => OkOrError(await _service.LeaveAsync());

        // 내보내기 (방장)
        [HttpDelete("members/{userId:int}")]
        public async Task<IActionResult> RemoveMember(int userId)
        {
            var result = await _service.RemoveMemberAsync(userId);
            return result.IsSuccess ? NoContent() : ErrorResponse(result);
        }
    }

    [Route("api/invites")]
    [RequireUser]
    [RequireHousehold]
    public class InvitesController : ApiControllerBase
    {
        public const string CodeAttemptPolicy = "invite-code";
        private readonly HouseholdService _service;

        public InvitesController(HouseholdService service) => _service = service;

        // 초대 코드 발급 (방장)
        [HttpPost]
        public async Task<IActionResult> Create()
        {
            var result = await _service.CreateInviteAsync();
            return result.IsSuccess ? StatusCode(StatusCodes.Status201Created, result.Data) : ErrorResponse(result);
        }

        // 미리보기: 어느 가계부인지 (코드 추측 방지를 위해 시도 횟수 제한)
        [HttpGet("{code}")]
        [EnableRateLimiting(CodeAttemptPolicy)]
        public async Task<IActionResult> Preview(string code) => OkOrError(await _service.PreviewInviteAsync(code));

        [HttpPost("{code}/accept")]
        [EnableRateLimiting(CodeAttemptPolicy)]
        public async Task<IActionResult> Accept(string code,
            [FromBody(EmptyBodyBehavior = Microsoft.AspNetCore.Mvc.ModelBinding.EmptyBodyBehavior.Allow)] AcceptInviteRequest? req) =>
            OkOrError(await _service.AcceptInviteAsync(code, req ?? new AcceptInviteRequest()));
    }
}
