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

  const inactive = disabled || loading;

  // Pressable의 disabled는 쓰지 않는다: Android(새 구조)에서 disabled → 활성 전환이 반영되지 않아
  // 금액을 입력해 버튼이 진해졌는데도 안 눌리는 문제가 있었음. 대신 흐리게 보이고 눌러도 무시
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!inactive, busy: !!loading }}
      onPress={() => {
        if (!inactive) onPress();
      }}
      hitSlop={6} // 테두리 조금 바깥을 눌러도 인식
      style={({ pressed }) => [
        styles.base,
        styles[variant],
        ((pressed && !inactive) || loading) && styles.pressed,
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
