// 설정: Mockup.png의 그룹형 목록을 실제 설정 기능과 연결
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
import { PigMain } from '@/src/components/Pig';
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

      <Pressable onPress={() => router.push('/household')} accessibilityRole="button">
        <Card style={styles.heroCard}>
          <View style={styles.heroPigs}><PigMain state="wealthy" size={65} /><View style={{ marginLeft: -37 }}><PigMain state="normal" size={65} /></View></View>
          <View style={styles.heroCopy}>
            <Text style={styles.heroTitle}>{me.household.name}</Text>
            <Text style={styles.heroSubtitle}>함께해서 더 즐거운 우리 💕</Text>
          </View>
          <Feather name="chevron-right" size={19} color={colors.textSecondary} />
        </Card>
      </Pressable>

      <Section title="계정 및 공유">
        <Row icon="users" label="파트너 관리" value={others > 0 ? `나 외 ${others}명` : '초대, 권한 설정'} onPress={() => router.push('/household')} />
        <Row icon="heart" label="공유 가계부 설정" value="방 이름, 공유 범위" onPress={() => router.push('/household-name')} last />
      </Section>

      <Section title="가계부 관리">
        <Row
          icon="briefcase"
          label="예산 관리"
          value={
            (!budget ? "…" : budget.monthlyBudget ? formatWon(budget.monthlyBudget) : "설정 안 됨") +
            (overrideCount > 0 ? ` (달별 ${overrideCount}개)` : '')
          }
          onPress={() => setBudgetSheetVisible(true)}
        />
        <Row icon="grid" label="카테고리 관리" value="지출/수입 카테고리 편집" soon />
        <Row icon="target" label="목표 관리" value="저축 목표 설정 및 관리" soon last />
      </Section>

      <Section title="알림 및 데이터">
        <Row icon="bell" label="알림 설정" value="예산, 지출, 목표 알림" soon />
        <Row icon="upload" label="데이터 내보내기" value="CSV 파일로 내보내기" soon last />
      </Section>

      <Section title="앱 및 보안">
        <Row icon="lock" label="보안 설정" value="로그인한 기기" onPress={() => router.push('/devices')} />
        <Row icon="help-circle" label="도움말 및 문의" value="자주 묻는 질문" soon />
        <Row icon="info" label="앱 정보" value={`버전 ${Constants.expoConfig?.version ?? '-'}`} last />
      </Section>

      <Section title="프로필">
        <View style={styles.profile}>
          <View style={styles.bigAvatar}><ProfileAvatar value={me.user.avatar} size={50} emojiSize={34} /></View>
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={styles.rowHint}>닉네임</Text>
            <TextInput value={nickname} onChangeText={setNickname} onEndEditing={commitNickname} onBlur={commitNickname} style={[styles.nicknameInput, noWebOutline]} maxLength={20} placeholder="닉네임" returnKeyType="done" />
          </View>
        </View>
        <View style={styles.profileButtons}>
          <Button label="아이콘 설정" variant="secondary" size="sm" onPress={() => router.push('/profile-icon')} icon={<Feather name="smile" size={14} color={colors.text} />} style={{ flex: 1 }} />
          <Button label="방 이름 설정" variant="secondary" size="sm" onPress={() => router.push('/household-name')} icon={<Feather name="edit-3" size={14} color={colors.text} />} style={{ flex: 1 }} />
        </View>
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

      <Pressable onPress={onLogout} style={styles.logout} accessibilityRole="button"><Feather name="log-out" size={17} color={colors.expense} /><Text style={styles.logoutText}>로그아웃</Text></Pressable>

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
  const accent = icon === 'users' || icon === 'heart' || icon === 'bell' ? '#FF557D' :
    icon === 'briefcase' || icon === 'target' ? '#F5A623' :
      icon === 'grid' || icon === 'lock' ? '#4385F5' :
        icon === 'upload' ? '#18B67B' : '#8D94A6';
  return (
    <Pressable
      onPress={soon ? undefined : onPress}
      disabled={soon || !onPress}
      style={({ pressed }) => [styles.row, !last && styles.rowBorder, pressed && { backgroundColor: colors.surfaceMuted }]}
      accessibilityRole={onPress && !soon ? 'button' : undefined}
    >
      <View style={[styles.rowIcon, { backgroundColor: `${accent}18` }]}><Feather name={icon} size={18} color={accent} /></View>
      <Text style={[styles.rowLabel, soon && { color: colors.textTertiary }]}>{label}</Text>
      {value !== undefined && <Text style={styles.rowValue} numberOfLines={1}>{value}</Text>}
      {(onPress && !soon) ? <Feather name="chevron-right" size={18} color={colors.textTertiary} /> : soon ? <Text style={styles.soon}>준비 중</Text> : null}
    </Pressable>
  );
}

const makeStyles = ({ colors, radius, spacing, typography }: Theme) =>
  StyleSheet.create({
    title: { ...typography.heading, fontSize: 19, color: colors.text, textAlign: 'center', marginBottom: 2 },
    heroCard: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 92 },
    heroPigs: { width: 85, height: 60, flexDirection: 'row', alignItems: 'center', marginLeft: -10 },
    heroCopy: { flex: 1, minWidth: 0 },
    heroTitle: { ...typography.bodyBold, color: colors.text, fontSize: 15 },
    heroSubtitle: { ...typography.caption, color: colors.textSecondary, marginTop: 3 },
    sectionTitle: { ...typography.captionBold, fontSize: 13, color: colors.textSecondary, marginLeft: 4 },
    sectionCard: { overflow: 'hidden' },
    row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.md, minHeight: 56 },
    rowIcon: { width: 29, height: 29, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
    rowBorder: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.divider },
    rowLabel: { ...typography.captionBold, fontSize: 13, color: colors.text, flexShrink: 0 },
    rowValue: { ...typography.caption, fontSize: 10, color: colors.textSecondary, flex: 1, textAlign: 'right' },
    rowHint: { ...typography.caption, color: colors.textSecondary },
    soon: {
      ...typography.caption,
      fontSize: 9,
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
    logout: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14 },
    logoutText: { ...typography.bodyBold, color: colors.expense },
  });
