import { Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeProvider';

interface MonthSwitcherProps {
  year: number;
  monthIndex: number;     // 0~11
  onPrev: () => void;
  onNext: () => void;
  size?: 'md' | 'lg';
}

// ‹ 2026년 9월 ›
export function MonthSwitcher({ year, monthIndex, onPrev, onNext, size = 'md' }: MonthSwitcherProps) {
  return <Switcher label={`${year}년 ${monthIndex + 1}월`} unit="달" onPrev={onPrev} onNext={onNext} size={size} />;
}

// ‹ 2026년 ›
MonthSwitcher.Year = function YearSwitcher({ year, onPrev, onNext }: { year: number; onPrev: () => void; onNext: () => void }) {
  return <Switcher label={`${year}년`} unit="해" onPrev={onPrev} onNext={onNext} size="lg" />;
};

function Switcher({ label, unit, onPrev, onNext, size }: { label: string; unit: string; onPrev: () => void; onNext: () => void; size: 'md' | 'lg' }) {
  const { colors, typography } = useTheme();
  const iconSize = size === 'lg' ? 24 : 20;
  return (
    <View style={styles.row}>
      <Pressable onPress={onPrev} hitSlop={10} accessibilityLabel={`이전 ${unit}`}>
        <MaterialCommunityIcons name="chevron-left" size={iconSize} color={colors.text} />
      </Pressable>
      <Text style={[size === 'lg' ? typography.heading : typography.bodyBold, { color: colors.text }]}>{label}</Text>
      <Pressable onPress={onNext} hitSlop={10} accessibilityLabel={`다음 ${unit}`}>
        <MaterialCommunityIcons name="chevron-right" size={iconSize} color={colors.text} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
});
