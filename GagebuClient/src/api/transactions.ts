import axios from 'axios';
import { Transaction, TransactionSummary, PayType } from '../models/Transaction';

// docker-compose.yml에서 http://<HOST_LAN_IP>:5067 로 주입됨 (루트 .env 참고)
const API_URL = process.env.EXPO_PUBLIC_API_URL;
if (!API_URL) {
  console.warn('EXPO_PUBLIC_API_URL이 설정되지 않았습니다. 루트 .env의 HOST_LAN_IP를 확인하세요.');
}

export const API = axios.create({
  baseURL: API_URL,
});

// 쿼리 파라미터 인터페이스
// from/to: 조회 구간 [from, to) UTC ISO — src/lib/date.ts의 kstTodayRange/kstDateRange/kstMonthRange로 만든다
export interface TransactionQueryParams {
  from?: string;
  to?: string;
  payType?: PayType;
}

export const getTransactions = async (): Promise<Transaction[]> => {
  const res = await API.get('/api/transactions');
  return res.data;
};

export const createTransaction = async (data: Omit<Transaction, 'id'>) => {
  const res = await API.post('/api/transactions', data);
  return res.data;
};

//추가
export const deleteTransaction = async (id: number): Promise<void> => {
  await API.delete(`/api/transactions/${id}`);
};

export const updateTransaction = async (data: Transaction) => {
  const res = await API.put(`/api/transactions/`, data);

  return res;
};

// 새로운 Summary API 함수들
export const getTransactionsSummary = async (
  params: TransactionQueryParams = {}
): Promise<TransactionSummary> => {
  const searchParams = new URLSearchParams();

  if (params.from && params.to) {
    searchParams.append('from', params.from);
    searchParams.append('to', params.to);
  }
  if (params.payType !== undefined && params.payType !== PayType.None) {
    searchParams.append('payType', params.payType.toString());
  }

  const url = `/api/transactions/summary${searchParams.toString() ? `?${searchParams}` : ''}`;
  const res = await API.get(url);
  return res.data;
};
