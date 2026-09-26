import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useFocusEffect } from 'expo-router/react-navigation';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createTransaction,
  deleteTransaction,
  getTransactionsSummary,
  TransactionQueryParams,
  updateTransaction,
} from '../api/transactions';
import { PayType, Transaction } from '../models/Transaction';
import { addMonths, kstMonthRange } from '../lib/date';

export const transactionKeys = {
  all: ['transactions'] as const,
  summary: (params: TransactionQueryParams) => [...transactionKeys.all, 'summary', params] as const,
};

// 기간·필터별 요약 조회. params가 바뀌면 자동으로 다시 조회
export function useTransactionSummary(params: TransactionQueryParams) {
  return useQuery({
    queryKey: transactionKeys.summary(params),
    queryFn: () => getTransactionsSummary(params),
    placeholderData: keepPreviousData, // 기간·필터를 바꾸는 동안 이전 목록 유지 (깜빡임 방지)
  });
}

// 내역이 바뀌면 조회 캐시 전부 새로고침 (기간·필터별 캐시가 여러 개라 한 번에 무효화)
function useInvalidateTransactions() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: transactionKeys.all });
}

export function useCreateTransaction() {
  const invalidate = useInvalidateTransactions();
  return useMutation({
    mutationFn: (data: Omit<Transaction, 'id'>) => createTransaction(data),
    onSuccess: invalidate,
  });
}

export function useUpdateTransaction() {
  const invalidate = useInvalidateTransactions();
  return useMutation({
    mutationFn: (data: Transaction) => updateTransaction(data),
    onSuccess: invalidate,
  });
}

// 여러 건 삭제. 중간에 실패해도 이미 지운 건 반영되게 onSettled에서 새로고침
export function useDeleteTransactions() {
  const invalidate = useInvalidateTransactions();
  return useMutation({
    mutationFn: async (ids: number[]) => {
      for (const id of ids) {
        await deleteTransaction(id);
      }
    },
    onSettled: invalidate,
  });
}

// 다른 탭에서 돌아왔을 때 다시 조회 (첫 포커스는 마운트 조회와 겹치므로 건너뜀).
// 파트너가 다른 폰에서 기록한 내역을 보기 위함
export function useRefreshOnFocus(refetch: () => unknown) {
  const firstTimeRef = useRef(true);
  useFocusEffect(
    useCallback(() => {
      if (firstTimeRef.current) {
        firstTimeRef.current = false;
        return;
      }
      refetch();
    }, [refetch])
  );
}

// 선택한 달(KST) 요약. 스와이프로 넘길 때 바로 보이게 이전·다음 달도 미리 불러 둔다
export function useMonthSummary(year: number, monthIndex: number, payType?: PayType) {
  const params = useMemo(() => ({ ...kstMonthRange(year, monthIndex), payType }), [year, monthIndex, payType]);
  usePrefetchSummaries(
    [-1, 1].map((d) => {
      const m = addMonths(year, monthIndex, d);
      return { ...kstMonthRange(m.year, m.monthIndex), payType };
    })
  );
  return useTransactionSummary(params);
}

// 곧 볼 것 같은 조회(이전·다음 달 등)를 미리 캐시에 넣어 둔다
export function usePrefetchSummaries(paramsList: TransactionQueryParams[]) {
  const queryClient = useQueryClient();
  const key = JSON.stringify(paramsList);
  useEffect(() => {
    for (const params of paramsList) {
      queryClient.prefetchQuery({
        queryKey: transactionKeys.summary(params),
        queryFn: () => getTransactionsSummary(params),
        staleTime: 30_000, // 방금 받은 건 다시 받지 않음
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 목록은 값(key)으로 비교
  }, [key, queryClient]);
}
