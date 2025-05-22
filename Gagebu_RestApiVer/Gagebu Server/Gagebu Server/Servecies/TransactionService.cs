

using Gagebu_Server.Data;
using Gagebu_Server.DTO;
using Microsoft.EntityFrameworkCore;

namespace Gagebu_Server.Servecies
{
    public interface ITransactionService
    {
        Task<IEnumerable<TransactionDto>> GetAllTransactions();
        Task<IEnumerable<TransactionDto>> GetSelectTransactions(int id);
        Task<TransactionDto> CreateTransaction(TransactionDto dto); // 추가
        Task<bool> DeleteTransaction(int id);
    }

    public class TransactionService : ITransactionService
    {
        private readonly AppDbContext _context;

        public TransactionService(AppDbContext context)
        {
            _context = context;
        }
        public async Task<TransactionDto> CreateTransaction(TransactionDto dto)
        {
            var entity = new GagebuShared.GagebuTransaction
            {
                Type = dto.type,
                Cost = dto.Cost,
                Date = dto.Date
            };
            _context.Transactions.Add(entity);
            await _context.SaveChangesAsync();

            dto.Id = entity.Id; // DB에서 생성된 ID 반영
            return dto;
        }
        public async Task<IEnumerable<TransactionDto>> GetAllTransactions()
        {
            return await _context.Transactions
                .Select(t => new TransactionDto
                {
                    Id = t.Id,
                    type = t.Type,
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
                   type = t.Type,
                   Cost = t.Cost,
                   Date = t.Date
               }).ToListAsync();
        }

        public async Task<bool> DeleteTransaction(int id)
        {
            var target = await _context.Transactions.FindAsync(id);
            if (target == null) return false;

            _context.Transactions.Remove(target);
            await _context.SaveChangesAsync();
            return true;
        }
    }
}