import { budgetFor, EMPTY_BUDGET, fromServer, isEmptyBudget, monthKey } from '../budget';

describe('budgetFor', () => {
  const config = { monthlyBudget: 500_000, budgetOverrides: { '2026-09': 300_000, '2026-10': 0 } };

  it('달별 예외가 있으면 그 값', () => {
    expect(budgetFor(config, 2026, 8)).toEqual({ amount: 300_000, isOverride: true });
  });

  it('예외 0 = 그 달은 예산 없음', () => {
    expect(budgetFor(config, 2026, 9)).toEqual({ amount: null, isOverride: true });
  });

  it('예외가 없으면 기본 예산', () => {
    expect(budgetFor(config, 2026, 10)).toEqual({ amount: 500_000, isOverride: false });
  });

  it('아무것도 없으면 null', () => {
    expect(budgetFor(EMPTY_BUDGET, 2026, 8)).toEqual({ amount: null, isOverride: false });
  });
});

describe('fromServer', () => {
  it('서버 응답을 앱 모양으로', () => {
    expect(fromServer({ defaultAmount: 500_000, overrides: [{ month: '2026-09', amount: 300_000 }] })).toEqual({
      monthlyBudget: 500_000,
      budgetOverrides: { '2026-09': 300_000 },
    });
  });
});

describe('기타', () => {
  it('monthKey는 두 자리 달', () => {
    expect(monthKey(2026, 0)).toBe('2026-01');
    expect(monthKey(2026, 11)).toBe('2026-12');
  });

  it('isEmptyBudget', () => {
    expect(isEmptyBudget(EMPTY_BUDGET)).toBe(true);
    expect(isEmptyBudget({ monthlyBudget: null, budgetOverrides: { '2026-09': 0 } })).toBe(false);
    expect(isEmptyBudget({ monthlyBudget: 1, budgetOverrides: {} })).toBe(false);
  });
});
