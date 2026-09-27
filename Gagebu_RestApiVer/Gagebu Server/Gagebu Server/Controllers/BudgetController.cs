using Gagebu_Server.Auth;
using Gagebu_Server.DTO;
using Gagebu_Server.Servecies;
using Microsoft.AspNetCore.Mvc;

namespace Gagebu_Server.Controllers
{
    // 지금 가계부의 예산 (로그인 전 개발 모드에서는 기본 가계부)
    [Route("api/budget")]
    [RequireHousehold]
    public class BudgetController : ApiControllerBase
    {
        private readonly BudgetService _service;

        public BudgetController(BudgetService service) => _service = service;

        [HttpGet]
        public async Task<IActionResult> Get() => OkOrError(await _service.GetAsync());

        [HttpPut("default")]
        public async Task<IActionResult> SetDefault(SetDefaultBudgetRequest req) => OkOrError(await _service.SetDefaultAsync(req));

        // month: YYYY-MM
        [HttpGet("months/{month}")]
        public async Task<IActionResult> GetMonth(string month) => OkOrError(await _service.GetMonthAsync(month));

        [HttpPut("months/{month}")]
        public async Task<IActionResult> SetMonth(string month, SetMonthBudgetRequest req) => OkOrError(await _service.SetMonthAsync(month, req));

        [HttpDelete("months/{month}")]
        public async Task<IActionResult> ClearMonth(string month) => OkOrError(await _service.ClearMonthAsync(month));
    }
}
