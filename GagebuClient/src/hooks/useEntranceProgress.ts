import { useEffect, useRef, useState } from 'react';
import { Animated, Easing } from 'react-native';
import { useReducedMotion } from './useReducedMotion';

// 화면 진입 또는 표시 데이터가 바뀔 때 0→1. 비활성 페이지는 완성된 상태로 둔다.
export function useEntranceProgress(active: boolean, trigger: number | string, duration = 650) {
  const reduced = useReducedMotion();
  const animated = useRef(new Animated.Value(active ? 0 : 1)).current;
  const [progress, setProgress] = useState(active ? 0 : 1);

  useEffect(() => {
    const listener = animated.addListener(({ value }) => setProgress(value));
    return () => animated.removeListener(listener);
  }, [animated]);

  useEffect(() => {
    animated.stopAnimation();
    if (!active || reduced) {
      animated.setValue(1);
      return;
    }
    animated.setValue(0);
    const animation = Animated.timing(animated, {
      toValue: 1,
      duration,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    });
    animation.start();
    return () => animation.stop();
  }, [active, animated, duration, reduced, trigger]);

  return progress;
}
