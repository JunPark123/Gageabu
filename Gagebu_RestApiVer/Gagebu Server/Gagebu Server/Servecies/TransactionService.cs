

using Gagebu_Server.Data;
using Gagebu_Server.DTO;
using GagebuShared;
using Microsoft.EntityFrameworkCore;


namespace Gagebu_Server.Servecies
{
    public interface ITransactionService
    {
        Task<ServiceResult<TransactionSummaryDto>> GetTransactionSummaryAsync(
       eTransactionQueryType queryType,
       DateTime? startDate = null,
       DateTime? endDate = null,
       DateTime? selectedDate = null,
       ePayType? payType = null);  // 수입/지출 필터
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
        public async Task<ServiceResult<TransactionSummaryDto>> GetTransactionSummaryAsync(
    eTransactionQueryType queryType,
    DateTime? startDate = null,
    DateTime? endDate = null,
    DateTime? selectedDate = null,
    ePayType? payType = null)
        {
            try
            {
                var (start, end) = GetDateRange(queryType, startDate, endDate, selectedDate);

                var query = _context.Transactions.AsQueryable();

                // 날짜 필터링
                if (start.HasValue && end.HasValue)
                {
                    query = query.Where(t => t.Date >= start.Value && t.Date <= end.Value);
                }

                // 수입/지출 필터링
                if (payType.HasValue && payType.Value != ePayType.None)
                {
                    query = query.Where(t => t.Paytype == (int)payType.Value);
                }

                // queryType에 따른 추가 필터링
                if (queryType == eTransactionQueryType.Income)
                {
                    query = query.Where(t => t.Paytype == (int)ePayType.Income);
                }
                else if (queryType == eTransactionQueryType.Expense)
                {
                    query = query.Where(t => t.Paytype == (int)ePayType.Expense);
                }

                var transactions = await query
                    .Select(t => new TransactionDto
                    {
                        Id = t.Id,
                        Type = t.Type,
                        Cost = t.Cost,
                        Date = t.Date,
                        Paytype = (ePayType)t.Paytype,
                    }).ToListAsync();

                return ServiceResult<TransactionSummaryDto>.Success(new TransactionSummaryDto
                {
                    Transactions = transactions,
                    Statistics = CalculateStatistics(transactions),
                    Period = new TransactionPeriodDto
                    {
                        QueryType = queryType,
                        StartDate = start,
                        EndDate = end,
                        Description = GetPeriodDescription(queryType, start, end, payType),
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
                    .Select(t => new TransactionDto
                    {
                        Id = t.Id,
                        Type = t.Type,
                        Cost = t.Cost,
                        Date = t.Date,
                        Paytype = (ePayType)t.Paytype
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
                        Type = t.Type,
                        Cost = t.Cost,
                        Date = t.Date,
                        Paytype = (ePayType)t.Paytype
                    }).FirstOrDefaultAsync(t => t.Id == id);

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
                    .Where(t => t.Paytype == paytype)
                    .Select(t => new TransactionDto
                    {
                        Id = t.Id,
                        Type = t.Type,
                        Cost = t.Cost,
                        Date = t.Date,
                        Paytype = (ePayType)t.Paytype
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

            if (dto.Paytype == ePayType.None)
                return ServiceResult<TransactionDto>.ValidationError("Payment type is required");

            if (dto.Cost <= 0)
                return ServiceResult<TransactionDto>.ValidationError("Cost must be greater than 0");

            if (dto.Date == default(DateTime))
                return ServiceResult<TransactionDto>.ValidationError("Date is required");

            try
            {
                var entity = new GagebuTransaction
                {
                    Type = dto.Type,
                    Cost = dto.Cost,
                    Date = dto.Date,
                    Paytype = (int)dto.Paytype
                };

                _context.Transactions.Add(entity);
                await _context.SaveChangesAsync();

                // 생성된 엔티티를 DTO로 매핑
                var createdDto = new TransactionDto
                {
                    Id = entity.Id,
                    Type = entity.Type,
                    Cost = entity.Cost,
                    Date = entity.Date,
                    Paytype = (ePayType)entity.Paytype
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

        //날짜 필터
        private static string GetPeriodDescription(
        eTransactionQueryType queryType,
        DateTime? start,
        DateTime? end,
        ePayType? payType)
        {
            var baseDescription = queryType switch
            {
                eTransactionQueryType.Today => "오늘",
                eTransactionQueryType.SelectedDate => start?.ToString("yyyy-MM-dd") ?? "선택된 날짜",
                eTransactionQueryType.DateRange => $"{start:yyyy-MM-dd} ~ {end:yyyy-MM-dd}",
                eTransactionQueryType.All => "전체",
                eTransactionQueryType.Income => "수입 내역",
                eTransactionQueryType.Expense => "지출 내역",
                _ => "알 수 없음"
            };

            if (payType.HasValue && payType.Value != ePayType.None)
            {
                var payTypeDescription = payType.Value switch
                {
                    ePayType.Income => "수입만",
                    ePayType.Expense => "지출만",
                    _ => payType.ToString()
                };
                return $"{baseDescription} ({payTypeDescription})";
            }

            return baseDescription;
        }

        //날짜 필터
        private (DateTime? start, DateTime? end) GetDateRange(
    eTransactionQueryType queryType,
    DateTime? startDate,
    DateTime? endDate,
    DateTime? selectedDate)
        {
            return queryType switch
            {
                eTransactionQueryType.Today => (DateTime.Today, DateTime.Today.AddDays(1).AddTicks(-1)),
                eTransactionQueryType.SelectedDate when selectedDate.HasValue =>
                    (selectedDate.Value.Date, selectedDate.Value.Date.AddDays(1).AddTicks(-1)),
                eTransactionQueryType.DateRange when startDate.HasValue && endDate.HasValue =>
                    (startDate.Value.Date, endDate.Value.Date.AddDays(1).AddTicks(-1)),
                eTransactionQueryType.All => (null, null),
                eTransactionQueryType.Income => (null, null),
                eTransactionQueryType.Expense => (null, null),
                _ => (null, null)
            };
        }
    }
}