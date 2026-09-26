import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { toKst } from '../lib/date';
import { useSelectedMonth } from '../store/month';
import { Theme, useTheme, useThemedStyles } from '../theme/ThemeProvider';
import { MonthPickerSheet } from './MonthPickerSheet';

interface MonthNavigatorProps {
  size?: 'md' | 'lg';
  showThisMonth?: boolean;   // 다른 달을 볼 때 "이번 달" 버튼
  onChange?: () => void;     // 달이 바뀐 뒤 (예: 선택한 날짜 해제)
}

// ‹ 2026년 9월 › ⌄ — 화살표로 한 달씩, ⌄(또는 월 글자)를 누르면 월 선택 시트. 홈·내역·통계가 같은 달을 공유
export function MonthNavigator({ size = 'md', showThisMonth, onChange }: MonthNavigatorProps) {
  const styles = useThemedStyles(makeStyles);
  const { colors, typography } = useTheme();
  const { year, monthIndex, shiftMonth, setMonth, isCurrentMonth } = useSelectedMonth();
  const [pickerVisible, setPickerVisible] = useState(false);
  const iconSize = size === 'lg' ? 24 : 20;

  const shift = (delta: number) => {
    shiftMonth(delta);
    onChange?.();
  };

  return (
    <View style={styles.row}>
      <Pressable onPress={() => shift(-1)} hitSlop={10} accessibilityLabel="이전 달">
        <MaterialCommunityIcons name="chevron-left" size={iconSize} color={colors.text} />
      </Pressable>
      <Pressable onPress={() => setPickerVisible(true)} hitSlop={6} accessibilityRole="button" accessibilityLabel={`${year}년 ${monthIndex + 1}월, 월 선택`}>
        <Text style={[size === 'lg' ? typography.heading : typography.bodyBold, { color: colors.text }]}>
          {year}년 {monthIndex + 1}월
        </Text>
      </Pressable>
      <Pressable onPress={() => shift(1)} hitSlop={10} accessibilityLabel="다음 달">
        <MaterialCommunityIcons name="chevron-right" size={iconSize} color={colors.text} />
      </Pressable>
      {/* 월 선택 시트 (월 글자를 눌러도 열림) */}
      <Pressable onPress={() => setPickerVisible(true)} hitSlop={8} style={styles.pickerButton} accessibilityRole="button" accessibilityLabel="월 선택">
        <Feather name="chevron-down" size={size === 'lg' ? 18 : 16} color={colors.textSecondary} />
      </Pressable>
      {showThisMonth && !isCurrentMonth && (
        <Pressable onPress={() => { const now = toKst(); setMonth(now.year(), now.month()); onChange?.(); }} style={styles.thisMonth} accessibilityRole="button">
          <Text style={styles.thisMonthText}>이번 달</Text>
        </Pressable>
      )}
      <MonthPickerSheet
        visible={pickerVisible}
        year={year}
        monthIndex={monthIndex}
        onSelect={(y, m) => { setMonth(y, m); onChange?.(); }}
        onClose={() => setPickerVisible(false)}
      />
    </View>
  );
}

const makeStyles = ({ colors, radius, typography }: Theme) =>
  StyleSheet.create({
    row: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    pickerButton: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceMuted },
    thisMonth: { marginLeft: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.pill, backgroundColor: colors.primarySoft },
    thisMonthText: { ...typography.captionBold, color: colors.text },
  });
