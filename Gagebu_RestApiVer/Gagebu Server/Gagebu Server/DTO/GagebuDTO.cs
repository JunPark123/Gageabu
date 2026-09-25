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
        public string Type { get; set; } = "";          // 내역 (예: 점심)
        public int Cost { get; set; }
        // 시각(instant). 응답은 UTC(+00:00), 요청은 오프셋만 붙어 있으면 어느 시간대든 OK
        public DateTimeOffset Date { get; set; }
        public ePayType Paytype { get; set; }
        public string Category { get; set; } = "";      // 분류
        public string Content { get; set; } = "";       // 메모
    }

    public class TransactionStatisticsDto
    {
        public int TotalIncome { get; set; }                // 총 수입액
        public int TotalExpense { get; set; }               // 총 지출액
        public int NetAmount { get; set; }                  // 순액 (수입 - 지출)
        public int IncomeCount { get; set; }                // 수입 건수
        public int ExpenseCount { get; set; }               // 지출 건수
        public int TotalCount { get; set; }                 // 총 거래 건수
        public int? TotalBudget { get; set; }               // 총 예산 (추후 확장)
    }

    public class TransactionPeriodDto
    {
        // 조회 구간 [From, To). 둘 다 null이면 전체
        public DateTimeOffset? From { get; set; }
        public DateTimeOffset? To { get; set; }
        public ePayType? PayTypeFilter { get; set; }        // 수입/지출 필터 (없으면 전체)
    }
}
