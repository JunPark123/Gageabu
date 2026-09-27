using System.ComponentModel.DataAnnotations;

namespace GagebuShared
{
    // 가계부. 커플이 같은 Household를 공유한다 (docs/PLAN.md 4장)
    public class Household
    {
        // 로그인 도입 전까지 모든 내역이 들어가는 기본 가계부
        public const int DefaultId = 1;

        [Key]
        public int Id { get; set; }
        public string Name { get; set; } = "";
        public DateTime CreatedAt { get; set; }     // UTC
        public int? DefaultMonthlyBudget { get; set; }  // 기본 월 예산 (원). null = 미설정
    }

    // 달별 예산 예외. 없으면 기본 예산, Amount 0 = 그 달은 예산 없음 (앱의 budgetOverrides와 같은 규칙)
    public class BudgetOverride
    {
        public int HouseholdId { get; set; }
        public int Year { get; set; }
        public int Month { get; set; }              // 1~12
        public int Amount { get; set; }
    }
}
