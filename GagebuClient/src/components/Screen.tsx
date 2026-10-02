import { PropsWithChildren, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Keyboard, KeyboardEvent, Platform, RefreshControl, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useScrollTopOnTabLeave } from '../lib/tabLeave';
import { useTheme } from '../theme/ThemeProvider';

interface ScreenProps {
  onRefresh?: () => Promise<unknown>;   // 주면 당겨서 새로고침
  includeTopInset?: boolean; // 상단 네비게이션 헤더가 있으면 안전 영역을 중복 적용하지 않는다
  // 키보드가 입력란을 가리지 않게 (입력란이 있는 화면)
  avoidKeyboard?: boolean;
  // 입력란 아래로 더 보여야 하는 높이 (예: 입력란 밑의 확인 버튼)
  keyboardExtraSpace?: number;
}

// 달 넘김이 없는 탭 화면(설정 등): 크림색 바탕 + 상단 안전 영역 + 스크롤 하나
export function Screen({ children, onRefresh, includeTopInset = true, avoidKeyboard = false, keyboardExtraSpace = 96 }: PropsWithChildren<ScreenProps>) {
  const { colors, spacing } = useTheme();
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  const scrollY = useRef(0);
  const keyboardTop = useRef<number | null>(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const refreshControl = useRefreshControl(onRefresh);
  useScrollTopOnTabLeave(scrollRef);

  // 키보드 자동 조정(KeyboardAvoidingView)은 Android edge-to-edge에서 높이를 잘못 잡아 입력란이 가려졌다.
  // 대신: 키보드 높이만큼 아래 여백을 더하고, 포커스된 입력란의 실제 화면 위치를 재서 키보드 위로 올라올 만큼만 스크롤한다
  const reveal = () => {
    const input = TextInput.State.currentlyFocusedInput?.() as unknown as View | null;
    const top = keyboardTop.current;
    if (!input || top === null || typeof input.measureInWindow !== 'function') return;
    input.measureInWindow((_x, y, _w, h) => {
      const overlap = y + h + keyboardExtraSpace - top;
      if (overlap > 0) scrollRef.current?.scrollTo({ y: scrollY.current + overlap, animated: true });
    });
  };

  useEffect(() => {
    if (!avoidKeyboard || Platform.OS === 'web') return;
    const onShow = (e: KeyboardEvent) => {
      keyboardTop.current = e.endCoordinates.screenY;
      setKeyboardHeight(e.endCoordinates.height);
      // 여백이 붙은 뒤에 재야 스크롤할 공간이 있다
      setTimeout(reveal, 60);
    };
    const onHide = () => {
      keyboardTop.current = null;
      setKeyboardHeight(0);
    };
    const subs = [
      Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow', onShow),
      Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide', onHide),
    ];
    return () => subs.forEach((s) => s.remove());
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reveal은 ref만 읽는다
  }, [avoidKeyboard]);

  return (
    <ScrollView
      ref={scrollRef}
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={[
        styles.content,
        { paddingTop: (includeTopInset ? insets.top : 0) + spacing.lg, paddingHorizontal: spacing.xl, paddingBottom: spacing.xxl * 2 + keyboardHeight },
      ]}
      refreshControl={refreshControl}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
      onScroll={(e) => {
        scrollY.current = e.nativeEvent.contentOffset.y;
      }}
      scrollEventThrottle={32}
      // 키보드가 떠 있는 채로 다른 입력란을 누른 경우
      onFocus={avoidKeyboard ? () => setTimeout(reveal, 120) : undefined}
    >
      {children}
    </ScrollView>
  );
}

// 달 넘김이 있는 탭 화면(홈·내역·통계)의 틀: [고정 머리] + [달별 페이지]
// 나중에 "내리면 접히는 머리"(docs/PLAN.md 2.5단계 C안)를 넣을 때는
// ScreenHeader와 MonthPageScroll 두 곳만 고치면 되도록 여기로 모아 둔다
export function PagedScreen({ children }: PropsWithChildren) {
  const { colors } = useTheme();
  return <View style={{ flex: 1, backgroundColor: colors.background }}>{children}</View>;
}

// 위에 고정되는 머리 (제목·월 표시·필터 등)
export function ScreenHeader({ children }: PropsWithChildren) {
  const { spacing } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.header, { paddingTop: insets.top + spacing.lg, paddingHorizontal: spacing.xl, paddingBottom: spacing.md }]}>
      {children}
    </View>
  );
}

// 달별 페이지 안의 세로 스크롤
export function MonthPageScroll({ children, onRefresh, includeTopInset = false, isCurrent = true }: PropsWithChildren<ScreenProps & { isCurrent?: boolean }>) {
  const { spacing } = useTheme();
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  useScrollTopOnTabLeave(scrollRef);
  // 옆 달로 떠날 때 초기화해, 돌아오는 페이지가 보이는 순간부터 맨 위가 보이게 한다.
  useLayoutEffect(() => {
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  }, [isCurrent]);
  return (
    <ScrollView
      ref={scrollRef}
      style={{ flex: 1 }}
      contentContainerStyle={[styles.content, { paddingTop: spacing.xs + (includeTopInset ? insets.top + spacing.lg : 0), paddingHorizontal: spacing.xl, paddingBottom: spacing.xxl * 2 }]}
      refreshControl={useRefreshControl(onRefresh)}
      keyboardShouldPersistTaps="handled"
    >
      {children}
    </ScrollView>
  );
}

function useRefreshControl(onRefresh?: () => Promise<unknown>) {
  const { colors } = useTheme();
  const [refreshing, setRefreshing] = useState(false);
  if (!onRefresh) return undefined;
  const refresh = async () => {
    setRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setRefreshing(false);
    }
  };
  return <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.textSecondary} />;
}

const styles = StyleSheet.create({
  content: { gap: 16 },
  header: { gap: 12 },
});
