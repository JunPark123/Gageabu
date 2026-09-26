// 설정 (목업에 없음 → docs/PLAN.md "설정 화면 구성 (안)"대로, 다른 화면과 같은 스타일)
import { PropsWithChildren, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { Card } from '@/src/components/Card';
import { Screen } from '@/src/components/Screen';
import { SegmentedControl } from '@/src/components/SegmentedControl';
import { BudgetSheet } from '@/src/features/budget/BudgetSheet';
import { formatWon } from '@/src/lib/format';
import { ThemeMode, useSettings } from '@/src/store/settings';
import { Theme, useTheme, useThemedStyles } from '@/src/theme/ThemeProvider';
import { noWebOutline } from '@/src/theme/web';

const AVATARS = ['🐷', '🐰', '🐻', '🐱', '🐶', '🦊', '🐼', '🐥'];

export default function SettingsScreen() {
  const styles = useThemedStyles(makeStyles);
  const { settings, updateSettings } = useSettings();
  const [nickname, setNickname] = useState(settings.nickname);
  const [budgetSheetVisible, setBudgetSheetVisible] = useState(false);
  const overrideCount = Object.keys(settings.budgetOverrides).length;

  return (
    <Screen>
      <Text style={styles.title}>설정</Text>

      <Section title="프로필">
        <View style={styles.profile}>
          <View style={styles.bigAvatar}>
            <Text style={{ fontSize: 34 }}>{settings.avatar}</Text>
          </View>
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={styles.rowHint}>닉네임</Text>
            <TextInput
              value={nickname}
              onChangeText={setNickname}
              onEndEditing={() => updateSettings({ nickname: nickname.trim() || '나' })}
              onBlur={() => updateSettings({ nickname: nickname.trim() || '나' })}
              style={[styles.nicknameInput, noWebOutline]}
              maxLength={10}
              placeholder="닉네임"
              returnKeyType="done"
            />
          </View>
        </View>
        <View style={styles.avatarRow}>
          {AVATARS.map((a) => (
            <Pressable
              key={a}
              onPress={() => updateSettings({ avatar: a })}
              style={[styles.avatarOption, settings.avatar === a && styles.avatarSelected]}
              accessibilityRole="button"
              accessibilityState={{ selected: settings.avatar === a }}
              accessibilityLabel={`아바타 ${a}`}
            >
              <Text style={{ fontSize: 22 }}>{a}</Text>
            </Pressable>
          ))}
        </View>
      </Section>

      <Section title="가계부 공유">
        <Row icon="heart" label="파트너 연결" value="연결 안 됨" soon />
        <Row icon="send" label="초대하기" soon />
        <Row icon="key" label="초대코드 입력" soon last />
      </Section>

      <Section title="가계부">
        <Row
          icon="target"
          label="기본 월 예산"
          value={
            (settings.monthlyBudget ? formatWon(settings.monthlyBudget) : '설정 안 됨') +
            (overrideCount > 0 ? ` · 달별 ${overrideCount}개` : '')
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
        <Row icon="log-out" label="로그아웃" soon last />
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
    avatarRow: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: spacing.lg, paddingBottom: spacing.lg },
    avatarOption: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'transparent' },
    avatarSelected: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
    themeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, minHeight: 56 },
  });
