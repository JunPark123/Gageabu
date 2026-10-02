// 알림 설정 — 받을 알림 종류(서버에 저장) + 이 폰의 알림 권한
import { useCallback, useState } from 'react';
import { Linking, Platform, StyleSheet, Switch, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router/react-navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getNotificationSettings, updateNotificationSettings } from '@/src/api/auth';
import { AppIcon, AppIconName } from '@/src/components/AppIcon';
import { Button } from '@/src/components/Button';
import { Card } from '@/src/components/Card';
import { ErrorState } from '@/src/components/ErrorState';
import { LoadingState } from '@/src/components/LoadingState';
import { Screen } from '@/src/components/Screen';
import { describeError } from '@/src/lib/apiError';
import { notify } from '@/src/lib/confirm';
import { NotificationSettings } from '@/src/models/Auth';
import { getPushPermission, PushPermission, registerForPush } from '@/src/notifications/push';
import { Theme, useTheme, useThemedStyles } from '@/src/theme/ThemeProvider';

const settingsKey = ['notification-settings'] as const;

export default function NotificationsScreen() {
  const styles = useThemedStyles(makeStyles);
  const { colors } = useTheme();
  const queryClient = useQueryClient();
  const { data, error, isError, isFetching, refetch } = useQuery({ queryKey: settingsKey, queryFn: getNotificationSettings });
  const [permission, setPermission] = useState<PushPermission | null>(null);

  // 휴대폰 설정에서 권한을 바꾸고 돌아올 수 있으니 화면에 올 때마다 확인
  useFocusEffect(
    useCallback(() => {
      getPushPermission().then(setPermission).catch(() => setPermission('unavailable'));
    }, []),
  );

  const save = useMutation({
    mutationFn: updateNotificationSettings,
    onMutate: async (next) => {
      await queryClient.cancelQueries({ queryKey: settingsKey });
      const prev = queryClient.getQueryData<NotificationSettings>(settingsKey);
      queryClient.setQueryData(settingsKey, next);
      return { prev };
    },
    onError: (e, _next, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(settingsKey, ctx.prev);
      const info = describeError(e);
      notify(info.title, info.message);
    },
  });

  const toggle = (patch: Partial<NotificationSettings>) => data && save.mutate({ ...data, ...patch });

  const turnOn = async () => {
    const result = await registerForPush(true);
    setPermission(result);
    // 한 번 거절하면 앱에서 다시 물을 수 없다 → 휴대폰 설정으로
    if (result === 'denied') void Linking.openSettings();
  };

  return (
    <Screen includeTopInset={false} onRefresh={refetch}>
      {permission === 'unavailable' && <Text style={styles.notice}>알림은 폰에 설치한 앱에서 받을 수 있어요.</Text>}
      {(permission === 'denied' || permission === 'undetermined') && (
        <Card style={{ gap: 10 }}>
          <Text style={styles.noticeTitle}>이 폰에서 알림이 꺼져 있어요</Text>
          <Text style={styles.notice}>알림을 허용해야 함께 쓰는 사람의 기록과 예산 알림을 받을 수 있어요.</Text>
          <Button label={permission === 'denied' ? '휴대폰 설정에서 켜기' : '알림 허용하기'} size="sm" onPress={turnOn} />
        </Card>
      )}

      {isError && <ErrorState error={error} onRetry={() => refetch()} retrying={isFetching} compact={!!data} />}
      {!data && !isError && <LoadingState />}
      {data && (
        <Card padded={false} style={{ overflow: 'hidden' }}>
          <ToggleRow
            icon="set-partner"
            label="함께 쓰는 사람의 기록"
            hint="다른 멤버가 내역을 기록하면 알려줘요"
            value={data.partnerRecords}
            disabled={save.isPending}
            onChange={(v) => toggle({ partnerRecords: v })}
          />
          <ToggleRow
            icon="budget"
            label="예산 알림"
            hint="예산의 80%·100%를 넘으면 알려줘요"
            value={data.budget}
            disabled={save.isPending}
            onChange={(v) => toggle({ budget: v })}
            last
          />
        </Card>
      )}
      <Text style={styles.notice}>앱을 쓰는 중에는 알림 대신 화면 위에 작은 안내만 잠깐 보여줘요.</Text>
    </Screen>
  );
}

function ToggleRow({ icon, label, hint, value, onChange, last, disabled }: {
  icon: AppIconName;
  label: string;
  hint: string;
  value: boolean;
  onChange: (v: boolean) => void;
  last?: boolean;
  disabled?: boolean;
}) {
  const styles = useThemedStyles(makeStyles);
  const { colors } = useTheme();
  return (
    <View style={[styles.row, !last && styles.rowBorder]}>
      <AppIcon name={icon} size={28} />
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.hint}>{hint}</Text>
      </View>
      <Switch
        disabled={disabled}
        value={value}
        onValueChange={onChange}
        trackColor={{ true: colors.primary, false: colors.surfaceMuted }}
        thumbColor="#FFFFFF"
        {...(Platform.OS === 'web' ? { activeThumbColor: '#FFFFFF' } : {})}
        accessibilityLabel={label}
      />
    </View>
  );
}

const makeStyles = ({ colors, spacing, typography }: Theme) =>
  StyleSheet.create({
    row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, minHeight: 64 },
    rowBorder: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.divider },
    label: { ...typography.bodyBold, fontSize: 14, color: colors.text },
    hint: { ...typography.caption, color: colors.textSecondary, lineHeight: 17 },
    noticeTitle: { ...typography.bodyBold, color: colors.text },
    notice: { ...typography.caption, color: colors.textSecondary, lineHeight: 18, marginLeft: 4 },
  });
