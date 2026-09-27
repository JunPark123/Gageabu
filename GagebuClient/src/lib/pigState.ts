// 예산 사용률에 따른 돼지 상태 (그림은 src/components/Pig.tsx, 원본은 docs/design/pig-react-kit)
// 정책: 예산 대비 쓴 돈 70% 미만 = 여유, 70~100% = 계획대로, 100% 초과 = 예산 넘음
//   메인(요약 카드): wealthy / normal / hungry
//   바 얼굴:        happy   / concerned / crying
// 예산이 없거나 0이면, 또는 값이 이상하면 상태 미정(null)

export type PigMainState = 'wealthy' | 'normal' | 'hungry';
export type PigFaceState = 'happy' | 'concerned' | 'crying';

export const CONCERNED_AT = 70; // % 이상이면 걱정
export const OVER_AT = 100;     // % 초과면 예산 넘음

export interface PigStatus {
  percent: number;   // 실제 사용률 (100 넘을 수 있음)
  position: number;  // 바에 그릴 위치 0~100
  main: PigMainState;
  face: PigFaceState;
}

// 쓴 돈 / 예산 (%) — 계산할 수 없으면 null
export function budgetPercent(spent: number | null | undefined, budget: number | null | undefined): number | null {
  if (spent == null || budget == null) return null;
  if (!Number.isFinite(spent) || !Number.isFinite(budget) || spent < 0 || budget <= 0) return null;
  const percent = (spent / budget) * 100;
  return Number.isFinite(percent) ? percent : null;
}

export function pigStatus(budget: number | null | undefined, spent: number | null | undefined): PigStatus | null {
  const percent = budgetPercent(spent, budget);
  if (percent === null) return null;
  const level = percent > OVER_AT ? 2 : percent >= CONCERNED_AT ? 1 : 0;
  return {
    percent,
    position: Math.min(100, percent),
    main: (['wealthy', 'normal', 'hungry'] as const)[level],
    face: (['happy', 'concerned', 'crying'] as const)[level],
  };
}

// 화면에 보일 정수 % — 보통은 반올림, 경계에서만 표정과 숫자가 어긋나지 않게 보정
// (69.7% → 69 아직 여유, 100.2% → 101 넘음)
export function displayPercent(percent: number): number {
  const rounded = Math.round(percent);
  if (percent > OVER_AT) return Math.max(rounded, OVER_AT + 1);
  if (percent < CONCERNED_AT) return Math.min(rounded, CONCERNED_AT - 1);
  return rounded;
}
