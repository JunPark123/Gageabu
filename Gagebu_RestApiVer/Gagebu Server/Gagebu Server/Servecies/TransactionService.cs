using System.Linq.Expressions;
using Gagebu_Server.Data;
using Gagebu_Server.DTO;
using GagebuShared;
using Microsoft.EntityFrameworkCore;


namespace Gagebu_Server.Servecies
{
    public interface ITransactionService
    {
        // [from, to) 구간 조회. "오늘/이번 달" 같은 구간은 클라가 KST 기준으로 계산해서 보낸다
        Task<ServiceResult<TransactionSummaryDto>> GetTransactionSummaryAsync(
            DateTimeOffset? from = null,
            DateTimeOffset? to = null,
            ePayType? payType = null);  // 수입/지출 필터
        Task<ServiceResult<IEnumerable<TransactionDto>>> GetAllTransactions();
        Task<ServiceResult<TransactionDto>> GetTransaction(int id);
        Task<ServiceResult<TransactionDto>> CreateTransaction(TransactionDto dto);
        Task<ServiceResult<TransactionDto>> UpdateTransaction(TransactionDto dto);
        Task<ServiceResult<bool>> DeleteTransaction(int id);
    }

    public class TransactionService : ITransactionService
    {
        private readonly AppDbContext _context;
        private readonly ILogger<TransactionService> _logger;

        // DB의 Date는 UTC DateTime → 응답은 +00:00 오프셋으로
        private static readonly Expression<Func<GagebuTransaction, TransactionDto>> ToDto = t => new TransactionDto
        {
            Id = t.Id,
            Type = t.Type,
            Cost = t.Cost,
            Date = new DateTimeOffset(t.Date, TimeSpan.Zero),
            Paytype = (ePayType)t.Paytype,
            Category = t.Category,
            Content = t.Content,
        };
        private static readonly Func<GagebuTransaction, TransactionDto> ToDtoFunc = ToDto.Compile();

        public TransactionService(AppDbContext context, ILogger<TransactionService> logger)
        {
            _context = context;
            _logger = logger;
        }

        public async Task<ServiceResult<TransactionSummaryDto>> GetTransactionSummaryAsync(
            DateTimeOffset? from = null,
            DateTimeOffset? to = null,
            ePayType? payType = null)
        {
            if (from.HasValue != to.HasValue)
                return ServiceResult<TransactionSummaryDto>.ValidationError("from and to must be given together");

            if (from.HasValue && from.Value >= to!.Value)
                return ServiceResult<TransactionSummaryDto>.ValidationError("from must be earlier than to");

            try
            {
                var query = _context.Transactions.AsQueryable();

                // 날짜 필터링 [from, to)
                if (from.HasValue)
                {
                    var fromUtc = from.Value.UtcDateTime;
                    var toUtc = to!.Value.UtcDateTime;
                    query = query.Where(t => t.Date >= fromUtc && t.Date < toUtc);
                }

                // 수입/지출 필터링
                if (payType.HasValue && payType.Value != ePayType.None)
                {
                    query = query.Where(t => t.Paytype == (int)payType.Value);
                }

                //날짜순으로 오름차순 정렬해서 보내기
                var transactions = await query
                    .OrderBy(t => t.Date)
                    .Select(ToDto)
                    .ToListAsync();

                return ServiceResult<TransactionSummaryDto>.Success(new TransactionSummaryDto
                {
                    Transactions = transactions,
                    Statistics = CalculateStatistics(transactions),
                    Period = new TransactionPeriodDto
                    {
                        From = from?.ToUniversalTime(),
                        To = to?.ToUniversalTime(),
                        PayTypeFilter = payType
                    }
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to get transaction summary");
                return ServiceResult<TransactionSummaryDto>.Failure("Failed to retrieve transactions");
            }
        }


        public async Task<ServiceResult<IEnumerable<TransactionDto>>> GetAllTransactions()
        {
            try
            {
                var transactions = await _context.Transactions
                    .Select(ToDto)
                    .ToListAsync();

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
                    .Where(t => t.Id == id)
                    .Select(ToDto)
                    .FirstOrDefaultAsync();

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

        public async Task<ServiceResult<TransactionDto>> CreateTransaction(TransactionDto dto)
        {
            // 입력 검증
            if (dto == null)
                return ServiceResult<TransactionDto>.ValidationError("Transaction data is required");

            if (dto.Paytype == ePayType.None)
                return ServiceResult<TransactionDto>.ValidationError("Payment type is required");

            if (dto.Cost <= 0)
                return ServiceResult<TransactionDto>.ValidationError("Cost must be greater than 0");

            if (dto.Date == default)
                return ServiceResult<TransactionDto>.ValidationError("Date is required");

            try
            {
                var entity = new GagebuTransaction
                {
                    Type = dto.Type,
                    Cost = dto.Cost,
                    Date = dto.Date.UtcDateTime,
                    Paytype = (int)dto.Paytype,
                    Category = dto.Category ?? "",
                    Content = dto.Content ?? "",
                };

                _context.Transactions.Add(entity);
                await _context.SaveChangesAsync();

                _logger.LogInformation("Transaction created successfully with ID: {Id}", entity.Id);
                return ServiceResult<TransactionDto>.Success(ToDtoFunc(entity));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to create transaction");
                return ServiceResult<TransactionDto>.Failure("Failed to create transaction");
            }
        }
        public async Task<ServiceResult<TransactionDto>> UpdateTransaction(TransactionDto dto)
        {
            // 입력 검증
            if (dto == null)
                return ServiceResult<TransactionDto>.ValidationError("Transaction data is required");

            if (dto.Paytype == ePayType.None)
                return ServiceResult<TransactionDto>.ValidationError("Payment type is required");

            if (dto.Cost <= 0)
                return ServiceResult<TransactionDto>.ValidationError("Cost must be greater than 0");

            if (dto.Date == default)
                return ServiceResult<TransactionDto>.ValidationError("Date is required");

            try
            {
                var dateUtc = dto.Date.UtcDateTime;
                var affected = await _context.Transactions
                    .Where(t => t.Id == dto.Id)
                    .ExecuteUpdateAsync(builder => builder
                        .SetProperty(t => t.Type, dto.Type)
                        .SetProperty(t => t.Cost, dto.Cost)
                        .SetProperty(t => t.Date, dateUtc)
                        .SetProperty(t => t.Paytype, (int)dto.Paytype)
                        .SetProperty(t => t.Category, dto.Category ?? "")
                        .SetProperty(t => t.Content, dto.Content ?? "")
                    );

                if (affected == 0)
                    return ServiceResult<TransactionDto>.NotFound("Transaction not found");

                return ServiceResult<TransactionDto>.Success(dto);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to update transaction {Id}", dto.Id);
                return ServiceResult<TransactionDto>.Failure("Failed to update transaction");
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


        private static TransactionStatisticsDto CalculateStatistics(IEnumerable<TransactionDto> transactions)
        {
            var transactionList = transactions.ToList();

            // ePayType으로 수입/지출 분류
            var incomeTransactions = transactionList.Where(t => t.Paytype == ePayType.Income).ToList();
            var expenseTransactions = transactionList.Where(t => t.Paytype == ePayType.Expense).ToList();

            var totalIncome = incomeTransactions.Sum(t => t.Cost);
            var totalExpense = expenseTransactions.Sum(t => t.Cost);
            var totalCount = transactionList.Count;

            return new TransactionStatisticsDto
            {
                TotalIncome = totalIncome,
                TotalExpense = totalExpense,
                NetAmount = totalIncome - totalExpense,
                IncomeCount = incomeTransactions.Count,
                ExpenseCount = expenseTransactions.Count,
                TotalCount = totalCount,
            };
        }
    }
}
