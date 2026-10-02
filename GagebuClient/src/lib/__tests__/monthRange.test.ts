import { clampMonth, FIRST_MONTH, lastSelectableMonth } from '../monthRange';

describe('shared month navigation bounds', () => {
  it('clamps earlier dates to the first pager page', () => {
    expect(clampMonth(1999, 11)).toEqual({ year: FIRST_MONTH / 12, monthIndex: 0 });
  });
  it('clamps later dates to the last pager page', () => {
    const last = lastSelectableMonth();
    expect(clampMonth(9999, 0)).toEqual({ year: Math.floor(last / 12), monthIndex: last % 12 });
  });
  it('normalizes year transitions within bounds', () => {
    expect(clampMonth(2025, 12)).toEqual({ year: 2026, monthIndex: 0 });
    expect(clampMonth(2026, -1)).toEqual({ year: 2025, monthIndex: 11 });
  });
});
