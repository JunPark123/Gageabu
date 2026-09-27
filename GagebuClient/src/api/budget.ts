import { API } from './client';

// 서버 예산 (가계부별, 멤버 누구나 수정) — docs/PLAN.md 4장
export interface BudgetResponse {
  defaultAmount: number | null;                      // 기본 월 예산. null = 미설정
  overrides: { month: string; amount: number }[];    // 'YYYY-MM', 0 = 그 달은 예산 없음
}

export async function getBudget(): Promise<BudgetResponse> {
  return (await API.get<BudgetResponse>('/api/budget')).data;
}

export async function setDefaultBudget(amount: number | null): Promise<BudgetResponse> {
  return (await API.put<BudgetResponse>('/api/budget/default', { amount })).data;
}

export async function setMonthBudget(month: string, amount: number): Promise<BudgetResponse> {
  return (await API.put<BudgetResponse>(`/api/budget/months/${month}`, { amount })).data;
}

export async function clearMonthBudget(month: string): Promise<BudgetResponse> {
  return (await API.delete<BudgetResponse>(`/api/budget/months/${month}`)).data;
}
