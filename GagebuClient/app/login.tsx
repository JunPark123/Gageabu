// 카카오 SDK 연동 전에는 준비 상태를 표시한다. 개발용 로그인은 개발 환경에서만 보인다.
import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { isAxiosError } from 'axios';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/src/auth/AuthProvider';
import { androidKeyHash, KakaoCancelledError, kakaoLoginAvailable, kakaoWebLoginAvailable, startKakaoWebLogin } from '@/src/auth/kakao';
import { Button } from '@/src/components/Button';
import { HeroPig, Wordmark } from '@/src/components/Brand';
import { describeError } from '@/src/lib/apiError';
import { Theme, useTheme, useThemedStyles } from '@/src/theme/ThemeProvider';
import { noWebOutline } from '@/src/theme/web';

// 테스트 계정 칸: 개발 중이거나, 운영 서버로 빌드한 테스트 APK(EXPO_PUBLIC_TEST_LOGIN=1)일 때만.
// 운영 서버는 테스트 코드(서버의 Auth:TestLoginCode)가 맞아야 받아준다
const TEST_BUILD = !__DEV__ && process.env.EXPO_PUBLIC_TEST_LOGIN === '1';
const TEST_CODE_KEY = 'gageabu.testcode.v1';

const FEATURES: { icon: keyof typeof Feather.glyphMap; text: string }[] = [
  { icon: 'heart', text: '함께 기록하는\n우리의 소비' },
  { icon: 'bar-chart-2', text: '한눈에 보는\n지출 관리' },
  { icon: 'users', text: '더 잘 모으는\n우리의 목표' },
];

export default function LoginScreen() {
  const styles = useThemedStyles(makeStyles);
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { devLogin, kakaoLogin } = useAuth();
  const [kakaoLoading, setKakaoLoading] = useState(false);
  const [kakaoError, setKakaoError] = useState<string | null>(null);
  const [devKey, setDevKey] = useState('me');
  const [nickname, setNickname] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [testCode, setTestCode] = useState('');

  // 한 번 맞춘 테스트 코드는 이 폰에 기억 (로그아웃 후 다시 입력하지 않게)
  useEffect(() => {
    if (TEST_BUILD) AsyncStorage.getItem(TEST_CODE_KEY).then((v) => v && setTestCode(v)).catch(() => {});
  }, []);

  // 설치 앱은 카카오 SDK, 웹은 카카오 로그인 페이지로 이동 (돌아오면 /auth/kakao 화면이 마무리)
  const kakaoAvailable = kakaoLoginAvailable || kakaoWebLoginAvailable;
  const onKakaoLogin = async () => {
    if (kakaoWebLoginAvailable) {
      setKakaoLoading(true);
      startKakaoWebLogin();
      return;
    }
    setKakaoLoading(true);
    setKakaoError(null);
    try {
      await kakaoLogin();
    } catch (e) {
      if (e instanceof KakaoCancelledError) return;   // 창을 닫음
      const info = describeError(e);
      const message = (e as Error)?.message ?? '알 수 없는 오류';
      // 키 해시 불일치: 이 앱이 실제로 쓰는 키 해시를 보여줘 카카오 콘솔에 그대로 등록할 수 있게
      if (/keyhash/i.test(message)) {
        const hash = await androidKeyHash();
        setKakaoError(`카카오 콘솔에 이 앱의 키 해시가 등록되어 있지 않아요.
등록할 키 해시: ${hash ?? '(읽지 못함)'}
(카카오 콘솔 > 앱 설정 > 플랫폼 > Android)`);
        return;
      }
      // 서버 오류가 아니면(카카오 SDK 문제 등) SDK 메시지를 그대로
      setKakaoError(isAxiosError(e) ? `${info.title} — ${info.message}` : `카카오 로그인에 실패했어요 (${message})`);
    } finally {
      setKakaoLoading(false);
    }
  };

  const onDevLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      await devLogin(devKey.trim(), nickname.trim() || undefined, TEST_BUILD ? testCode.trim() : undefined);
      if (TEST_BUILD) AsyncStorage.setItem(TEST_CODE_KEY, testCode.trim()).catch(() => {});
    } catch (e) {
      const info = describeError(e);
      // 운영 서버는 코드가 틀리면 404(없는 주소처럼) 응답
      setError(TEST_BUILD && isAxiosError(e) && e.response?.status === 404 ? '테스트 코드가 맞지 않아요' :
        TEST_BUILD && isAxiosError(e) && e.response?.status === 429 ? '시도가 너무 많아요. 10분 뒤에 다시 해 주세요' :
          `${info.title} — ${info.message}`);
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
          <Wordmark height={86} />
          <Text style={styles.subtitle}>함께 쓰고, 함께 모아가는{'\n'}우리의 가계부 <Text style={{ color: colors.heart }}>♥</Text></Text>
          <HeroPig width={Math.min(300, width - 64)} />
          <View style={styles.features}>
            {FEATURES.map((f) => (
              <View key={f.text} style={styles.feature}>
                <View style={styles.featureIcon}><Feather name={f.icon} size={20} color={colors.primary} /></View>
                <Text style={styles.featureText}>{f.text}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.loginCard}>
          <Pressable
            onPress={onKakaoLogin}
            disabled={!kakaoAvailable || kakaoLoading}
            accessibilityRole="button"
            accessibilityState={{ disabled: !kakaoAvailable, busy: kakaoLoading }}
            style={({ pressed }) => [styles.kakao, !kakaoAvailable && { opacity: 0.55 }, pressed && { opacity: 0.8 }]}
          >
            {kakaoLoading ? <ActivityIndicator color="#191600" /> : <Feather name="message-circle" size={18} color="#191600" />}
            <Text style={styles.kakaoText}>카카오로 시작하기</Text>
          </Pressable>
          {kakaoError && <Text accessibilityRole="alert" style={styles.error} selectable>{kakaoError}</Text>}
          {!kakaoAvailable && <Text style={styles.hint}>카카오 로그인은 설치용 앱(APK)이나 웹에서 할 수 있어요.</Text>}
        </View>

        {(__DEV__ || TEST_BUILD) && (
          <View style={styles.devBox}>
            <View style={styles.devHeader}>
              <Text style={styles.devTitle}>테스트 계정으로 둘러보기</Text>
              <View style={styles.devBadge}><Text style={styles.badgeText}>{TEST_BUILD ? '테스트용' : '개발용'}</Text></View>
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
            {TEST_BUILD && (
              <>
                <Text style={styles.fieldLabel}>테스트 코드</Text>
                <TextInput
                  value={testCode}
                  onChangeText={setTestCode}
                  placeholder="받은 테스트 코드"
                  autoCapitalize="none"
                  autoCorrect={false}
                  secureTextEntry
                  style={[styles.input, noWebOutline]}
                  accessibilityLabel="테스트 코드"
                  placeholderTextColor={colors.textTertiary}
                  editable={!loading}
                />
              </>
            )}
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
            <Button label="이 계정으로 시작하기" onPress={onDevLogin} loading={loading} disabled={!devKey.trim() || (TEST_BUILD && !testCode.trim())} />
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
    hero: { alignItems: 'center', gap: spacing.md },
    subtitle: { ...typography.body, color: colors.text, textAlign: 'center', lineHeight: 22, marginTop: -spacing.xs },
    features: { flexDirection: 'row', justifyContent: 'space-around', alignSelf: 'stretch', marginTop: spacing.xs },
    feature: { alignItems: 'center', gap: 6, flex: 1 },
    featureIcon: { width: 46, height: 46, borderRadius: 23, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
    featureText: { ...typography.caption, color: colors.textSecondary, textAlign: 'center', lineHeight: 17 },
    loginCard: { gap: spacing.sm },
    // 카카오 공식 버튼 색 (#FEE500 / 글자 85% 검정)
    kakao: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, minHeight: 52, borderRadius: radius.lg, backgroundColor: '#FEE500' },
    kakaoText: { ...typography.bodyBold, color: '#191600' },
    hint: { ...typography.caption, color: colors.textSecondary, textAlign: 'center', lineHeight: 18 },
    devBox: { gap: spacing.sm, padding: spacing.lg, borderRadius: radius.xl, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
    devHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm, flexWrap: 'wrap' },
    devBadge: { borderRadius: radius.pill, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, backgroundColor: colors.surfaceMuted },
    devHint: { ...typography.caption, color: colors.textSecondary, lineHeight: 18 },
    devTitle: { ...typography.bodyBold, color: colors.text },
    badgeText: { ...typography.captionBold, color: colors.textSecondary },
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
