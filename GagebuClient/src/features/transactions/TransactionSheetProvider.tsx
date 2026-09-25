import { createContext, PropsWithChildren, useCallback, useContext, useMemo, useState } from 'react';
import { Transaction } from '../../models/Transaction';
import { TransactionSheet } from './TransactionSheet';

interface TransactionSheetContextValue {
  openCreate: () => void;
  openEdit: (transaction: Transaction) => void;
}

const TransactionSheetContext = createContext<TransactionSheetContextValue | null>(null);

// 추가(FAB)·수정(내역 탭) 시트를 앱 어디서든 열 수 있게
export function TransactionSheetProvider({ children }: PropsWithChildren) {
  const [visible, setVisible] = useState(false);
  const [editing, setEditing] = useState<Transaction | null>(null);

  const openCreate = useCallback(() => {
    setEditing(null);
    setVisible(true);
  }, []);
  const openEdit = useCallback((transaction: Transaction) => {
    setEditing(transaction);
    setVisible(true);
  }, []);

  const value = useMemo(() => ({ openCreate, openEdit }), [openCreate, openEdit]);

  return (
    <TransactionSheetContext.Provider value={value}>
      {children}
      <TransactionSheet visible={visible} editing={editing} onClose={() => setVisible(false)} />
    </TransactionSheetContext.Provider>
  );
}

export function useTransactionSheet() {
  const ctx = useContext(TransactionSheetContext);
  if (!ctx) throw new Error('useTransactionSheet은 TransactionSheetProvider 안에서만 쓸 수 있습니다');
  return ctx;
}
