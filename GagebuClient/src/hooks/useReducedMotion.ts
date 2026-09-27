import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

// 기기의 '움직임 줄이기' 설정 — 켜져 있으면 애니메이션 없이 바로 바꾼다
export function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    let alive = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((v) => alive && setReduced(v))
      .catch(() => {});
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduced);
    return () => {
      alive = false;
      sub.remove();
    };
  }, []);
  return reduced;
}
