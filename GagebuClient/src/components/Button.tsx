import { ActivityIndicator, Pressable, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { ReactNode } from 'react';
import { Theme, useTheme, useThemedStyles } from '../theme/ThemeProvider';

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost';

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: Variant;
  icon?: ReactNode;       // 글자 앞 아이콘/이모지
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function Button({ label, onPress, variant = 'primary', icon, disabled, loading, style }: ButtonProps) {
  const styles = useThemedStyles(makeStyles);
  const { colors } = useTheme();
  const textColor = {
    primary: colors.textOnPrimary,
    secondary: colors.text,
    danger: colors.expense,
    ghost: colors.textSecondary,
  }[variant];

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.base,
        styles[variant],
        (pressed || loading) && styles.pressed,
        disabled && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={textColor} />
      ) : (
        <View style={styles.content}>
          {icon}
          <Text style={[styles.label, { color: textColor }]}>{label}</Text>
        </View>
      )}
    </Pressable>
  );
}

const makeStyles = ({ colors, radius, spacing, typography }: Theme) =>
  StyleSheet.create({
    base: {
      minHeight: 52,
      borderRadius: radius.md,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: spacing.lg,
    },
    primary: { backgroundColor: colors.primary },
    secondary: { backgroundColor: colors.surfaceMuted },
    danger: { backgroundColor: colors.expenseSoft },
    ghost: { backgroundColor: 'transparent' },
    pressed: { opacity: 0.75 },
    disabled: { opacity: 0.4 },
    content: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    label: { ...typography.bodyBold, fontSize: 16 },
  });
