

using Gagebu_Server.Data;
using Gagebu_Server.DTO;
using GagebuShared;
using Microsoft.EntityFrameworkCore;

namespace Gagebu_Server.Servecies
{
    public interface ITransactionService
    {
        Task<ServiceResult<IEnumerable<TransactionDto>>> GetAllTransactions();
        Task<ServiceResult<TransactionDto>> GetTransaction(int id);
        Task<ServiceResult<TransactionDto>> CreateTransaction(TransactionDto dto);
        Task<ServiceResult<bool>> DeleteTransaction(int id);
    }

    public class TransactionService : ITransactionService
    {
        private readonly AppDbContext _context;
        private readonly ILogger<TransactionService> _logger;

        public TransactionService(AppDbContext context, ILogger<TransactionService> logger)
        {
            _context = context;
            _logger = logger;
        }

        public async Task<ServiceResult<IEnumerable<TransactionDto>>> GetAllTransactions()
        {
            try
            {
                var transactions = await _context.Transactions
                    .Select(t => new TransactionDto
                    {
                        Id = t.Id,
                        type = t.Type,
                        Cost = t.Cost,
                        Date = t.Date,
                        payType = (ePayType)t.payType
                    }).ToListAsync();

                return ServiceResult<IEnumerable<TransactionDto>>.Success(transactions);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to get all transactions");
                return ServiceResult<IEnumerable<TransactionDto>>.Failure("Failed to retrieve transactions");
            }
        }

        public async Task<ServiceResult<TransactionDto>> GetTransaction(int id)
        {
            try
            {
                if (id <= 0)
                    return ServiceResult<TransactionDto>.ValidationError("Invalid transaction ID");

                var transaction = await _context.Transactions
                    .Select(t => new TransactionDto
                    {
                        Id = t.Id,
                        type = t.Type,
                        Cost = t.Cost,
                        Date = t.Date,
                        payType = (ePayType)t.payType
                    })
                    .FirstOrDefaultAsync(t => t.Id == id);

                if (transaction == null)
                    return ServiceResult<TransactionDto>.NotFound("Transaction not found");

                return ServiceResult<TransactionDto>.Success(transaction);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to get transaction with ID: {Id}", id);
                return ServiceResult<TransactionDto>.Failure("Failed to retrieve transaction");
            }
        }

        public async Task<ServiceResult<IEnumerable<TransactionDto>>> GetTransactionsByType(int paytype)
        {
            try
            {
                if (paytype < 0)
                    return ServiceResult<IEnumerable<TransactionDto>>.ValidationError("Invalid transaction type");

                var transactions = await _context.Transactions
                    .Where(t => t.payType == paytype)
                    .Select(t => new TransactionDto
                    {
                        Id = t.Id,
                        type = t.Type,
                        Cost = t.Cost,
                        Date = t.Date,
                        payType = (ePayType)t.payType
                    }).ToListAsync();

                return ServiceResult<IEnumerable<TransactionDto>>.Success(transactions);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to get transactions by type: {Type}", paytype);
                return ServiceResult<IEnumerable<TransactionDto>>.Failure("Failed to retrieve transactions by type");
            }
        }

        public async Task<ServiceResult<TransactionDto>> CreateTransaction(TransactionDto dto)
        {
            // 입력 검증
            if (dto == null)
                return ServiceResult<TransactionDto>.ValidationError("Transaction data is required");

            if (dto.payType == ePayType.None)
                return ServiceResult<TransactionDto>.ValidationError("Payment type is required");

            if (dto.Cost <= 0)
                return ServiceResult<TransactionDto>.ValidationError("Cost must be greater than 0");

            if (dto.Date == default(DateTime))
                return ServiceResult<TransactionDto>.ValidationError("Date is required");

            try
            {
                var entity = new GagebuTransaction
                {
                    Type = dto.type,
                    Cost = dto.Cost,
                    Date = dto.Date,
                    payType = (int)dto.payType
                };

                _context.Transactions.Add(entity);
                await _context.SaveChangesAsync();

                // 생성된 엔티티를 DTO로 매핑
                var createdDto = new TransactionDto
                {
                    Id = entity.Id,
                    type = entity.Type,
                    Cost = entity.Cost,
                    Date = entity.Date,
                    payType = (ePayType)entity.payType
                };

                _logger.LogInformation("Transaction created successfully with ID: {Id}", entity.Id);
                return ServiceResult<TransactionDto>.Success(createdDto);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to create transaction");
                return ServiceResult<TransactionDto>.Failure("Failed to create transaction");
            }
        }

        public async Task<ServiceResult<bool>> DeleteTransaction(int id)
        {
            try
            {
                if (id <= 0)
                    return ServiceResult<bool>.ValidationError("Invalid transaction ID");

                var transaction = await _context.Transactions.FindAsync(id);
                if (transaction == null)
                    return ServiceResult<bool>.NotFound("Transaction not found");

                _context.Transactions.Remove(transaction);
                await _context.SaveChangesAsync();

                _logger.LogInformation("Transaction deleted successfully with ID: {Id}", id);
                return ServiceResult<bool>.Success(true);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to delete transaction with ID: {Id}", id);
                return ServiceResult<bool>.Failure("Failed to delete transaction");
            }
        }
    }
}