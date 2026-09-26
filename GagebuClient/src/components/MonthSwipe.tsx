import { createContext, PropsWithChildren, useContext } from 'react';
import { StyleProp, useWindowDimensions, View, ViewStyle } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { Easing, SharedValue, useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

// 스와이프를 끝내고 손을 뗀 자리의 카드가 "눌림"으로 처리되지 않게, 직후 잠깐은 누름을 무시한다
let lastSwipeAt = 0;
const markSwiped = () => { lastSwipeAt = Date.now(); };
export const justSwiped = () => Date.now() - lastSwipeAt < 350;

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
  const { width } = useWindowDimensions();

  // 화면 밖으로 나간 상태에서 달을 바꾸고, 새 달이 그려진 다음 반대편에서 들어오게 한다
  // (먼저 들어오기 시작하면 지난달 내용이 잠깐 보였다가 바뀌어서 끊겨 보임)
  const changeMonth = (dir: number) => {
    (dir < 0 ? onNext : onPrev)();
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        offset.value = -dir * width;
        offset.value = withTiming(0, { duration: 220, easing: Easing.out(Easing.cubic) });
      })
    );
  };

  const pan = Gesture.Pan()
    .enabled(enabled)
    .activeOffsetX([-20, 20])
    .failOffsetY([-12, 12])
    .onStart(() => {
      scheduleOnRN(markSwiped);
    })
    .onUpdate((e) => {
      offset.value = e.translationX; // 손가락을 그대로 따라옴
    })
    .onEnd((e) => {
      scheduleOnRN(markSwiped);
      const commit = Math.abs(e.translationX) > width * 0.25 || Math.abs(e.velocityX) > 500;
      if (!commit) {
        offset.value = withSpring(0, { damping: 20, stiffness: 220 });
        return;
      }
      const dir = e.translationX < 0 ? -1 : 1;
      offset.value = withTiming(dir * width, { duration: 160, easing: Easing.out(Easing.quad) }, (finished) => {
        if (finished) scheduleOnRN(changeMonth, dir);
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
// 투명도는 바꾸지 않는다: Android에서 그림자(elevation) 있는 카드를 반투명하게 하면 검은 테두리가 생김
export function MonthSwipeContent({ style, children }: PropsWithChildren<{ style?: StyleProp<ViewStyle> }>) {
  const offset = useContext(OffsetContext);
  const animated = useAnimatedStyle(() => ({
    transform: [{ translateX: offset ? offset.value : 0 }],
  }));
  return <Animated.View style={[style, animated]}>{children}</Animated.View>;
}
