// 예산 규칙 (서버와 같음): 달별 예외가 있으면 그것, 없으면 기본 예산. 예외 0 = 그 달은 예산 없음
export interface BudgetConfig {
  monthlyBudget: number | null;            // 기본 월 예산 (원). null이면 미설정
  budgetOverrides: Record<string, number>; // 'YYYY-MM' → 원
}

export const EMPTY_BUDGET: BudgetConfig = { monthlyBudget: null, budgetOverrides: {} };

export const monthKey = (year: number, monthIndex: number) => `${year}-${String(monthIndex + 1).padStart(2, '0')}`;

export function budgetFor(config: BudgetConfig, year: number, monthIndex: number) {
  const key = monthKey(year, monthIndex);
  if (key in config.budgetOverrides) {
    return { amount: config.budgetOverrides[key] || null, isOverride: true };
  }
  return { amount: config.monthlyBudget, isOverride: false };
}

export const isEmptyBudget = (config: BudgetConfig) =>
  config.monthlyBudget === null && Object.keys(config.budgetOverrides).length === 0;

// 서버 응답 → 앱에서 쓰는 모양
export function fromServer(res: { defaultAmount: number | null; overrides: { month: string; amount: number }[] }): BudgetConfig {
  return {
    monthlyBudget: res.defaultAmount,
    budgetOverrides: Object.fromEntries(res.overrides.map((o) => [o.month, o.amount])),
  };
}
