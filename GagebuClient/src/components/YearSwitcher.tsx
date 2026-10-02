import { Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeProvider';

// ‹ 2026년 › — 월 선택 시트의 연도 이동
export function YearSwitcher({ year, onPrev, onNext, prevDisabled, nextDisabled }: { year: number; onPrev: () => void; onNext: () => void; prevDisabled?: boolean; nextDisabled?: boolean }) {
  const { colors, typography } = useTheme();
  return (
    <View style={styles.row}>
      <Pressable onPress={onPrev} disabled={prevDisabled} style={prevDisabled && { opacity: 0.35 }} hitSlop={10} accessibilityRole="button" accessibilityState={{ disabled: prevDisabled }} accessibilityLabel="이전 해">
        <MaterialCommunityIcons name="chevron-left" size={24} color={colors.text} />
      </Pressable>
      <Text style={[typography.heading, { color: colors.text }]}>{year}년</Text>
      <Pressable onPress={onNext} disabled={nextDisabled} style={nextDisabled && { opacity: 0.35 }} hitSlop={10} accessibilityRole="button" accessibilityState={{ disabled: nextDisabled }} accessibilityLabel="다음 해">
        <MaterialCommunityIcons name="chevron-right" size={24} color={colors.text} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
});
