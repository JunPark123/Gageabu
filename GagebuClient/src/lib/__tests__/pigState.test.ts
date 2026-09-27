import { budgetPercent, displayPercent, pigStatus } from '../pigState';

describe('budgetPercent', () => {
  it('쓴 돈 / 예산', () => {
    expect(budgetPercent(0, 3000000)).toBe(0);
    expect(budgetPercent(2310000, 3000000)).toBeCloseTo(77);
    expect(budgetPercent(3600000, 3000000)).toBeCloseTo(120);
  });

  it.each([
    [1000, 0],
    [1000, null],
    [1000, undefined],
    [1000, -5000],
    [null, 3000],
    [-1, 3000],
    [NaN, 3000],
    [1000, Infinity],
  ])('계산할 수 없으면 null (%p / %p)', (spent, budget) => {
    expect(budgetPercent(spent, budget)).toBeNull();
  });
});

describe('pigStatus', () => {
  it.each([
    [0, 'wealthy', 'happy'],
    [60, 'wealthy', 'happy'],
    [69.9, 'wealthy', 'happy'],
    [70, 'normal', 'concerned'],
    [77, 'normal', 'concerned'],
    [90, 'normal', 'concerned'],
    [100, 'normal', 'concerned'],
    [100.1, 'hungry', 'crying'],
    [120, 'hungry', 'crying'],
  ])('%p%% 사용 → 메인 %s, 얼굴 %s', (pct, main, face) => {
    const s = pigStatus(1000, pct * 10);
    expect(s).toMatchObject({ main, face });
  });

  it('100% 넘으면 숫자는 그대로, 위치는 끝에 고정', () => {
    const s = pigStatus(3000000, 3600000)!;
    expect(s.percent).toBeCloseTo(120);
    expect(s.position).toBe(100);
    expect(pigStatus(1000, 600)!.position).toBeCloseTo(60);
  });

  it('예산이 없거나 0이면 상태 미정', () => {
    expect(pigStatus(null, 5000)).toBeNull();
    expect(pigStatus(0, 5000)).toBeNull();
    expect(pigStatus(0, 0)).toBeNull();
  });
});

describe('displayPercent', () => {
  it('경계에서 표정과 숫자가 맞게', () => {
    expect(displayPercent(0)).toBe(0);
    expect(displayPercent(59.99)).toBe(60);
    expect(displayPercent(69.9)).toBe(69);
    expect(displayPercent(70)).toBe(70);
    expect(displayPercent(77.4)).toBe(77);
    expect(displayPercent(77.6)).toBe(78);
    expect(displayPercent(100)).toBe(100);
    expect(displayPercent(100.2)).toBe(101);
    expect(displayPercent(120.00002)).toBe(120);
  });
});
