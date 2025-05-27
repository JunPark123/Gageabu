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
        public int TotalIncome { get; set; }                // �� ���Ծ�
        public int TotalExpense { get; set; }               // �� �����
        public int NetAmount { get; set; }                  // ���� (���� - ����)
        public int IncomeCount { get; set; }                // ���� �Ǽ�
        public int ExpenseCount { get; set; }               // ���� �Ǽ�
        public int TotalCount { get; set; }                 // �� �ŷ� �Ǽ�
        public int? TotalBudget { get; set; }              // �� ���� (���� Ȯ���)
    }

    public class TransactionPeriodDto
    {
        public eTransactionQueryType QueryType { get; set; }
        public DateTime? StartDate { get; set; }
        public DateTime? EndDate { get; set; }
        public string Description { get; set; } = string.Empty;
        public ePayType? PayTypeFilter { get; set; }            // ����/���� ���� (���� ���)
    }
}