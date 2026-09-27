using System.Security.Cryptography;
using System.Text;
using Gagebu_Server.Auth;
using Gagebu_Server.DTO;
using Gagebu_Server.Servecies;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using Microsoft.Extensions.Options;

namespace Gagebu_Server.Controllers
{
    // 앱: 영수증 분석 요청·조회·확정·버리기
    [Route("api/receipts")]
    [RequireHousehold]
    public class ReceiptsController : ApiControllerBase
    {
        private readonly ReceiptService _service;

        public ReceiptsController(ReceiptService service) => _service = service;

        // 새 작업이면 202(분석 대기), 같은 clientRequestId를 다시 보내면 200(기존 작업)
        [HttpPost]
        public async Task<IActionResult> Create(CreateReceiptRequest req)
        {
            var result = await _service.CreateAsync(req);
            if (!result.IsSuccess) return ErrorResponse(result);
            var (receipt, created) = result.Data;
            return created ? StatusCode(StatusCodes.Status202Accepted, receipt) : Ok(receipt);
        }

        [HttpGet]
        public async Task<IActionResult> ListOpen() => OkOrError(await _service.ListOpenAsync());

        [HttpGet("{id:int}")]
        public async Task<IActionResult> Get(int id) => OkOrError(await _service.GetAsync(id));

        [HttpPost("{id:int}/confirm")]
        public async Task<IActionResult> Confirm(int id, ConfirmReceiptRequest req) => OkOrError(await _service.ConfirmAsync(id, req));

        [HttpDelete("{id:int}")]
        public async Task<IActionResult> Discard(int id)
        {
            var result = await _service.DiscardAsync(id);
            return result.IsSuccess ? NoContent() : ErrorResponse(result);
        }
    }

    // 설정 섹션 "Worker" (환경변수 Worker__Key). 비우면 워커 API는 404
    public class WorkerSettings
    {
        public const string Section = "Worker";
        public string? Key { get; set; }
    }

    // 워커 전용: X-Worker-Key 헤더가 설정 값과 같아야 한다. 운영에서는 Caddy가 /internal을 밖에서 막는다
    public class RequireWorkerKeyAttribute : Attribute, IAsyncActionFilter
    {
        public const string Header = "X-Worker-Key";

        public Task OnActionExecutionAsync(ActionExecutingContext context, ActionExecutionDelegate next)
        {
            var key = context.HttpContext.RequestServices.GetRequiredService<IOptions<WorkerSettings>>().Value.Key;
            if (string.IsNullOrEmpty(key) || key.Length < 16)
            {
                context.Result = new NotFoundResult();
                return Task.CompletedTask;
            }
            var sent = context.HttpContext.Request.Headers[Header].ToString();
            if (!CryptographicOperations.FixedTimeEquals(Encoding.UTF8.GetBytes(sent), Encoding.UTF8.GetBytes(key)))
            {
                context.Result = new UnauthorizedResult();
                return Task.CompletedTask;
            }
            return next();
        }
    }

    [Route("internal/receipts")]
    [RequireWorkerKey]
    [ApiExplorerSettings(IgnoreApi = true)]
    public class ReceiptWorkerController : ApiControllerBase
    {
        private readonly ReceiptService _service;

        public ReceiptWorkerController(ReceiptService service) => _service = service;

        // 다음 작업 가져가기. 없으면 204
        [HttpPost("claim")]
        public async Task<IActionResult> Claim()
        {
            var work = await _service.ClaimAsync();
            return work == null ? NoContent() : Ok(work);
        }

        [HttpPost("{id:int}/result")]
        public async Task<IActionResult> Result(int id, ReceiptResultRequest req)
        {
            var result = await _service.CompleteAsync(id, req);
            return result.IsSuccess ? NoContent() : ErrorResponse(result);
        }

        [HttpPost("{id:int}/fail")]
        public async Task<IActionResult> Fail(int id, ReceiptFailRequest req)
        {
            var result = await _service.FailAsync(id, req);
            return result.IsSuccess ? NoContent() : ErrorResponse(result);
        }
    }
}
