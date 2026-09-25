using Gagebu_Server.DTO;
using Gagebu_Server.Servecies;
using GagebuShared;
using Microsoft.AspNetCore.Mvc;

namespace Gagebu_Server.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class TransactionsController : ControllerBase
    {
        private readonly ILogger<TransactionsController> _logger;
        private readonly ITransactionService _transactionService;

        public TransactionsController(ITransactionService transactionService, ILogger<TransactionsController> logger)
        {
            _transactionService = transactionService;
            _logger = logger;
        }

        [HttpGet]
        public async Task<IActionResult> GetTransactions()
        {
            var result = await _transactionService.GetAllTransactions();

            if (!result.IsSuccess)
                return ErrorResponse(result);

            return Ok(result.Data);
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetTransaction(int id)
        {
            var result = await _transactionService.GetTransaction(id);

            if (!result.IsSuccess)
                return ErrorResponse(result);

            return Ok(result.Data);
        }

        [HttpPost]
        public async Task<IActionResult> CreateTransaction(TransactionDto dto)
        {
            var result = await _transactionService.CreateTransaction(dto);

            if (!result.IsSuccess)
                return ErrorResponse(result);

            return CreatedAtAction(nameof(GetTransaction),
                new { id = result.Data!.Id }, result.Data);
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteTransaction(int id)
        {
            var result = await _transactionService.DeleteTransaction(id);

            if (!result.IsSuccess)
                return ErrorResponse(result);

            return NoContent();
        }

        [HttpPut]
        public async Task<IActionResult> UpdateTransaction(TransactionDto dto)
        {
            var result = await _transactionService.UpdateTransaction(dto);

            if (!result.IsSuccess)
                return ErrorResponse(result);

            // 수정만 했으므로 204 No Content
            return NoContent();
        }

        // 기간 요약: [from, to) 구간(ISO 8601, 오프셋 포함). 둘 다 없으면 전체
        [HttpGet("summary")]
        public async Task<IActionResult> GetTransactionsSummary(
            [FromQuery] DateTimeOffset? from = null,
            [FromQuery] DateTimeOffset? to = null,
            [FromQuery] ePayType? payType = null)
        {
            var result = await _transactionService.GetTransactionSummaryAsync(from, to, payType);

            if (!result.IsSuccess)
                return ErrorResponse(result);

            return Ok(result.Data);
        }

        // 서비스 실패 → HTTP 응답. 분기는 ErrorType으로만 한다 (메시지 문자열 비교 금지)
        private IActionResult ErrorResponse<T>(ServiceResult<T> result)
        {
            _logger.LogWarning("Request failed ({ErrorType}): {ErrorMessage}", result.ErrorType, result.ErrorMessage);

            return result.ErrorType switch
            {
                eErrorType.Validation => BadRequest(result.ErrorMessage),
                eErrorType.NotFound => NotFound(result.ErrorMessage),
                eErrorType.Conflict => Conflict(result.ErrorMessage),
                _ => StatusCode(StatusCodes.Status500InternalServerError, result.ErrorMessage)
            };
        }
    }
}
