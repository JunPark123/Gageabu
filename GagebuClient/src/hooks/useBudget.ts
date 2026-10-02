import { useEffect, useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as budgetApi from '../api/budget';
import { BudgetConfig, budgetFor, EMPTY_BUDGET, fromServer, isEmptyBudget, monthKey } from '../lib/budget';
import { useSettings } from '../store/settings';

export const budgetKeys = { all: ['budget'] as const };

// 가계부 예산 (서버). 멤버가 바꾸면 실시간 신호로 다시 받는다
export function useBudget() {
  return useQuery({ queryKey: budgetKeys.all, queryFn: async () => fromServer(await budgetApi.getBudget()) });
}

// 그 달에 적용되는 예산. 아직 못 받았으면 loaded = false (예산 카드가 "정해 보세요"로 번쩍이지 않게)
export function useMonthBudget(year: number, monthIndex: number) {
  const { data } = useBudget();
  return { ...budgetFor(data ?? EMPTY_BUDGET, year, monthIndex), loaded: !!data };
}

type Change =
  | { kind: 'default'; amount: number | null; clearMonth?: string }
  | { kind: 'month'; month: string; amount: number }
  | { kind: 'clearMonth'; month: string };

function apply(config: BudgetConfig, change: Change): BudgetConfig {
  const overrides = { ...config.budgetOverrides };
  switch (change.kind) {
    case 'default':
      if (change.clearMonth) delete overrides[change.clearMonth];
      return { monthlyBudget: change.amount, budgetOverrides: overrides };
    case 'month':
      return { ...config, budgetOverrides: { ...overrides, [change.month]: change.amount } };
    case 'clearMonth':
      delete overrides[change.month];
      return { ...config, budgetOverrides: overrides };
  }
}

// 예산 바꾸기. 화면에는 바로 반영하고(서버 응답을 기다리지 않음), 실패하면 되돌린다
export function useUpdateBudget() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (change: Change) => {
      switch (change.kind) {
        case 'default': {
          const res = await budgetApi.setDefaultBudget(change.amount);
          return change.clearMonth ? budgetApi.clearMonthBudget(change.clearMonth) : res;
        }
        case 'month':
          return budgetApi.setMonthBudget(change.month, change.amount);
        case 'clearMonth':
          return budgetApi.clearMonthBudget(change.month);
      }
    },
    onMutate: async (change) => {
      await queryClient.cancelQueries({ queryKey: budgetKeys.all });
      const previous = queryClient.getQueryData<BudgetConfig>(budgetKeys.all);
      queryClient.setQueryData<BudgetConfig>(budgetKeys.all, apply(previous ?? EMPTY_BUDGET, change));
      return { previous };
    },
    onError: (_e, _change, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(budgetKeys.all, ctx.previous);
    },
    onSuccess: (res) => {
      queryClient.setQueryData(budgetKeys.all, fromServer(res));
    },
    // 기본 예산 저장 후 월별 예산 해제만 실패한 경우에도 서버의 실제 상태로 맞춘다.
    onSettled: () => queryClient.invalidateQueries({ queryKey: budgetKeys.all }),
  });
}

// 로그인 전 폰에만 저장하던 예산을 한 번 서버로 옮긴다.
// 서버가 비어 있을 때만 올리고(이미 멤버가 정했으면 서버 값을 따름), 끝나면 폰 값은 지운다
export function useMigrateLocalBudget() {
  const { settings, loaded, updateSettings } = useSettings();
  const { data } = useBudget();
  const queryClient = useQueryClient();
  const running = useRef(false);

  useEffect(() => {
    const local: BudgetConfig = { monthlyBudget: settings.monthlyBudget ?? null, budgetOverrides: settings.budgetOverrides ?? {} };
    if (!loaded || !data || isEmptyBudget(local) || running.current) return;
    running.current = true;

    (async () => {
      try {
        if (isEmptyBudget(data)) {
          let res: budgetApi.BudgetResponse | null = null;
          if (local.monthlyBudget !== null) res = await budgetApi.setDefaultBudget(local.monthlyBudget);
          for (const [month, amount] of Object.entries(local.budgetOverrides)) {
            res = await budgetApi.setMonthBudget(month, amount);
          }
          if (res) queryClient.setQueryData(budgetKeys.all, fromServer(res));
        }
        updateSettings({ monthlyBudget: null, budgetOverrides: {} });
      } catch (e) {
        // 실패하면 폰 값을 그대로 두고 다음 실행 때 다시
        console.warn('예산 옮기기 실패', e);
      } finally {
        running.current = false;
      }
    })();
  }, [loaded, data, settings.monthlyBudget, settings.budgetOverrides, updateSettings, queryClient]);
}

export { monthKey };
