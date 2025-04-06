import axios from 'axios';
import { Transaction } from '../models/Transaction';

const API = axios.create({
    baseURL: 'http://192.168.219.108:5067', // ← PC IP + .NET 서버 포트
  });

export const getTransactions = async (): Promise<Transaction[]> => {
    const res = await API.get('/api/transactions');
    return res.data;
  };

export const createTransaction = async (data: Omit<Transaction, 'id'>) => {
    const res = await API.post('/api/transactions', data);
    return res.data;
  };