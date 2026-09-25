import { Pressable, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { ReactNode } from 'react';
import { Theme, useTheme, useThemedStyles } from '../theme/ThemeProvider';

export interface SegmentOption<T> {
  value: T;
  label: string;
  icon?: (color: string) => ReactNode;
  activeColor?: string;       // 선택 시 채움색 (예: 출금은 빨강). 없으면 카드색
}

interface SegmentedControlProps<T> {
  options: SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  size?: 'md' | 'sm';
  style?: StyleProp<ViewStyle>;
}

export function SegmentedControl<T extends string | number>({ options, value, onChange, size = 'md', style }: SegmentedControlProps<T>) {
  const styles = useThemedStyles(makeStyles);
  const { colors } = useTheme();
  return (
    <View style={[styles.track, size === 'sm' && styles.trackSm, style]} accessibilityRole="tablist">
      {options.map((opt) => {
        const selected = opt.value === value;
        const textColor = selected ? (opt.activeColor ? '#FFFFFF' : colors.text) : colors.textSecondary;
        return (
          <Pressable
            key={String(opt.value)}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            onPress={() => onChange(opt.value)}
            style={[
              styles.segment,
              size === 'sm' && styles.segmentSm,
              selected && [styles.selected, opt.activeColor ? { backgroundColor: opt.activeColor } : null],
            ]}
          >
            {opt.icon?.(textColor)}
            <Text style={[styles.label, size === 'sm' && styles.labelSm, { color: textColor }, selected && styles.labelSelected]}>
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const makeStyles = ({ colors, radius, spacing, typography, scheme }: Theme) =>
  StyleSheet.create({
    track: {
      flexDirection: 'row',
      backgroundColor: colors.surfaceMuted,
      borderRadius: radius.md,
      padding: 4,
    },
    trackSm: { borderRadius: radius.sm + 2, padding: 3 },
    segment: {
      flex: 1,
      flexDirection: 'row',
      gap: 4,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 10,
      borderRadius: radius.sm + 2,
    },
    segmentSm: { flex: 0, paddingVertical: 6, paddingHorizontal: spacing.md, borderRadius: radius.sm },
    selected: {
      backgroundColor: scheme === 'dark' ? colors.surface : '#FFFFFF',
      shadowColor: colors.shadow,
      shadowOpacity: 0.08,
      shadowRadius: 4,
      shadowOffset: { width: 0, height: 1 },
      elevation: 1,
    },
    label: { ...typography.body },
    labelSm: { ...typography.caption, fontSize: 13 },
    labelSelected: { fontWeight: '700' },
  });
