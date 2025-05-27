import axios from 'axios';
import { Transaction } from '../models/Transaction';

const IP_PORT = '192.168.219.103:5067'

export  const API = axios.create({
    baseURL: `http://${IP_PORT}`, // ← PC IP + .NET 서버 포트
  });


export const getTransactions = async (): Promise<Transaction[]> => {
    const res = await API.get('/api/transactions');
    return res.data;
  };

export const createTransaction = async (data: Omit<Transaction, 'id'>) => {
    const res = await API.post('/api/transactions', data);
    return res.data;
  };

