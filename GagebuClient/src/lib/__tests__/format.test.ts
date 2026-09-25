import { compactWon, dayHeaderLabel, formatWon, koreanWon, monthDayWeekdayLabel, relativeDayLabel } from '../format';

describe('formatWon', () => {
  it('천 단위 쉼표와 부호', () => {
    expect(formatWon(3522600)).toBe('₩3,522,600');
    expect(formatWon(-11800)).toBe('-₩11,800');
    expect(formatWon(35000, { sign: true })).toBe('+₩35,000');
    expect(formatWon(0, { sign: true })).toBe('₩0');
  });
});

describe('koreanWon', () => {
  it.each([
    [0, '영 원'],
    [1500, '천오백 원'],
    [10000, '만 원'],
    [18000, '만 팔천 원'],
    [110000, '십일만 원'],
    [3522600, '삼백오십이만 이천육백 원'],
    [100000000, '일억 원'],
    [120050000, '일억 이천오만 원'],
  ])('%d → %s', (n, expected) => {
    expect(koreanWon(n)).toBe(expected);
  });
});

describe('compactWon', () => {
  it.each([
    [9700, '9,700'],
    [29800, '3만'],
    [35000, '3.5만'],
    [5805000, '581만'],
    [-116020, '-11.6만'],
    [120000000, '1.2억'],
  ])('%d → %s', (n, expected) => {
    expect(compactWon(n)).toBe(expected);
  });
});

describe('날짜 라벨 (KST 기준)', () => {
  const now = '2026-09-24T12:00:00Z'; // KST 9/24 21:00
  it('오늘/어제/날짜', () => {
    expect(relativeDayLabel('2026-09-23T23:42:00Z', now)).toBe('오늘');   // KST 9/24 08:42
    expect(relativeDayLabel('2026-09-23T03:10:00Z', now)).toBe('어제');
    expect(relativeDayLabel('2026-09-21T03:10:00Z', now)).toBe('9월 21일');
  });
  it('요일', () => {
    expect(dayHeaderLabel('2026-09-23T23:42:00Z')).toBe('24일 목요일');
    expect(monthDayWeekdayLabel('2026-09-24T01:00:00Z')).toBe('9월 24일 (목)');
  });
});
