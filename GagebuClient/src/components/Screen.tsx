import { PropsWithChildren, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeProvider';

interface ScreenProps {
  onRefresh?: () => Promise<unknown>;   // 주면 당겨서 새로고침
}

// 달 넘김이 없는 탭 화면(설정 등): 크림색 바탕 + 상단 안전 영역 + 스크롤 하나
export function Screen({ children, onRefresh }: PropsWithChildren<ScreenProps>) {
  const { colors, spacing } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.lg, paddingHorizontal: spacing.xl, paddingBottom: spacing.xxl * 2 }]}
      refreshControl={useRefreshControl(onRefresh)}
      keyboardShouldPersistTaps="handled"
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
export function MonthPageScroll({ children, onRefresh }: PropsWithChildren<ScreenProps>) {
  const { spacing } = useTheme();
  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={[styles.content, { paddingTop: spacing.xs, paddingHorizontal: spacing.xl, paddingBottom: spacing.xxl * 2 }]}
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
