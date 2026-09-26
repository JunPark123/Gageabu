import { useCallback, useMemo, useRef } from 'react';
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
import { kstMonthRange } from '../lib/date';

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
// enabled: 달 페이지처럼 여러 개가 동시에 떠 있을 때 지금 보는 것만 새로고침
export function useRefreshOnFocus(refetch: () => unknown, enabled = true) {
  const firstTimeRef = useRef(true);
  useFocusEffect(
    useCallback(() => {
      if (firstTimeRef.current) {
        firstTimeRef.current = false;
        return;
      }
      if (enabled) refetch();
    }, [refetch, enabled])
  );
}

// 한 달(KST) 요약. 이전·다음 달은 MonthPager가 옆 페이지를 미리 그리면서 같이 불러옴
export function useMonthSummary(year: number, monthIndex: number, payType?: PayType) {
  const params = useMemo(() => ({ ...kstMonthRange(year, monthIndex), payType }), [year, monthIndex, payType]);
  return useTransactionSummary(params);
}
