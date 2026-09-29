import { createContext, PropsWithChildren, useCallback, useContext, useMemo, useState } from 'react';
import { PayType, Transaction } from '../../models/Transaction';
import { AddMenu } from './AddMenu';
import { TransactionActionSheet } from './TransactionActionSheet';
import { TransactionSheet } from './TransactionSheet';

interface TransactionSheetContextValue {
  openCreate: (payType?: PayType) => void;
  openAddMenu: () => void;
  openEdit: (transaction: Transaction) => void;
  openActions: (transaction: Transaction) => void;  // 꾹 눌렀을 때 편집/삭제 메뉴
}

const TransactionSheetContext = createContext<TransactionSheetContextValue | null>(null);

// 추가(FAB)·수정(내역 탭)·꾹 누르기 메뉴 시트를 앱 어디서든 열 수 있게
export function TransactionSheetProvider({ children }: PropsWithChildren) {
  const [visible, setVisible] = useState(false);
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [actionTarget, setActionTarget] = useState<Transaction | null>(null);
  const [addMenuVisible, setAddMenuVisible] = useState(false);
  const [createPayType, setCreatePayType] = useState(PayType.Expense);

  const openCreate = useCallback((payType = PayType.Expense) => {
    setAddMenuVisible(false);
    setEditing(null);
    setCreatePayType(payType);
    // 메뉴가 내려간 뒤 입력 시트를 열어 Android에서 두 Modal이 겹치지 않게 한다.
    setTimeout(() => setVisible(true), 230);
  }, []);
  const openAddMenu = useCallback(() => setAddMenuVisible(true), []);
  const openEdit = useCallback((transaction: Transaction) => {
    setEditing(transaction);
    setVisible(true);
  }, []);

  const openActions = useCallback((transaction: Transaction) => setActionTarget(transaction), []);

  const value = useMemo(() => ({ openCreate, openAddMenu, openEdit, openActions }), [openCreate, openAddMenu, openEdit, openActions]);

  return (
    <TransactionSheetContext.Provider value={value}>
      {children}
      <AddMenu visible={addMenuVisible} onClose={() => setAddMenuVisible(false)} onCreate={openCreate} />
      <TransactionSheet visible={visible} editing={editing} initialPayType={createPayType} onClose={() => setVisible(false)} />
      <TransactionActionSheet transaction={actionTarget} onClose={() => setActionTarget(null)} onEdit={openEdit} />
    </TransactionSheetContext.Provider>
  );
}

export function useTransactionSheet() {
  const ctx = useContext(TransactionSheetContext);
  if (!ctx) throw new Error('useTransactionSheet은 TransactionSheetProvider 안에서만 쓸 수 있습니다');
  return ctx;
}
