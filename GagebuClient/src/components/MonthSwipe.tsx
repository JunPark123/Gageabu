import { PropsWithChildren } from 'react';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

// 스와이프를 끝내고 손을 뗀 자리의 카드가 "눌림"으로 처리되지 않게, 직후 잠깐은 누름을 무시한다
let lastSwipeAt = 0;
const markSwiped = () => { lastSwipeAt = Date.now(); };
export const justSwiped = () => Date.now() - lastSwipeAt < 350;

interface MonthSwipeProps {
  onPrev: () => void;   // 오른쪽으로 밀기 → 이전 달
  onNext: () => void;   // 왼쪽으로 밀기 → 다음 달
  enabled?: boolean;
}

// 본문 좌우 스와이프로 달 이동. 세로 스크롤과 안 겹치게 가로로 확실히 움직일 때만 잡는다
// (하단 탭은 누르기로만 바뀌므로 탭 전환 스와이프와 충돌 없음 — docs/PLAN.md 2.5단계 결정)
export function MonthSwipe({ onPrev, onNext, enabled = true, children }: PropsWithChildren<MonthSwipeProps>) {
  const offset = useSharedValue(0);

  const pan = Gesture.Pan()
    .enabled(enabled)
    .activeOffsetX([-20, 20])
    .failOffsetY([-12, 12])
    .onStart(() => {
      scheduleOnRN(markSwiped);
    })
    .onUpdate((e) => {
      offset.value = e.translationX * 0.35; // 손가락을 살짝 따라오게
    })
    .onEnd((e) => {
      scheduleOnRN(markSwiped);
      if (Math.abs(e.translationX) > 70 || Math.abs(e.velocityX) > 600) {
        scheduleOnRN(e.translationX < 0 ? onNext : onPrev);
      }
      offset.value = withSpring(0, { damping: 18, stiffness: 180 });
    });

  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: offset.value }],
    opacity: 1 - Math.min(Math.abs(offset.value) / 300, 0.3),
  }));

  return (
    <GestureDetector gesture={pan}>
      <Animated.View style={[{ flex: 1 }, style]}>{children}</Animated.View>
    </GestureDetector>
  );
}
