

using Gagebu_Server.Data;
using Gagebu_Server.DTO;
using Microsoft.EntityFrameworkCore;

namespace Gagebu_Server.Servecies
{
    public interface iTransactionService
    {
        Task<IEnumerable<TransactionDto>> GetAllTransactions();
        Task<IEnumerable<TransactionDto>> GetSelectTransactions(int id);
    }

    public class TransactionService : iTransactionService
    {
        private readonly AppDbContext _context;

        public TransactionService(AppDbContext context)
        {
            _context = context;
        }

        public async Task<IEnumerable<TransactionDto>> GetAllTransactions()
        {
            return await _context.Transactions
                .Select(t => new TransactionDto
                {
                    Id = t.Id,
                    Type = t.Type,
                    Cost = t.Cost,
                    Date = t.Date
                }).ToListAsync();
        }


        //id로 찾거나 지출,수입 등의 목록으로 찾기
        public async Task<IEnumerable<TransactionDto>> GetSelectTransactions(int id)
        {
            return await _context.Transactions
               .Select(t => new TransactionDto
               {
                   Id = t.Id,
                   Type = t.Type,
                   Cost = t.Cost,
                   Date = t.Date
               }).ToListAsync();
        }
    }
}