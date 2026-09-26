import { createContext, PropsWithChildren, useContext } from 'react';
import { StyleProp, View, ViewStyle } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { SharedValue, useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

// 스와이프를 끝내고 손을 뗀 자리의 카드가 "눌림"으로 처리되지 않게, 직후 잠깐은 누름을 무시한다
let lastSwipeAt = 0;
const markSwiped = () => { lastSwipeAt = Date.now(); };
export const justSwiped = () => Date.now() - lastSwipeAt < 350;

const SLIDE = 80; // 달이 넘어갈 때 내용이 밀려나는 거리

const OffsetContext = createContext<SharedValue<number> | null>(null);

interface MonthSwipeProps {
  onPrev: () => void;   // 오른쪽으로 밀기 → 이전 달
  onNext: () => void;   // 왼쪽으로 밀기 → 다음 달
  enabled?: boolean;
}

// 좌우 스와이프로 달 이동. 스와이프는 화면 어디서 해도 되고,
// 움직이는 건 <MonthSwipeContent>로 감싼 "달에 따라 바뀌는 부분"뿐 (제목·월 표시는 고정)
// 세로 스크롤과 안 겹치게 가로로 확실히 움직일 때만 잡는다.
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
      const commit = Math.abs(e.translationX) > 70 || Math.abs(e.velocityX) > 600;
      if (!commit) {
        offset.value = withSpring(0, { damping: 18, stiffness: 180 });
        return;
      }
      // 밀던 방향으로 빠져나감 → 달 변경 → 반대편에서 들어옴
      const dir = e.translationX < 0 ? -1 : 1;
      offset.value = withTiming(dir * SLIDE, { duration: 110 }, (finished) => {
        if (!finished) return;
        scheduleOnRN(dir < 0 ? onNext : onPrev);
        offset.value = -dir * SLIDE;
        offset.value = withTiming(0, { duration: 180 });
      });
    });

  return (
    <OffsetContext.Provider value={offset}>
      <GestureDetector gesture={pan}>
        <View style={{ flex: 1 }}>{children}</View>
      </GestureDetector>
    </OffsetContext.Provider>
  );
}

// 달에 따라 바뀌는 부분 (카드·달력·목록). MonthSwipe 밖에서는 그냥 View
export function MonthSwipeContent({ style, children }: PropsWithChildren<{ style?: StyleProp<ViewStyle> }>) {
  const offset = useContext(OffsetContext);
  const animated = useAnimatedStyle(() => {
    const x = offset ? offset.value : 0;
    return {
      transform: [{ translateX: x }],
      opacity: 1 - Math.min(Math.abs(x) / (SLIDE * 1.6), 0.6),
    };
  });
  return <Animated.View style={[style, animated]}>{children}</Animated.View>;
}
