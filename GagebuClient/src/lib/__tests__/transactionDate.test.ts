import { formatKst } from '../date';
import { dateForSelectedMonth, updateTransactionDate } from '../transactionDate';

describe('new transaction date follows the selected month', () => {
  const now = new Date('2026-10-02T14:20:00.000Z');
  it('keeps today and the time for the current KST month', () => {
    expect(dateForSelectedMonth(2026, 9, now).toISOString()).toBe(now.toISOString());
  });
  it.each([[2026, 7, '2026-08-01 23:20'], [2026, 10, '2026-11-01 23:20'], [2025, 11, '2025-12-01 23:20']])(
    'uses day one for %s/%s', (year, month, expected) => {
      expect(formatKst(dateForSelectedMonth(year, month, now), 'YYYY-MM-DD HH:mm')).toBe(expected);
    },
  );
  it('uses the KST month even when UTC is still in the previous month', () => {
    const boundary = new Date('2026-09-30T15:05:00Z');
    expect(dateForSelectedMonth(2026, 9, boundary).toISOString()).toBe(boundary.toISOString());
  });
  it('clamps the day for February, including leap years', () => {
    expect(formatKst(updateTransactionDate(new Date('2026-01-31T03:00:00Z'), { month: 1 }), 'YYYY-MM-DD')).toBe('2026-02-28');
    expect(formatKst(updateTransactionDate(new Date('2024-01-31T03:00:00Z'), { month: 1 }), 'YYYY-MM-DD')).toBe('2024-02-29');
  });
  it('preserves the selected KST date at midnight', () => {
    const result = updateTransactionDate(now, { year: 2025, month: 7, day: 5, hour: 0, minute: 10 });
    expect(result.toISOString()).toBe('2025-08-04T15:10:00.000Z');
  });
});
