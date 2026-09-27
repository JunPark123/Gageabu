// 카카오 SDK 연동 전에는 준비 상태를 표시한다. 개발용 로그인은 개발 환경에서만 보인다.
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/src/auth/AuthProvider';
import { Button } from '@/src/components/Button';
import { PigMain } from '@/src/components/Pig';
import { describeError } from '@/src/lib/apiError';
import { Theme, useTheme, useThemedStyles } from '@/src/theme/ThemeProvider';
import { CUTE_FONT } from '@/src/theme/tokens';
import { noWebOutline } from '@/src/theme/web';

export default function LoginScreen() {
  const styles = useThemedStyles(makeStyles);
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { devLogin } = useAuth();
  const [devKey, setDevKey] = useState('me');
  const [nickname, setNickname] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onDevLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      await devLogin(devKey.trim(), nickname.trim() || undefined);
    } catch (e) {
      const info = describeError(e);
      setError(`${info.title} — ${info.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.background }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        contentContainerStyle={[styles.container, { paddingTop: insets.top + 28, paddingBottom: insets.bottom + 24 }]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.content}>
        <View style={styles.hero}>
          <View style={styles.heroArt}><PigMain state="wealthy" size={112} /></View>
          <Text style={styles.eyebrow}>작은 기록, 함께하는 일상</Text>
          <Text style={styles.title}>우리 가계부</Text>
          <Text style={styles.subtitle}>오늘 쓴 돈부터 이번 달 예산까지,{ '\n' }우리의 하루를 함께 기록해요.</Text>
          <View style={styles.features}>
            <View style={styles.feature}><Feather name="users" size={14} color={colors.textSecondary} /><Text style={styles.featureText}>함께 기록</Text></View>
            <View style={styles.feature}><Feather name="pie-chart" size={14} color={colors.textSecondary} /><Text style={styles.featureText}>예산 관리</Text></View>
          </View>
        </View>

        <View style={styles.loginCard}>
          <Text style={styles.cardTitle}>우리의 기록을 시작해볼까요?</Text>
          <Button label="카카오 로그인 준비 중" icon={<Feather name="message-circle" size={18} color={colors.textOnPrimary} />} onPress={() => {}} disabled />
          <Text style={styles.hint}>카카오 로그인은 곧 연결할 예정이에요.</Text>
        </View>

        {__DEV__ && (
          <View style={styles.devBox}>
            <View style={styles.devHeader}>
              <Text style={styles.devTitle}>테스트 계정으로 둘러보기</Text>
              <View style={styles.devBadge}><Text style={styles.featureText}>개발용</Text></View>
            </View>
            <Text style={styles.devHint}>두 폰에서 함께 쓰려면 서로 다른 키를 선택하세요.</Text>
            <View style={styles.accountChoices}>
              {(['me', 'partner'] as const).map((key) => (
                <Pressable key={key} onPress={() => { setDevKey(key); setError(null); }} accessibilityRole="button" accessibilityState={{ selected: devKey === key }} style={({ pressed }) => [styles.accountChoice, devKey === key && styles.accountSelected, pressed && { opacity: 0.7 }]}>
                  <Feather name={key === 'me' ? 'user' : 'users'} size={16} color={colors.text} />
                  <Text style={styles.accountText}>{key === 'me' ? '내 계정 · me' : '상대 계정 · partner'}</Text>
                </Pressable>
              ))}
            </View>
            <Text style={styles.fieldLabel}>사용자 키</Text>
            <TextInput
              value={devKey}
              onChangeText={setDevKey}
              placeholder="키 (예: me, partner)"
              autoCapitalize="none"
              autoCorrect={false}
              style={[styles.input, noWebOutline]}
              accessibilityLabel="개발용 키"
              placeholderTextColor={colors.textTertiary}
              editable={!loading}
            />
            <Text style={styles.fieldLabel}>닉네임 <Text style={styles.optional}>선택</Text></Text>
            <TextInput
              value={nickname}
              onChangeText={setNickname}
              placeholder="닉네임 (처음 한 번만, 비우면 키)"
              maxLength={20}
              style={[styles.input, noWebOutline]}
              accessibilityLabel="닉네임"
              placeholderTextColor={colors.textTertiary}
              editable={!loading}
            />
            {error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
            <Button label="이 계정으로 시작하기" onPress={onDevLogin} loading={loading} disabled={!devKey.trim()} />
            <Text style={styles.hint}>같은 키로 로그인하면 기존 기록을 이어서 볼 수 있어요.</Text>
          </View>
        )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const makeStyles = ({ colors, radius, spacing, typography }: Theme) =>
  StyleSheet.create({
    container: { flexGrow: 1, paddingHorizontal: spacing.xl, justifyContent: 'center', alignItems: 'center' },
    content: { width: '100%', maxWidth: 440, gap: spacing.xl },
    hero: { alignItems: 'center', gap: spacing.sm },
    heroArt: { width: 144, height: 144, borderRadius: 72, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.sm },
    eyebrow: { ...typography.captionBold, color: colors.textSecondary, letterSpacing: 1 },
    title: { fontFamily: CUTE_FONT, fontSize: 34, color: colors.text },
    subtitle: { ...typography.body, color: colors.textSecondary, textAlign: 'center', lineHeight: 23 },
    features: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.sm, flexWrap: 'wrap', justifyContent: 'center' },
    feature: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.pill, backgroundColor: colors.surfaceMuted },
    featureText: { ...typography.captionBold, color: colors.textSecondary },
    loginCard: { padding: spacing.xl, gap: spacing.md, backgroundColor: colors.surface, borderRadius: radius.xl, borderWidth: 1, borderColor: colors.border },
    cardTitle: { ...typography.bodyBold, color: colors.text, textAlign: 'center' },
    hint: { ...typography.caption, color: colors.textSecondary, textAlign: 'center', lineHeight: 18 },
    devBox: { gap: spacing.sm, padding: spacing.lg, borderRadius: radius.xl, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
    devHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm, flexWrap: 'wrap' },
    devBadge: { borderRadius: radius.pill, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, backgroundColor: colors.surfaceMuted },
    devHint: { ...typography.caption, color: colors.textSecondary, lineHeight: 18 },
    devTitle: { ...typography.bodyBold, color: colors.text },
    accountChoices: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginVertical: spacing.sm },
    accountChoice: { flexGrow: 1, minHeight: 44, paddingHorizontal: spacing.sm, paddingVertical: spacing.sm, flexDirection: 'row', gap: 6, alignItems: 'center', justifyContent: 'center', borderRadius: radius.md, backgroundColor: colors.surfaceMuted, borderWidth: 1, borderColor: colors.border },
    accountSelected: { backgroundColor: colors.primarySoft, borderColor: colors.primary },
    accountText: { ...typography.captionBold, color: colors.text },
    fieldLabel: { ...typography.captionBold, color: colors.text, marginTop: spacing.xs },
    optional: { ...typography.caption, color: colors.textSecondary },
    input: {
      ...typography.body,
      color: colors.text,
      backgroundColor: colors.surfaceMuted,
      borderRadius: radius.sm,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm + 2,
      minHeight: 48,
      borderWidth: 1,
      borderColor: colors.border,
    },
    error: { ...typography.caption, color: colors.expense, backgroundColor: colors.expenseSoft, padding: spacing.md, borderRadius: radius.sm },
  });
