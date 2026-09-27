import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { describeError } from '../lib/apiError';
import { Theme, useTheme, useThemedStyles } from '../theme/ThemeProvider';
import { Button } from './Button';
import { Card } from './Card';

interface ErrorStateProps {
  error: unknown;
  onRetry: () => void;
  retrying?: boolean;
  // true: 이전 데이터는 보이는 상태에서 위에 얇게 알림 / false: 데이터 대신 크게 안내
  compact?: boolean;
}

// 서버 조회 실패 안내 (연결 안 됨 / 응답 없음 / 서버 오류를 구분해서 보여줌)
export function ErrorState({ error, onRetry, retrying, compact }: ErrorStateProps) {
  const styles = useThemedStyles(makeStyles);
  const { colors } = useTheme();
  const info = describeError(error);
  const icon = info.kind === 'network' || info.kind === 'timeout' ? 'wifi-off' : 'alert-triangle';

  if (compact) {
    return (
      <View style={styles.banner} accessibilityRole="alert">
        <Feather name={icon} size={16} color={colors.expense} />
        <Text style={styles.bannerText} numberOfLines={1}>최신 내용을 불러오지 못했어요</Text>
        <Pressable onPress={onRetry} disabled={retrying} hitSlop={8} accessibilityRole="button">
          <Text style={styles.bannerRetry}>{retrying ? '확인 중…' : '다시 시도'}</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <Card style={styles.card}>
      <View style={styles.iconCircle}>
        <Feather name={icon} size={26} color={colors.expense} />
      </View>
      <Text style={styles.title} accessibilityRole="alert">{info.title}</Text>
      <Text style={styles.message}>{info.message}</Text>
      <Button label="다시 시도" variant="secondary" onPress={onRetry} loading={retrying} style={styles.button} />
    </Card>
  );
}

const makeStyles = ({ colors, radius, spacing, typography }: Theme) =>
  StyleSheet.create({
    card: { alignItems: 'center', paddingVertical: spacing.xxl, gap: spacing.sm },
    iconCircle: { width: 56, height: 56, borderRadius: 28, backgroundColor: colors.expenseSoft, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.sm },
    title: { ...typography.heading, color: colors.text, textAlign: 'center' },
    message: { ...typography.body, fontSize: 14, color: colors.textSecondary, textAlign: 'center' },
    button: { marginTop: spacing.md, alignSelf: 'stretch' },
    banner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      backgroundColor: colors.expenseSoft,
      borderRadius: radius.md,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm + 2,
    },
    bannerText: { ...typography.body, fontSize: 14, color: colors.text, flex: 1 },
    bannerRetry: { ...typography.bodyBold, fontSize: 14, color: colors.expense },
  });
