import { toKst } from './date';

export const FIRST_MONTH = 2000 * 12;
export function lastSelectableMonth() {
  const now = toKst();
  return now.year() * 12 + now.month() + 60;
}

export function clampMonth(year: number, monthIndex: number) {
  const total = Math.min(lastSelectableMonth(), Math.max(FIRST_MONTH, year * 12 + monthIndex));
  return { year: Math.floor(total / 12), monthIndex: total % 12 };
}
