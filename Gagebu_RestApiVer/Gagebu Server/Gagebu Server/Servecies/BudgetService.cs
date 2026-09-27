using System.Globalization;
using Gagebu_Server.Auth;
using Gagebu_Server.Data;
using Gagebu_Server.DTO;
using Gagebu_Server.Realtime;
using GagebuShared;
using Microsoft.EntityFrameworkCore;

namespace Gagebu_Server.Servecies
{
    // 가계부 예산: 기본 월 예산 + 달별 예외. 멤버 누구나 수정 (같이 쓰는 예산)
    public class BudgetService
    {
        public const int MaxAmount = 1_000_000_000;

        private readonly AppDbContext _db;
        private readonly CurrentUser _current;
        private readonly IHouseholdNotifier _notifier;

        public BudgetService(AppDbContext db, CurrentUser current, IHouseholdNotifier notifier)
        {
            _db = db;
            _current = current;
            _notifier = notifier;
        }

        private int HouseholdId => _current.HouseholdId!.Value;

        public async Task<ServiceResult<BudgetDto>> GetAsync() =>
            ServiceResult<BudgetDto>.Success(await BuildAsync());

        // 그 달에 적용되는 예산 (예외가 있으면 예외, 없으면 기본)
        public async Task<ServiceResult<MonthBudgetDto>> GetMonthAsync(string month)
        {
            if (!TryParseMonth(month, out var year, out var m))
                return ServiceResult<MonthBudgetDto>.ValidationError("month는 YYYY-MM");

            var over = await _db.BudgetOverrides.SingleOrDefaultAsync(b => b.HouseholdId == HouseholdId && b.Year == year && b.Month == m);
            if (over != null)
                return ServiceResult<MonthBudgetDto>.Success(new MonthBudgetDto { Month = FormatMonth(year, m), Amount = over.Amount == 0 ? null : over.Amount, IsOverride = true });

            var household = await _db.Households.SingleAsync(h => h.Id == HouseholdId);
            return ServiceResult<MonthBudgetDto>.Success(new MonthBudgetDto { Month = FormatMonth(year, m), Amount = household.DefaultMonthlyBudget, IsOverride = false });
        }

        // 기본 예산. null이면 해제
        public async Task<ServiceResult<BudgetDto>> SetDefaultAsync(SetDefaultBudgetRequest req)
        {
            if (req.Amount is int amount && amount is <= 0 or > MaxAmount)
                return ServiceResult<BudgetDto>.ValidationError($"기본 예산은 1~{MaxAmount:N0}원 (해제는 null)");

            var household = await _db.Households.SingleAsync(h => h.Id == HouseholdId);
            household.DefaultMonthlyBudget = req.Amount;
            await _db.SaveChangesAsync();
            await _notifier.ChangedAsync(HouseholdId, HouseholdNotifier.Budget);
            return ServiceResult<BudgetDto>.Success(await BuildAsync());
        }

        // 그 달만 다른 예산. 0 = 그 달은 예산 없음
        public async Task<ServiceResult<BudgetDto>> SetMonthAsync(string month, SetMonthBudgetRequest req)
        {
            if (!TryParseMonth(month, out var year, out var m))
                return ServiceResult<BudgetDto>.ValidationError("month는 YYYY-MM");
            if (req.Amount is < 0 or > MaxAmount)
                return ServiceResult<BudgetDto>.ValidationError($"예산은 0~{MaxAmount:N0}원 (0 = 그 달은 예산 없음)");

            var over = await _db.BudgetOverrides.SingleOrDefaultAsync(b => b.HouseholdId == HouseholdId && b.Year == year && b.Month == m);
            if (over == null)
                _db.BudgetOverrides.Add(new BudgetOverride { HouseholdId = HouseholdId, Year = year, Month = m, Amount = req.Amount });
            else
                over.Amount = req.Amount;
            await _db.SaveChangesAsync();
            await _notifier.ChangedAsync(HouseholdId, HouseholdNotifier.Budget);
            return ServiceResult<BudgetDto>.Success(await BuildAsync());
        }

        // 달별 예외 지우기 → 기본 예산으로
        public async Task<ServiceResult<BudgetDto>> ClearMonthAsync(string month)
        {
            if (!TryParseMonth(month, out var year, out var m))
                return ServiceResult<BudgetDto>.ValidationError("month는 YYYY-MM");

            await _db.BudgetOverrides.Where(b => b.HouseholdId == HouseholdId && b.Year == year && b.Month == m).ExecuteDeleteAsync();
            await _notifier.ChangedAsync(HouseholdId, HouseholdNotifier.Budget);
            return ServiceResult<BudgetDto>.Success(await BuildAsync());
        }

        private async Task<BudgetDto> BuildAsync()
        {
            var household = await _db.Households.SingleAsync(h => h.Id == HouseholdId);
            var overrides = await _db.BudgetOverrides
                .Where(b => b.HouseholdId == HouseholdId)
                .OrderBy(b => b.Year).ThenBy(b => b.Month)
                .ToListAsync();
            return new BudgetDto
            {
                DefaultAmount = household.DefaultMonthlyBudget,
                Overrides = overrides.Select(b => new BudgetMonthDto { Month = FormatMonth(b.Year, b.Month), Amount = b.Amount }).ToList(),
            };
        }

        private static bool TryParseMonth(string value, out int year, out int month)
        {
            year = month = 0;
            if (!DateTime.TryParseExact(value, "yyyy-MM", CultureInfo.InvariantCulture, DateTimeStyles.None, out var d)
                || d.Year is < 2000 or > 2100)
                return false;
            year = d.Year;
            month = d.Month;
            return true;
        }

        private static string FormatMonth(int year, int month) => $"{year:D4}-{month:D2}";
    }
}
