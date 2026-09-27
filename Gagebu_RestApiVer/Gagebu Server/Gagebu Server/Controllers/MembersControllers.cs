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

        // 개발용 로그인. 운영(Production)에서는 설정과 상관없이 404
        [HttpPost("dev-login")]
        public async Task<IActionResult> DevLogin(DevLoginRequest req)
        {
            if (!_env.IsDevelopment() || !_settings.DevLoginEnabled)
                return NotFound();
            return OkOrError(await _service.DevLoginAsync(req));
        }
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
