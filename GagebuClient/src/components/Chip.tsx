import { Pressable, StyleProp, StyleSheet, Text, ViewStyle } from 'react-native';
import { ReactNode } from 'react';
import { Theme, useTheme, useThemedStyles } from '../theme/ThemeProvider';

interface ChipProps {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  leading?: ReactNode;
  trailing?: ReactNode;
  style?: StyleProp<ViewStyle>;
}

export function Chip({ label, selected, onPress, leading, trailing, style }: ChipProps) {
  const styles = useThemedStyles(makeStyles);
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [styles.chip, selected && styles.selected, pressed && { opacity: 0.7 }, style]}
    >
      {leading}
      <Text style={[styles.label, { color: selected ? colors.chipActiveText : colors.text }]}>{label}</Text>
      {trailing}
    </Pressable>
  );
}

const makeStyles = ({ colors, radius, spacing, typography }: Theme) =>
  StyleSheet.create({
    chip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: spacing.md + 2,
      height: 36,
      borderRadius: radius.pill,
      backgroundColor: colors.surface,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
    },
    selected: {
      backgroundColor: colors.chipActive,
      borderColor: colors.chipActive,
    },
    label: { ...typography.body, fontSize: 14, fontWeight: '600' },
  });
