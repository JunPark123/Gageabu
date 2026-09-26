import { PropsWithChildren, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme/ThemeProvider';
import { MonthSwipe } from './MonthSwipe';

interface ScreenProps {
  onRefresh?: () => Promise<unknown>;   // 주면 당겨서 새로고침
  onSwipeMonth?: (delta: -1 | 1) => void; // 주면 본문 좌우 스와이프로 달 이동
}

// 탭 화면 공통 틀: 크림색 바탕 + 상단 안전 영역 + 스크롤
export function Screen({ children, onRefresh, onSwipeMonth }: PropsWithChildren<ScreenProps>) {
  const { colors, spacing } = useTheme();
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState(false);

  const refresh = onRefresh
    ? async () => {
        setRefreshing(true);
        try {
          await onRefresh();
        } finally {
          setRefreshing(false);
        }
      }
    : undefined;

  const content = (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.lg, paddingHorizontal: spacing.xl, paddingBottom: spacing.xxl * 2 }]}
      refreshControl={refresh ? <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.textSecondary} /> : undefined}
      keyboardShouldPersistTaps="handled"
    >
      {children}
    </ScrollView>
  );

  if (!onSwipeMonth) return content;
  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <MonthSwipe onPrev={() => onSwipeMonth(-1)} onNext={() => onSwipeMonth(1)}>
        {content}
      </MonthSwipe>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { gap: 16 },
});
