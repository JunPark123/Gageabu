import { useLayoutEffect } from 'react';
import { cancelAnimation, Easing, useSharedValue, withTiming } from 'react-native-reanimated';
import { useReducedMotion } from './useReducedMotion';

// 차트 프레임은 UI 런타임에서 처리한다. React 상태 업데이트/렌더가 필요 없다.
export function useChartProgress(active: boolean, trigger: number | string) {
  const reduced = useReducedMotion();
  const progress = useSharedValue(0);
  useLayoutEffect(() => {
    cancelAnimation(progress);
    progress.value = reduced ? 1 : 0;
    if (active && !reduced) {
      progress.value = withTiming(1, { duration: 650, easing: Easing.out(Easing.cubic) });
    }
    return () => cancelAnimation(progress);
  }, [active, trigger, reduced, progress]);
  return progress;
}
