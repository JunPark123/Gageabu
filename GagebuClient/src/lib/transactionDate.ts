import { toKst } from './date';

// 월 탐색과 저장 날짜 모두 KST를 사용한다. 다른 달의 일자는 추측하지 않고 1일부터 입력한다.
export function dateForSelectedMonth(year: number, monthIndex: number, now = new Date()) {
  const today = toKst(now);
  if (today.year() === year && today.month() === monthIndex) return new Date(now);
  return updateTransactionDate(now, { year, month: monthIndex, day: 1 });
}

export function updateTransactionDate(value: Date, patch: { year?: number; month?: number; day?: number; hour?: number; minute?: number }) {
  const current = toKst(value);
  const year = patch.year ?? current.year();
  const month = patch.month ?? current.month();
  const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const day = Math.min(patch.day ?? current.date(), lastDay);
  return new Date(Date.UTC(year, month, day, (patch.hour ?? current.hour()) - 9, patch.minute ?? current.minute()));
}
