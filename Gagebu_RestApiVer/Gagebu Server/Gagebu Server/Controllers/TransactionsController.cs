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