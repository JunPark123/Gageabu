import { createContext, PropsWithChildren, useCallback, useContext, useMemo, useState } from 'react';
import { toKst } from '../lib/date';
import { clampMonth } from '../lib/monthRange';

// 홈·내역·통계가 같이 보는 "선택한 달" (KST 기준)
interface MonthContextValue {
  year: number;
  monthIndex: number;               // 0~11
  setMonth: (year: number, monthIndex: number) => void;
  shiftMonth: (delta: number) => void;
  isCurrentMonth: boolean;
}

const MonthContext = createContext<MonthContextValue | null>(null);

const currentKstMonth = () => {
  const now = toKst();
  return { year: now.year(), monthIndex: now.month() };
};

export function MonthProvider({ children }: PropsWithChildren) {
  const [month, setMonthState] = useState(currentKstMonth);

  const setMonth = useCallback((year: number, monthIndex: number) => setMonthState((previous) => {
    const next = clampMonth(year, monthIndex);
    return previous.year === next.year && previous.monthIndex === next.monthIndex ? previous : next;
  }), []);
  const shiftMonth = useCallback((delta: number) => {
    setMonthState(({ year, monthIndex }) => {
      return clampMonth(year, monthIndex + delta);
    });
  }, []);

  const value = useMemo(() => {
    const now = currentKstMonth();
    return {
      ...month,
      setMonth,
      shiftMonth,
      isCurrentMonth: now.year === month.year && now.monthIndex === month.monthIndex,
    };
  }, [month, setMonth, shiftMonth]);

  return <MonthContext.Provider value={value}>{children}</MonthContext.Provider>;
}

export function useSelectedMonth() {
  const ctx = useContext(MonthContext);
  if (!ctx) throw new Error('useSelectedMonth는 MonthProvider 안에서만 쓸 수 있습니다');
  return ctx;
}
