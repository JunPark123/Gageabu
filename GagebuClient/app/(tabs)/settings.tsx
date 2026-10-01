// 설정: 내 정보 / 함께 쓰기 / 가계부 관리 / 앱 설정 / 도움말 — 각 항목은 별도 화면으로
import { PropsWithChildren, ReactNode, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { router } from 'expo-router';
import { useAuth, useMe } from '@/src/auth/AuthProvider';
import { confirm } from '@/src/lib/confirm';
import { AppIcon, AppIconName } from '@/src/components/AppIcon';
import { Card } from '@/src/components/Card';
import { PressableScale } from '@/src/components/IconButton';
import { Screen } from '@/src/components/Screen';
import { ProfileAvatar } from '@/src/components/ProfileAvatar';
import { PigMain } from '@/src/components/Pig';
import { SegmentedControl } from '@/src/components/SegmentedControl';
import { BudgetSheet } from '@/src/features/budget/BudgetSheet';
import { formatWon } from '@/src/lib/format';
import { useBudget } from '@/src/hooks/useBudget';
import { HouseholdRole } from '@/src/models/Auth';
import { ThemeMode, useSettings } from '@/src/store/settings';
import { Theme, useTheme, useThemedStyles } from '@/src/theme/ThemeProvider';

export default function SettingsScreen() {
  const styles = useThemedStyles(makeStyles);
  const { colors } = useTheme();
  const { settings, updateSettings } = useSettings();
  const me = useMe();
  const { logout } = useAuth();
  const [budgetSheetVisible, setBudgetSheetVisible] = useState(false);
  const budget = useBudget().data;
  const overrideCount = budget ? Object.keys(budget.budgetOverrides).length : 0;
  const household = me.household;
  const others = household.members.length - 1;
  const isOwner = household.myRole === HouseholdRole.Owner;

  const onLogout = async () => {
    if (await confirm('로그아웃', '이 기기에서 로그아웃할까요?', '로그아웃', true)) await logout();
  };

  return (
    <Screen>
      <Text style={styles.title}>설정</Text>

      {/* 가계부 카드 → 가계부 이름 */}
      <PressableScale onPress={() => router.push('/household-name')} accessibilityRole="button" accessibilityLabel={`${household.name}, 가계부 이름`}>
        <Card style={styles.heroCard}>
          <View style={styles.heroPigs}><PigMain state="wealthy" size={65} /><View style={{ marginLeft: -37 }}><PigMain state="normal" size={65} /></View></View>
          <View style={styles.heroCopy}>
            <Text style={styles.heroTitle} numberOfLines={1}>{household.name}</Text>
            <Text style={styles.heroSubtitle}>멤버 {household.members.length}명 · {isOwner ? '이름 바꾸기' : '함께해서 더 즐거운 우리 💕'}</Text>
          </View>
          <Feather name="chevron-right" size={19} color={colors.textSecondary} />
        </Card>
      </PressableScale>

      <Section title="내 정보">
        <Row
          left={<View style={styles.rowAvatar}><ProfileAvatar value={me.user.avatar} size={26} emojiSize={17} /></View>}
          label="프로필"
          value={me.user.nickname}
          onPress={() => router.push('/profile')}
        />
        <Row icon="set-lock" label="로그인한 기기" value="기기 관리" onPress={() => router.push('/devices')} last />
      </Section>

      <Section title="함께 쓰기">
        <Row icon="set-partner" label="멤버 관리" value={others > 0 ? `나 외 ${others}명` : '혼자 쓰는 중'} onPress={() => router.push('/members')} />
        <Row icon="set-share" label="초대하기" value={isOwner ? '초대 코드 만들기' : '방장만 가능'} onPress={() => router.push('/invite')} />
        <Row icon="transfer" label="초대 코드 입력" value="다른 가계부 참여" onPress={() => router.push('/join')} last />
      </Section>

      <Section title="가계부 관리">
        <Row
          icon="budget"
          label="예산 관리"
          value={(!budget ? '…' : budget.monthlyBudget ? formatWon(budget.monthlyBudget) : '설정 안 됨') + (overrideCount > 0 ? ` (달별 ${overrideCount}개)` : '')}
          onPress={() => setBudgetSheetVisible(true)}
        />
        <Row icon="set-category" label="카테고리 관리" soon />
        <Row icon="goal" label="목표 관리" soon last />
      </Section>

      <Section title="앱 설정">
        <View style={[styles.row, styles.rowBorder]}>
          <View style={styles.rowIcon}><View style={styles.themeIcon}><Feather name="moon" size={15} color="#7B6CF6" /></View></View>
          <Text style={styles.rowLabel}>화면 테마</Text>
          <View style={{ flex: 1, alignItems: 'flex-end' }}>
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
        </View>
        <Row icon="set-bell" label="알림 설정" value="기록·예산 알림" onPress={() => router.push('/notifications')} />
        <Row icon="set-export" label="데이터 내보내기" soon last />
      </Section>

      <Section title="도움말">
        <Row icon="set-help" label="도움말 및 문의" soon />
        <Row icon="set-info" label="앱 정보" value={`버전 ${Constants.expoConfig?.version ?? '-'}`} last />
      </Section>

      <Card padded={false} style={styles.sectionCard}>
        <Row icon="set-logout" label="로그아웃" onPress={onLogout} danger last />
      </Card>

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
  icon?: AppIconName;
  left?: ReactNode;    // 아이콘 대신 (프로필 사진 등)
  label: string;
  value?: string;
  onPress?: () => void;
  soon?: boolean;      // 아직 없는 기능 → "준비 중" 표시, 누를 수 없음
  last?: boolean;
  danger?: boolean;    // 로그아웃처럼 빨간 글자
}

function Row({ icon, left, label, value, onPress, soon, last, danger }: RowProps) {
  const styles = useThemedStyles(makeStyles);
  const { colors } = useTheme();
  const pressable = !!onPress && !soon;
  return (
    <Pressable
      onPress={pressable ? onPress : undefined}
      disabled={!pressable}
      style={({ pressed }) => [styles.row, !last && styles.rowBorder, pressed && { backgroundColor: colors.surfaceMuted }]}
      accessibilityRole={pressable ? 'button' : undefined}
    >
      <View style={[styles.rowIcon, soon && { opacity: 0.55 }]}>{left ?? (icon && <AppIcon name={icon} size={26} />)}</View>
      <Text style={[styles.rowLabel, soon && { color: colors.textTertiary }, danger && { color: colors.expense }]}>{label}</Text>
      <Text style={styles.rowValue} numberOfLines={1}>{value ?? ''}</Text>
      {soon ? <Text style={styles.soon}>준비 중</Text> : pressable && !danger ? <Feather name="chevron-right" size={18} color={colors.textTertiary} /> : null}
    </Pressable>
  );
}

const makeStyles = ({ colors, radius, spacing, typography, scheme }: Theme) =>
  StyleSheet.create({
    title: { ...typography.heading, fontSize: 19, color: colors.text, textAlign: 'center', marginBottom: 2 },
    heroCard: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 92 },
    heroPigs: { width: 85, height: 60, flexDirection: 'row', alignItems: 'center', marginLeft: -10 },
    heroCopy: { flex: 1, minWidth: 0 },
    heroTitle: { ...typography.bodyBold, color: colors.text, fontSize: 16 },
    heroSubtitle: { ...typography.caption, color: colors.textSecondary, marginTop: 3 },
    sectionTitle: { ...typography.captionBold, fontSize: 13, color: colors.textSecondary, marginLeft: 4 },
    sectionCard: { overflow: 'hidden' },
    row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.md, minHeight: 54 },
    rowIcon: { width: 29, height: 29, alignItems: 'center', justifyContent: 'center' },
    rowAvatar: { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
    themeIcon: { width: 26, height: 26, borderRadius: 8, backgroundColor: scheme === 'dark' ? '#2B2748' : '#EEEBFF', alignItems: 'center', justifyContent: 'center' },
    rowBorder: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.divider },
    rowLabel: { ...typography.captionBold, fontSize: 14, color: colors.text, flexShrink: 0 },
    rowValue: { ...typography.caption, fontSize: 12, color: colors.textSecondary, flex: 1, textAlign: 'right' },
    soon: {
      ...typography.caption,
      fontSize: 10,
      color: colors.textSecondary,
      backgroundColor: colors.surfaceMuted,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: radius.pill,
      overflow: 'hidden',
    },
  });
