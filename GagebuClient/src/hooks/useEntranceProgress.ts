import { useEffect, useRef, useState } from 'react';
import { Animated, Easing } from 'react-native';
import { useReducedMotion } from './useReducedMotion';

// 옆 페이지는 0에서 대기하고, 선택된 뒤에만 0→1로 재생한다.
export function useEntranceProgress(active: boolean, trigger: number | string, duration = 650) {
  const reduced = useReducedMotion();
  const animated = useRef(new Animated.Value(0)).current;
  const key = `${active}:${trigger}`;
  const [frame, setFrame] = useState({ key, progress: 0 });

  useEffect(() => {
    animated.stopAnimation();
    if (!active || reduced) {
      setFrame({ key, progress: reduced ? 1 : 0 });
      return;
    }
    animated.setValue(0);
    setFrame({ key, progress: 0 });
    const listener = animated.addListener(({ value }) => setFrame({ key, progress: value }));
    const animation = Animated.timing(animated, {
      toValue: 1,
      duration,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    });
    animation.start();
    return () => {
      animation.stop();
      animated.removeListener(listener);
    };
  }, [active, animated, duration, key, reduced]);

  // 데이터가 도착하거나 탭이 다시 활성화된 첫 렌더에서도 완성된 프레임이 비치지 않게 한다.
  return reduced ? 1 : !active ? 0 : frame.key === key ? frame.progress : 0;
}
