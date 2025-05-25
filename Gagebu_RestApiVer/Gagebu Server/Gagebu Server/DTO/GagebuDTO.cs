using GagebuShared;

namespace Gagebu_Server.DTO
{
    public class TransactionSummaryDto
    {
        public IEnumerable<TransactionDto> Transactions { get; set; } = new List<TransactionDto>();
        public TransactionStatisticsDto Statistics { get; set; } = new();
        public TransactionPeriodDto Period { get; set; } = new();
    }
    public class TransactionDto
    {
        public int Id { get; set; }
        public string Type { get; set; }
        public int Cost { get; set; }
        public DateTime Date { get; set; }
        public ePayType Paytype { get; set; }
    }

    public class TransactionStatisticsDto
    {
        public int TotalIncome { get; set; }                // 총 수입액
        public int TotalExpense { get; set; }               // 총 지출액
        public int NetAmount { get; set; }                  // 순액 (수입 - 지출)
        public int IncomeCount { get; set; }                // 수입 건수
        public int ExpenseCount { get; set; }               // 지출 건수
        public int TotalCount { get; set; }                 // 총 거래 건수
        public int? TotalBudget { get; set; }              // 총 예산 (추후 확장용)
    }

    public class TransactionPeriodDto
    {
        public eTransactionQueryType QueryType { get; set; }
        public DateTime? StartDate { get; set; }
        public DateTime? EndDate { get; set; }
        public string Description { get; set; } = string.Empty;
        public ePayType? PayTypeFilter { get; set; }            // 수입/지출 필터 (있을 경우)
    }
}