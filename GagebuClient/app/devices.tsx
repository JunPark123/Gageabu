// 로그인한 기기 — 잃어버린 폰 등을 여기서 로그아웃시킨다 (토큰 갱신 B안)
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getSessions, revokeSession } from '@/src/api/auth';
import { useAuth } from '@/src/auth/AuthProvider';
import { Card } from '@/src/components/Card';
import { ErrorState } from '@/src/components/ErrorState';
import { LoadingState } from '@/src/components/LoadingState';
import { Screen } from '@/src/components/Screen';
import { describeError } from '@/src/lib/apiError';
import { confirm, notify } from '@/src/lib/confirm';
import { formatKst } from '@/src/lib/date';
import { relativeDayLabel } from '@/src/lib/format';
import { Session } from '@/src/models/Auth';
import { Theme, useTheme, useThemedStyles } from '@/src/theme/ThemeProvider';

const sessionKeys = { all: ["sessions"] as const };

export default function DevicesScreen() {
  const styles = useThemedStyles(makeStyles);
  const { logout } = useAuth();
  const queryClient = useQueryClient();
  const { data, error, isError, isFetching, refetch } = useQuery({ queryKey: sessionKeys.all, queryFn: getSessions });

  const revoke = useMutation({
    mutationFn: revokeSession,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: sessionKeys.all }),
    onError: (e) => {
      const info = describeError(e);
      notify(info.title, info.message);
    },
  });

  const onRevoke = async (session: Session) => {
    if (session.current) {
      if (await confirm('로그아웃', '이 기기에서 로그아웃할까요?', '로그아웃', true)) await logout();
      return;
    }
    if (await confirm('기기 로그아웃', `"${session.deviceName}"에서 로그아웃시킬까요? 그 기기는 다시 로그인해야 해요.`, '로그아웃', true)) {
      revoke.mutate(session.id);
    }
  };

  return (
    <Screen onRefresh={refetch}>
      <Text style={styles.hint}>
        잃어버린 폰이나 더 이상 쓰지 않는 기기는 여기서 로그아웃시키세요. 60일 동안 쓰지 않은 기기는 자동으로 로그아웃돼요.
      </Text>
      {isError && <ErrorState error={error} onRetry={() => refetch()} retrying={isFetching} compact={!!data} />}
      {!data && !isError && <LoadingState />}
      {data && (
        <Card padded={false} style={{ overflow: 'hidden' }}>
          {data.map((s, i) => (
            <DeviceRow key={s.id} session={s} last={i === data.length - 1} onRevoke={() => onRevoke(s)} />
          ))}
        </Card>
      )}
    </Screen>
  );
}

function DeviceRow({ session, last, onRevoke }: { session: Session; last: boolean; onRevoke: () => void }) {
  const styles = useThemedStyles(makeStyles);
  const { colors } = useTheme();
  return (
    <View style={[styles.row, !last && styles.rowBorder]}>
      <Feather name={session.deviceName === '웹 브라우저' ? 'monitor' : 'smartphone'} size={20} color={colors.textSecondary} />
      <View style={{ flex: 1, gap: 2 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Text style={styles.name} numberOfLines={1}>{session.deviceName}</Text>
          {session.current && <Text style={styles.badge}>이 기기</Text>}
        </View>
        <Text style={styles.sub}>
          마지막 사용 {relativeDayLabel(session.lastUsedAt)} {formatKst(session.lastUsedAt, 'HH:mm')} · 처음 로그인 {formatKst(session.createdAt, 'YYYY.MM.DD')}
        </Text>
      </View>
      <Pressable onPress={onRevoke} hitSlop={8} accessibilityRole="button" accessibilityLabel={`${session.deviceName} 로그아웃`}>
        <Text style={styles.revoke}>로그아웃</Text>
      </Pressable>
    </View>
  );
}

const makeStyles = ({ colors, radius, spacing, typography }: Theme) =>
  StyleSheet.create({
    hint: { ...typography.caption, color: colors.textSecondary, lineHeight: 18 },
    row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, minHeight: 60 },
    rowBorder: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.divider },
    name: { ...typography.bodyBold, color: colors.text, flexShrink: 1 },
    sub: { ...typography.caption, color: colors.textSecondary },
    badge: {
      ...typography.caption,
      fontSize: 11,
      color: colors.text,
      backgroundColor: colors.primarySoft,
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: radius.pill,
      overflow: 'hidden',
    },
    revoke: { ...typography.captionBold, color: colors.expense },
  });
