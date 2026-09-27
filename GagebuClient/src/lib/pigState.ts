// 예산 사용률에 따른 돼지 상태 (그림은 src/components/Pig.tsx, 원본은 docs/design/pig-react-kit)
// 정책: 70% 미만 = 여유, 70~90% = 계획대로, 90% 초과 = 주의, 100% 이상 = 예산 초과
//   메인(요약 카드): wealthy / normal / hungry
//   바 얼굴:        happy   / concerned / crying
// 예산이 없거나 0이면, 또는 값이 이상하면 상태 미정(null)

export type PigMainState = 'wealthy' | 'normal' | 'hungry';
export type PigFaceState = 'happy' | 'concerned' | 'crying';
export type PigBudgetState = PigMainState | 'overBudget';

export const CONCERNED_AT = 70; // % 이상이면 걱정
export const HUNGRY_OVER = 90; // % 초과면 배고픈 돼지
export const OVER_AT = 100;    // % 이상이면 예산 초과 문구

export interface PigStatus {
  percent: number;   // 실제 사용률 (100 넘을 수 있음)
  position: number;  // 바에 그릴 위치 0~100
  main: PigMainState;
  face: PigFaceState;
  status: PigBudgetState; // 그림은 같아도 예산 주의/초과 문구는 구분
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
  const level = percent > HUNGRY_OVER ? 2 : percent >= CONCERNED_AT ? 1 : 0;
  const main = (['wealthy', 'normal', 'hungry'] as const)[level];
  return {
    percent,
    position: Math.min(100, percent),
    main,
    face: (['happy', 'concerned', 'crying'] as const)[level],
    status: percent >= OVER_AT ? 'overBudget' : main,
  };
}

// 화면에 보일 정수 % — 보통은 반올림, 경계에서만 표정과 숫자가 어긋나지 않게 보정
// (69.7% → 69 아직 여유, 90.1% → 91 주의, 99.9% → 99 아직 예산 안)
export function displayPercent(percent: number): number {
  const rounded = Math.round(percent);
  if (percent >= OVER_AT) return Math.max(rounded, OVER_AT);
  if (percent > HUNGRY_OVER) return Math.min(Math.max(rounded, HUNGRY_OVER + 1), OVER_AT - 1);
  if (percent < CONCERNED_AT) return Math.min(rounded, CONCERNED_AT - 1);
  return rounded;
}
