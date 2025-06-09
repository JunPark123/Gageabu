import axios from 'axios';
import { Transaction, TransactionSummary, TransactionQueryType, PayType } from '../models/Transaction';

const IP_PORT = '192.168.219.105:5067'

export const API = axios.create({
  baseURL: `http://${IP_PORT}`, // ← PC IP + .NET 서버 포트
});

export function getFakeUTCISOStringFromKST(date: Date): string {
  const kstTime = new Date(date.getTime() + 9 * 60 * 60 * 1000); // +9시간 보정
  return kstTime.toISOString().replace('Z', 'Z'); // 형식 유지
}

// 쿼리 파라미터 인터페이스
export interface TransactionQueryParams {
  queryType?: TransactionQueryType;
  startDate?: string;
  endDate?: string;
  selectedDate?: string;
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
  params: TransactionQueryParams = { queryType: TransactionQueryType.All }
): Promise<TransactionSummary> => {
  const searchParams = new URLSearchParams();

  if (params.queryType !== undefined) {
    searchParams.append('queryType', params.queryType.toString());
  }
  if (params.startDate) {
    searchParams.append('startDate', params.startDate);
  }
  if (params.endDate) {
    searchParams.append('endDate', params.endDate);
  }
  if (params.selectedDate) {
    searchParams.append('selectedDate', params.selectedDate);
  }
  if (params.payType !== undefined && params.payType !== PayType.None) {
    searchParams.append('payType', params.payType.toString());
  }

  const url = `/api/transactions/summary${searchParams.toString() ? `?${searchParams}` : ''}`;
  const res = await API.get(url);
  return res.data;
};
