import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { BottomSheet } from './BottomSheet';
import { Button } from './Button';
import { YearSwitcher } from './YearSwitcher';
import { toKst } from '../lib/date';
import { Theme, useThemedStyles } from '../theme/ThemeProvider';

interface MonthPickerSheetProps {
  visible: boolean;
  year: number;
  monthIndex: number;
  onSelect: (year: number, monthIndex: number) => void;
  onClose: () => void;
}

// 연도 이동 + 12개월 격자 + 이번 달로
export function MonthPickerSheet({ visible, year, monthIndex, onSelect, onClose }: MonthPickerSheetProps) {
  const styles = useThemedStyles(makeStyles);
  const [viewYear, setViewYear] = useState(year);

  useEffect(() => {
    if (visible) setViewYear(year);
  }, [visible, year]);

  return (
    <BottomSheet visible={visible} onClose={onClose} title="월 선택">
      <View style={styles.yearRow}>
        <YearSwitcher year={viewYear} onPrev={() => setViewYear(viewYear - 1)} onNext={() => setViewYear(viewYear + 1)} />
      </View>
      <View style={styles.grid}>
        {Array.from({ length: 12 }, (_, m) => {
          const selected = viewYear === year && m === monthIndex;
          return (
            <Pressable
              key={m}
              onPress={() => { onSelect(viewYear, m); onClose(); }}
              style={({ pressed }) => [styles.cell, selected && styles.cellSelected, pressed && { opacity: 0.7 }]}
              accessibilityRole="button"
              accessibilityState={{ selected }}
            >
              <Text style={[styles.cellText, selected && styles.cellTextSelected]}>{m + 1}월</Text>
            </Pressable>
          );
        })}
      </View>
      <Button
        label="이번 달로"
        variant="secondary"
        onPress={() => { const now = toKst(); onSelect(now.year(), now.month()); onClose(); }}
      />
    </BottomSheet>
  );
}

const makeStyles = ({ colors, radius, spacing, typography }: Theme) =>
  StyleSheet.create({
    yearRow: { alignItems: 'center', marginBottom: spacing.md },
    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.md },
    cell: {
      width: '31.5%',
      paddingVertical: spacing.md + 2,
      alignItems: 'center',
      borderRadius: radius.md,
      backgroundColor: colors.surfaceMuted,
    },
    cellSelected: { backgroundColor: colors.primary },
    cellText: { ...typography.body, color: colors.text },
    cellTextSelected: { fontWeight: '800', color: colors.textOnPrimary },
  });
