namespace Gagebu_Server.DTO
{
    // 앱 설정의 monthlyBudget / budgetOverrides와 같은 모양
    public class BudgetDto
    {
        public int? DefaultAmount { get; set; }                         // 기본 월 예산. null = 미설정
        public List<BudgetMonthDto> Overrides { get; set; } = new();    // 달 순
    }

    public class BudgetMonthDto
    {
        public string Month { get; set; } = "";     // YYYY-MM
        public int Amount { get; set; }             // 0 = 그 달은 예산 없음
    }

    // 그 달에 실제로 적용되는 예산
    public class MonthBudgetDto
    {
        public string Month { get; set; } = "";
        public int? Amount { get; set; }            // null = 예산 없음
        public bool IsOverride { get; set; }        // 그 달만 따로 정한 값인지
    }

    public class SetDefaultBudgetRequest
    {
        public int? Amount { get; set; }
    }

    public class SetMonthBudgetRequest
    {
        public int Amount { get; set; }
    }
}
