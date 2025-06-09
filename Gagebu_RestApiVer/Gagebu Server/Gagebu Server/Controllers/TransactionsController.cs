using DevExpress.XtraEditors.DXErrorProvider;
using Gagebu_Server.Data;
using Gagebu_Server.DTO;
using Gagebu_Server.Servecies;
using GagebuShared;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Collections.Generic;
using System.Diagnostics;
using System.Linq;
using System.Threading.Tasks;

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
                return StatusCode(500, result.ErrorMessage);

            return Ok(result.Data);
        }

        [HttpGet("{id}")]
        public async Task<IActionResult> GetTransaction(int id)
        {
            var result = await _transactionService.GetTransaction(id);

            if (!result.IsSuccess)
            {
                // 비즈니스 로직 오류 vs 시스템 오류 구분
                return result.ErrorMessage.Contains("not found")
                    ? NotFound(result.ErrorMessage)
                    : StatusCode(500, result.ErrorMessage);
            }

            return Ok(result.Data);
        }

        [HttpPost]
        public async Task<IActionResult> CreateTransaction(TransactionDto dto)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            var result = await _transactionService.CreateTransaction(dto);

            if (!result.IsSuccess)
                return BadRequest(result.ErrorMessage);

            return CreatedAtAction(nameof(GetTransaction),
                new { id = result.Data.Id }, result.Data);
        }

        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteTransaction(int id)
        {
            var result = await _transactionService.DeleteTransaction(id);

            if (!result.IsSuccess)
            {
                return result.ErrorMessage.Contains("not found")
                    ? NotFound(result.ErrorMessage)
                    : StatusCode(500, result.ErrorMessage);
            }

            return NoContent();
        }


        [HttpPut]
        public async Task<IActionResult> UpdateTransaction(TransactionDto dto)
        {

            // 2) ModelState 검증 (Data-Annotation이 DTO에 붙어 있다면 [ApiController]가 자동 처리)
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            // 3) 서비스 호출
            var result = await _transactionService.UpdateTransaction(dto);

            // 4) 에러 분기
            if (!result.IsSuccess)
            {
                return result.ErrorType switch
                {
                    eErrorType.Validation => BadRequest(result.ErrorMessage),
                    eErrorType.NotFound => NotFound(result.ErrorMessage),
                    _ => StatusCode(500, result.ErrorMessage)
                };
            }

            // 5) 성공 시 수정만 했으므로 204 No Content 반환
            return NoContent();
        }

        // 새로 추가할 Summary 엔드포인트들
        [HttpGet("summary")]
        public async Task<IActionResult> GetTransactionsSummary(
            [FromQuery] eTransactionQueryType queryType = eTransactionQueryType.All,
            [FromQuery] DateTime? startDate = null,
            [FromQuery] DateTime? endDate = null,
            [FromQuery] DateTime? selectedDate = null,
            [FromQuery] ePayType? payType = null)
        {
            try
            {
                var result = await _transactionService.GetTransactionSummaryAsync(
                    queryType, startDate, endDate, selectedDate, payType);

                if (!result.IsSuccess)
                {
                    _logger.LogWarning("Failed to get transaction summary: {ErrorMessage}", result.ErrorMessage);

                    // ErrorType에 따른 응답 분기 (ServiceResult에 ErrorType이 있다면)
                    return result.ErrorType switch
                    {
                        eErrorType.Validation => BadRequest(result.ErrorMessage),
                        eErrorType.NotFound => NotFound(result.ErrorMessage),
                        _ => StatusCode(500, result.ErrorMessage)
                    };
                }

                return Ok(result.Data);
            }
            catch (Exception ex)
            {                
                _logger.LogError(ex, "Unexpected error occurred while getting transaction summary");
                return StatusCode(500, "An unexpected error occurred");
            }
        }


        // 편의 메서드들 (선택사항)
        [HttpGet("summary/today")]
        public async Task<IActionResult> GetTodayTransactionsSummary(
            [FromQuery] ePayType? payType = null)
        {
            return await GetTransactionsSummary(eTransactionQueryType.Today, payType: payType);
        }

        [HttpGet("summary/date/{date}")]
        public async Task<IActionResult> GetTransactionByDate(
           DateTime date,
            [FromQuery] ePayType? payType = null)
        {
            return await GetTransactionsSummary(eTransactionQueryType.SelectedDate,selectedDate:date, payType: payType);
        }

        [HttpGet("summary/income")]
        public async Task<IActionResult> GetIncomeTransactionsSummary(
            [FromQuery] DateTime? startDate = null,
            [FromQuery] DateTime? endDate = null)
        {
            var queryType = startDate.HasValue && endDate.HasValue
                ? eTransactionQueryType.DateRange
                : eTransactionQueryType.All;

            return await GetTransactionsSummary(
                queryType,
                startDate,
                endDate,
                payType: ePayType.Income);
        }

        [HttpGet("summary/expense")]
        public async Task<IActionResult> GetExpenseTransactionsSummary(
            [FromQuery] DateTime? startDate = null,
            [FromQuery] DateTime? endDate = null)
        {
            var queryType = startDate.HasValue && endDate.HasValue
                ? eTransactionQueryType.DateRange
                : eTransactionQueryType.All;

            return await GetTransactionsSummary(
                queryType,
                startDate,
                endDate,
                payType: ePayType.Expense);
        }
        //private readonly AppDbContext _context;

        // DI 컨테이너에서 `AppDbContext`를 주입받도록 수정
        //public TransactionsController(AppDbContext context)
        //{
        //    _context = context;
        //}


        /*[HttpGet("{id}")]
        public async Task<ActionResult<TransactionDto>> GetTransaction(int id)
        {
            var transaction = await _context.Transactions.FindAsync(id);
            if (transaction == null) return NotFound();

            // DTO로 변환
            var transactionDto = new TransactionDto
            {
                Id = transaction.Id,
                Type = transaction.Type,
                Cost = transaction.Cost,
                Date = transaction.Date
            };

            return Ok(transactionDto);
        }

       
        // 2️ 특정 거래 조회
        [HttpGet("{Type}")]
        public async Task<ActionResult<GagebuShared.GagebuTransaction>> GetTransaction(string Type)
        {
            var transaction = await _context.Transactions.FindAsync(Type);
            if (transaction == null) return NotFound();
            return transaction;
        }

        // 3️ 거래 추가
        [HttpPost]
        public async Task<ActionResult<GagebuShared.GagebuTransaction>> CreateTransaction(GagebuShared.GagebuTransaction transaction)
        {          
            _context.Transactions.Add(transaction);
            await _context.SaveChangesAsync();
           return CreatedAtAction(nameof(GetTransaction), new { Type = transaction.Type}, transaction);
        }

        // 4️ 거래 수정
        [HttpPut("{id}")]
        public async Task<IActionResult> UpdateTransaction(int id, GagebuShared.GagebuTransaction transaction)
        {
            if (id != transaction.Id) return BadRequest();
            _context.Entry(transaction).State = EntityState.Modified;
            await _context.SaveChangesAsync();
            return NoContent();
        }

        // 5️ 거래 삭제
        [HttpDelete("{id}")]
        public async Task<IActionResult> DeleteTransaction(int id)
        {
            var transaction = await _context.Transactions.FindAsync(id);
            if (transaction == null) return NotFound();
            _context.Transactions.Remove(transaction);
            await _context.SaveChangesAsync();
            return NoContent();
        }

        // 5️ 지정된 거래 삭제
        [HttpDelete("{Type}")]
        public async Task<IActionResult> DeleteTransactionDes(string strType)
        {
            var transaction = await _context.Transactions.FindAsync(strType);
            if (transaction == null) return NotFound();
            _context.Transactions.Remove(transaction);
            await _context.SaveChangesAsync();
            return NoContent();
        }*/
    }
}