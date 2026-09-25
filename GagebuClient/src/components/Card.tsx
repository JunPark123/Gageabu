import { PropsWithChildren } from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { Theme, useThemedStyles } from '../theme/ThemeProvider';

interface CardProps {
  style?: StyleProp<ViewStyle>;
  padded?: boolean;   // 기본 true. 목록처럼 안쪽 여백을 직접 줄 때 false
}

export function Card({ children, style, padded = true }: PropsWithChildren<CardProps>) {
  const styles = useThemedStyles(makeStyles);
  return <View style={[styles.card, padded && styles.padded, style]}>{children}</View>;
}

const makeStyles = ({ colors, radius, spacing, scheme }: Theme) =>
  StyleSheet.create({
    card: {
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      borderWidth: scheme === 'dark' ? 0 : StyleSheet.hairlineWidth,
      borderColor: colors.border,
      shadowColor: colors.shadow,
      shadowOpacity: scheme === 'dark' ? 0 : 0.06,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 3 },
      elevation: scheme === 'dark' ? 0 : 1,
    },
    padded: {
      padding: spacing.lg,
    },
  });
