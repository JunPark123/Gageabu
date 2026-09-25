import { formatKst, kstDateRange, kstMonthRange, withYmd } from '../date';

describe('KST 구간 → UTC [from, to)', () => {
  it('하루', () => {
    expect(kstDateRange('2026-09-25', '2026-09-25')).toEqual({
      from: '2026-09-24T15:00:00.000Z',
      to: '2026-09-25T15:00:00.000Z',
    });
  });
  it('월 (연말·연초 넘어감)', () => {
    expect(kstMonthRange(2026, 11)).toEqual({ from: '2026-11-30T15:00:00.000Z', to: '2026-12-31T15:00:00.000Z' });
    expect(kstMonthRange(2026, 0)).toEqual({ from: '2025-12-31T15:00:00.000Z', to: '2026-01-31T15:00:00.000Z' });
  });
});

describe('formatKst', () => {
  it('UTC → KST 표시', () => {
    expect(formatKst('2026-09-24T23:00:00+00:00')).toBe('2026.09.25 08:00');
  });
});

describe('withYmd', () => {
  it('시각은 두고 날짜만 바꿈 (월말 넘침 없이)', () => {
    const base = new Date(2026, 0, 31, 21, 30);
    const next = withYmd(base, '2026-02-15');
    expect([next.getFullYear(), next.getMonth(), next.getDate(), next.getHours(), next.getMinutes()]).toEqual([2026, 1, 15, 21, 30]);
  });
});
