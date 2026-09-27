// 로그인. 운영 앱은 카카오 로그인만 (dev build 필요), 개발 중(__DEV__)에는 개발용 로그인도 보인다
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
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
        contentContainerStyle={[styles.container, { paddingTop: insets.top + 48, paddingBottom: insets.bottom + 24 }]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.hero}>
          <PigMain state="wealthy" size={120} />
          <Text style={styles.title}>우리 가계부</Text>
          <Text style={styles.subtitle}>함께 쓰는 사람과 같이 보는 가계부</Text>
        </View>

        <View style={{ gap: 8 }}>
          <Button label="카카오로 시작하기" icon={<Text style={{ fontSize: 16 }}>💬</Text>} onPress={() => {}} disabled style={styles.kakao} />
          <Text style={styles.hint}>카카오 로그인은 설치용 앱(dev build)에서 쓸 수 있어요</Text>
        </View>

        {__DEV__ && (
          <View style={styles.devBox}>
            <Text style={styles.devTitle}>개발용 로그인</Text>
            <Text style={styles.hint}>같은 키로 들어오면 같은 사용자예요. 함께 쓰기를 시험하려면 다른 폰에서 다른 키로 들어오세요.</Text>
            <TextInput
              value={devKey}
              onChangeText={setDevKey}
              placeholder="키 (예: me, partner)"
              autoCapitalize="none"
              autoCorrect={false}
              style={[styles.input, noWebOutline]}
              accessibilityLabel="개발용 키"
            />
            <TextInput
              value={nickname}
              onChangeText={setNickname}
              placeholder="닉네임 (처음 한 번만, 비우면 키)"
              maxLength={20}
              style={[styles.input, noWebOutline]}
              accessibilityLabel="닉네임"
            />
            {error && <Text style={styles.error}>{error}</Text>}
            <Button label="개발용으로 시작" onPress={onDevLogin} loading={loading} disabled={!devKey.trim()} />
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const makeStyles = ({ colors, radius, spacing, typography }: Theme) =>
  StyleSheet.create({
    container: { flexGrow: 1, paddingHorizontal: spacing.xl, gap: spacing.xl, justifyContent: 'center' },
    hero: { alignItems: 'center', gap: spacing.sm, marginBottom: spacing.lg },
    title: { fontFamily: CUTE_FONT, fontSize: 34, color: colors.text },
    subtitle: { ...typography.body, color: colors.textSecondary },
    kakao: { backgroundColor: '#FEE500' },
    hint: { ...typography.caption, color: colors.textSecondary, textAlign: 'center' },
    devBox: { gap: spacing.sm, padding: spacing.lg, borderRadius: radius.lg, borderWidth: 1, borderStyle: 'dashed', borderColor: colors.border },
    devTitle: { ...typography.bodyBold, color: colors.text },
    input: {
      ...typography.body,
      color: colors.text,
      backgroundColor: colors.surfaceMuted,
      borderRadius: radius.sm,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm + 2,
    },
    error: { ...typography.caption, color: colors.expense },
  });
