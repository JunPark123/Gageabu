// 설정 (목업에 없음 → docs/PLAN.md "설정 화면 구성 (안)"대로, 다른 화면과 같은 스타일)
import { PropsWithChildren, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { router } from 'expo-router';
import { updateProfile } from '@/src/api/auth';
import { useAuth, useMe } from '@/src/auth/AuthProvider';
import { describeError } from '@/src/lib/apiError';
import { confirm, notify } from '@/src/lib/confirm';
import { Card } from '@/src/components/Card';
import { Screen } from '@/src/components/Screen';
import { Button } from '@/src/components/Button';
import { ProfileAvatar } from '@/src/components/ProfileAvatar';
import { SegmentedControl } from '@/src/components/SegmentedControl';
import { BudgetSheet } from '@/src/features/budget/BudgetSheet';
import { formatWon } from '@/src/lib/format';
import { useBudget } from '@/src/hooks/useBudget';
import { ThemeMode, useSettings } from '@/src/store/settings';
import { Theme, useTheme, useThemedStyles } from '@/src/theme/ThemeProvider';
import { noWebOutline } from '@/src/theme/web';

export default function SettingsScreen() {
  const styles = useThemedStyles(makeStyles);
  const { colors } = useTheme();
  const { settings, updateSettings } = useSettings();
  const me = useMe();
  const { setMe, logout } = useAuth();
  const [nickname, setNickname] = useState(me.user.nickname);
  const [budgetSheetVisible, setBudgetSheetVisible] = useState(false);
  const budget = useBudget().data;
  const overrideCount = budget ? Object.keys(budget.budgetOverrides).length : 0;
  const others = me.household.members.length - 1;

  // 닉네임·아바타는 서버에 저장 (함께 쓰는 사람에게 보임). 실패하면 원래 값으로 돌려놓는다
  const saveProfile = async (patch: { nickname?: string; avatar?: string }) => {
    try {
      setMe(await updateProfile(patch));
    } catch (e) {
      setNickname(me.user.nickname);
      const info = describeError(e);
      notify(info.title, info.message);
    }
  };
  const commitNickname = () => {
    const next = nickname.trim();
    if (!next) setNickname(me.user.nickname);
    else if (next !== me.user.nickname) void saveProfile({ nickname: next });
  };

  const onLogout = async () => {
    if (await confirm('로그아웃', '이 기기에서 로그아웃할까요?', '로그아웃', true)) await logout();
  };

  return (
    <Screen>
      <Text style={styles.title}>설정</Text>

      <Section title="프로필">
        <View style={styles.profile}>
          <View style={styles.bigAvatar}>
            <ProfileAvatar value={me.user.avatar} size={50} emojiSize={34} />
          </View>
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={styles.rowHint}>닉네임</Text>
            <TextInput
              value={nickname}
              onChangeText={setNickname}
              onEndEditing={commitNickname}
              onBlur={commitNickname}
              style={[styles.nicknameInput, noWebOutline]}
              maxLength={20}
              placeholder="닉네임"
              returnKeyType="done"
            />
          </View>
        </View>
        <View style={styles.profileButtons}>
          <Button label="아이콘 설정" variant="secondary" size="sm" onPress={() => router.push('/profile-icon')} icon={<Feather name="smile" size={14} color={colors.text} />} style={{ flex: 1 }} />
          <Button label="방 이름 설정" variant="secondary" size="sm" onPress={() => router.push('/household-name')} icon={<Feather name="edit-3" size={14} color={colors.text} />} style={{ flex: 1 }} />
        </View>
      </Section>

      <Section title="가계부 공유">
        <Row
          icon="users"
          label={me.household.name}
          value={others > 0 ? `나 외 ${others}명` : '혼자 쓰는 중'}
          onPress={() => router.push('/household')}
          last
        />
      </Section>

      <Section title="가계부">
        <Row
          icon="target"
          label="기본 월 예산"
          value={
            (!budget ? "…" : budget.monthlyBudget ? formatWon(budget.monthlyBudget) : "설정 안 됨") +
            (overrideCount > 0 ? ` (달별 ${overrideCount}개)` : '')
          }
          onPress={() => setBudgetSheetVisible(true)}
        />
        <Row icon="calendar" label="월 시작일" value="1일" soon />
        <Row icon="grid" label="카테고리 관리" soon last />
      </Section>

      <Section title="화면">
        <View style={styles.themeRow}>
          <Text style={styles.rowLabel}>테마</Text>
          <SegmentedControl<ThemeMode>
            size="sm"
            options={[
              { value: 'system', label: '시스템' },
              { value: 'light', label: '라이트' },
              { value: 'dark', label: '다크' },
            ]}
            value={settings.themeMode}
            onChange={(themeMode) => updateSettings({ themeMode })}
          />
        </View>
      </Section>

      <Section title="알림">
        <Row icon="bell" label="파트너가 기록하면 알림" soon />
        <Row icon="alert-circle" label="예산 80% 도달 알림" soon last />
      </Section>

      <Section title="데이터">
        <Row icon="download" label="CSV 내보내기" soon last />
      </Section>

      <Section title="정보">
        <Row icon="info" label="앱 버전" value={Constants.expoConfig?.version ?? '-'} />
        <Row icon="smartphone" label="로그인한 기기" onPress={() => router.push('/devices')} />
        <Row icon="log-out" label="로그아웃" onPress={onLogout} last />
      </Section>

      <BudgetSheet visible={budgetSheetVisible} onClose={() => setBudgetSheetVisible(false)} />
    </Screen>
  );
}

function Section({ title, children }: PropsWithChildren<{ title: string }>) {
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={{ gap: 8 }}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Card padded={false} style={styles.sectionCard}>{children}</Card>
    </View>
  );
}

interface RowProps {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  value?: string;
  onPress?: () => void;
  soon?: boolean;     // 아직 없는 기능 → "준비 중" 표시, 누를 수 없음
  last?: boolean;
}

function Row({ icon, label, value, onPress, soon, last }: RowProps) {
  const styles = useThemedStyles(makeStyles);
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={soon ? undefined : onPress}
      disabled={soon || !onPress}
      style={({ pressed }) => [styles.row, !last && styles.rowBorder, pressed && { backgroundColor: colors.surfaceMuted }]}
      accessibilityRole={onPress && !soon ? 'button' : undefined}
    >
      <Feather name={icon} size={18} color={soon ? colors.textTertiary : colors.textSecondary} />
      <Text style={[styles.rowLabel, soon && { color: colors.textTertiary }]}>{label}</Text>
      {value !== undefined && <Text style={[styles.rowValue, soon && { color: colors.textTertiary }]}>{value}</Text>}
      {soon && <Text style={styles.soon}>준비 중</Text>}
      {onPress && !soon && <Feather name="chevron-right" size={18} color={colors.textTertiary} />}
    </Pressable>
  );
}

const makeStyles = ({ colors, radius, spacing, typography }: Theme) =>
  StyleSheet.create({
    title: { ...typography.title, color: colors.text },
    sectionTitle: { ...typography.captionBold, fontSize: 13, color: colors.textSecondary, marginLeft: 4 },
    sectionCard: { overflow: 'hidden' },
    row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.lg, minHeight: 52 },
    rowBorder: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.divider },
    rowLabel: { ...typography.body, color: colors.text, flex: 1 },
    rowValue: { ...typography.body, color: colors.textSecondary },
    rowHint: { ...typography.caption, color: colors.textSecondary },
    soon: {
      ...typography.caption,
      fontSize: 11,
      color: colors.textSecondary,
      backgroundColor: colors.surfaceMuted,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: radius.pill,
      overflow: 'hidden',
    },
    profile: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg, padding: spacing.lg },
    bigAvatar: { width: 60, height: 60, borderRadius: 30, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
    nicknameInput: {
      ...typography.bodyBold,
      fontSize: 17,
      color: colors.text,
      backgroundColor: colors.surfaceMuted,
      borderRadius: radius.sm,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
    },
    profileButtons: { flexDirection: 'row', gap: spacing.sm, paddingHorizontal: spacing.lg, paddingBottom: spacing.lg },
    themeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, minHeight: 56 },
  });
