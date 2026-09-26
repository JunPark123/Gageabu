import { createContext, PropsWithChildren, useCallback, useContext, useMemo, useState } from 'react';
import { Transaction } from '../../models/Transaction';
import { TransactionActionSheet } from './TransactionActionSheet';
import { TransactionSheet } from './TransactionSheet';

interface TransactionSheetContextValue {
  openCreate: () => void;
  openEdit: (transaction: Transaction) => void;
  openActions: (transaction: Transaction) => void;  // 꾹 눌렀을 때 편집/삭제 메뉴
}

const TransactionSheetContext = createContext<TransactionSheetContextValue | null>(null);

// 추가(FAB)·수정(내역 탭)·꾹 누르기 메뉴 시트를 앱 어디서든 열 수 있게
export function TransactionSheetProvider({ children }: PropsWithChildren) {
  const [visible, setVisible] = useState(false);
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [actionTarget, setActionTarget] = useState<Transaction | null>(null);

  const openCreate = useCallback(() => {
    setEditing(null);
    setVisible(true);
  }, []);
  const openEdit = useCallback((transaction: Transaction) => {
    setEditing(transaction);
    setVisible(true);
  }, []);

  const openActions = useCallback((transaction: Transaction) => setActionTarget(transaction), []);

  const value = useMemo(() => ({ openCreate, openEdit, openActions }), [openCreate, openEdit, openActions]);

  return (
    <TransactionSheetContext.Provider value={value}>
      {children}
      <TransactionSheet visible={visible} editing={editing} onClose={() => setVisible(false)} />
      <TransactionActionSheet transaction={actionTarget} onClose={() => setActionTarget(null)} onEdit={openEdit} />
    </TransactionSheetContext.Provider>
  );
}

export function useTransactionSheet() {
  const ctx = useContext(TransactionSheetContext);
  if (!ctx) throw new Error('useTransactionSheet은 TransactionSheetProvider 안에서만 쓸 수 있습니다');
  return ctx;
}
