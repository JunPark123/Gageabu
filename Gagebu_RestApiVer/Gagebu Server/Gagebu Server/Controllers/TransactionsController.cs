using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Gagebu_Server.Data;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using System.Diagnostics;
using GagebuShared;

namespace Gagebu_Server.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class TransactionsController : ControllerBase
    {
        private readonly AppDbContext _context;

        // DI 컨테이너에서 `AppDbContext`를 주입받도록 수정
        public TransactionsController(AppDbContext context)
        {
            _context = context;
            Console.WriteLine(" TransactionsController 생성됨!");
        }

        // 1️ 모든 거래 내역 조회
        [HttpGet]
        public async Task<ActionResult<IEnumerable<GagebuShared.GagebuTransaction>>> GetTransactions()
        {
            Debug.WriteLine(" GetTransactions() 호출됨!");
            return await _context.Transactions.ToListAsync();
        }

        // 2️ 특정 거래 조회
        [HttpGet("{id}")]
        public async Task<ActionResult<GagebuShared.GagebuTransaction>> GetTransaction(int id)
        {
            var transaction = await _context.Transactions.FindAsync(id);
            if (transaction == null) return NotFound();
            return transaction;
        }

        // 3️ 거래 추가
        [HttpPost]
        public async Task<ActionResult<GagebuShared.GagebuTransaction>> CreateTransaction(GagebuShared.GagebuTransaction transaction)
        {
            transaction.Date = transaction.Date.ToLocalTime(); //서버 시간으로 변환
            _context.Transactions.Add(transaction);
            await _context.SaveChangesAsync();
           return CreatedAtAction(nameof(GetTransaction), new { id = transaction.Id }, transaction);
            
            Debug.WriteLine($" CreateTransaction() 호출됨! 데이터: {transaction.Description}");
            _context.Transactions.Add(transaction);
            await _context.SaveChangesAsync();
            return CreatedAtAction(nameof(GetTransaction), new { id = transaction.Id }, transaction);
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
    }
}