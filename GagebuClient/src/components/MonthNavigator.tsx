import { useState } from 'react';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { toKst } from '../lib/date';
import { useSelectedMonth } from '../store/month';
import { Theme, useTheme, useThemedStyles } from '../theme/ThemeProvider';
import { controlHeight } from '../theme/tokens';
import { IconButton, PressableScale } from './IconButton';
import { MonthPickerSheet } from './MonthPickerSheet';

interface MonthNavigatorProps {
  size?: 'md' | 'lg';
  showThisMonth?: boolean;   // 다른 달을 볼 때 "이번 달" 버튼
  context?: 'home' | 'history' | 'stats';
  onChange?: () => void;     // 달이 바뀐 뒤 (예: 선택한 날짜 해제)
}

// 세 탭의 월 툴바. 작은 버튼으로 날짜 옆에서 이동하고 오른쪽에서 현재 월·월 목록에 접근한다.
export function MonthNavigator({ size = 'md', showThisMonth, context, onChange }: MonthNavigatorProps) {
  const styles = useThemedStyles(makeStyles);
  const { colors, typography } = useTheme();
  const { width } = useWindowDimensions();
  const { year, monthIndex, shiftMonth, setMonth, isCurrentMonth } = useSelectedMonth();
  const [pickerVisible, setPickerVisible] = useState(false);
  const featured = size === 'lg' && context !== undefined;
  const tight = width < 375;
  const inline = tight ? controlHeight.inlineTight : controlHeight.inline;   // A안: 화면 안 조작 버튼 높이

  const shift = (delta: number) => {
    shiftMonth(delta);
    onChange?.();
  };

  const jumpToThisMonth = () => {
    const now = toKst();
    setMonth(now.year(), now.month());
    onChange?.();
  };
  const pickerSheet = (
    <MonthPickerSheet
      visible={pickerVisible}
      year={year}
      monthIndex={monthIndex}
      onSelect={(y, m) => { setMonth(y, m); onChange?.(); }}
      onClose={() => setPickerVisible(false)}
    />
  );

  if (featured) {
    return (
      <View style={styles.toolbar}>
        <View style={styles.dateNavigation}>
          {/* "2026년 12월" 폭을 미리 잡아 둠 → 9월·10월처럼 글자 수가 달라도 옆 화살표가 움직이지 않음 */}
          <View>
            <Text style={[styles.toolbarDate, tight && styles.toolbarDateTight, styles.dateReserve]} numberOfLines={1} aria-hidden accessibilityElementsHidden importantForAccessibility="no">{year}년 12월</Text>
            <Text style={[styles.toolbarDate, tight && styles.toolbarDateTight, styles.dateShown]} numberOfLines={1}>{year}년 {monthIndex + 1}월</Text>
          </View>
          <IconButton icon="chevron-left" label="이전 달" onPress={() => shift(-1)} size={inline} iconSize={18} />
          <IconButton icon="chevron-right" label="다음 달" onPress={() => shift(1)} size={inline} iconSize={18} />
        </View>
        <View style={styles.toolbarActions}>
          {showThisMonth && (
            <PressableScale onPress={jumpToThisMonth} accessibilityRole="button" accessibilityLabel="이번 달로 이동" style={[styles.todayButton, tight && styles.actionTight]}>
              <Text style={styles.todayText}>Today</Text>
            </PressableScale>
          )}
          <PressableScale
            onPress={() => setPickerVisible(true)}
            accessibilityRole="button"
            accessibilityLabel={`${year}년 ${monthIndex + 1}월, 월 선택`}
            accessibilityHint="연도와 월을 골라 이동합니다"
            style={[styles.monthCombo, tight && styles.actionTight]}
          >
            <Text style={styles.monthComboText}>{monthIndex + 1}월</Text>
            <Feather name="chevron-down" size={16} color={colors.textSecondary} />
          </PressableScale>
        </View>
        {pickerSheet}
      </View>
    );
  }

  const box = size === 'lg' ? controlHeight.inline : controlHeight.inlineTight;
  return (
    <View style={styles.compact}>
      <View style={styles.compactRow}>
        <IconButton icon="chevron-left" label="이전 달" onPress={() => shift(-1)} size={box} iconSize={size === 'lg' ? 20 : 18} tone="muted" />
        <PressableScale onPress={() => setPickerVisible(true)} hitSlop={6} accessibilityRole="button" accessibilityLabel={`${year}년 ${monthIndex + 1}월, 월 선택`} style={styles.label}>
          <Text style={[size === 'lg' ? typography.heading : typography.bodyBold, { color: colors.text }]}>{year}년 {monthIndex + 1}월</Text>
          <Feather name="chevron-down" size={size === 'lg' ? 18 : 16} color={colors.textSecondary} />
        </PressableScale>
        <IconButton icon="chevron-right" label="다음 달" onPress={() => shift(1)} size={box} iconSize={size === 'lg' ? 20 : 18} tone="muted" />
      </View>
      {showThisMonth && !isCurrentMonth && (
        <Pressable onPress={jumpToThisMonth} style={styles.thisMonth} accessibilityRole="button" accessibilityLabel="이번 달로 돌아가기">
          <Feather name="rotate-ccw" size={13} color={colors.primary} />
          <Text style={styles.thisMonthText}>이번 달로 돌아가기</Text>
        </Pressable>
      )}
      {pickerSheet}
    </View>
  );
}

const makeStyles = ({ colors, radius, typography }: Theme) =>
  StyleSheet.create({
    compact: { alignItems: 'center' },
    compactRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    label: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 8, paddingVertical: 4 },
    toolbar: { width: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 4 },
    dateNavigation: { flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 1 },
    toolbarDate: { ...typography.heading, fontSize: 17, color: colors.text, marginRight: 6, flexShrink: 1, fontVariant: ['tabular-nums'] },
    toolbarDateTight: { fontSize: 15, marginRight: 4 },
    dateReserve: { opacity: 0 },
    dateShown: { position: 'absolute', left: 0, top: 0 },
    toolbarActions: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    todayButton: { minWidth: 58, minHeight: controlHeight.inline, paddingHorizontal: 9, alignItems: 'center', justifyContent: 'center', borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
    todayText: { ...typography.captionBold, fontSize: 13, color: colors.text },
    monthCombo: { minWidth: 68, minHeight: controlHeight.inline, paddingHorizontal: 9, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
    monthComboText: { ...typography.captionBold, fontSize: 13, color: colors.text },
    actionTight: { minWidth: 0, paddingHorizontal: 8, minHeight: controlHeight.inlineTight },
    thisMonth: { alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 7, paddingHorizontal: 12, paddingVertical: 5, borderRadius: radius.pill, backgroundColor: colors.surface },
    thisMonthText: { ...typography.captionBold, color: colors.primary },
  });
