// 웹 카카오 로그인에서 돌아오는 화면 (/auth/kakao?code=…&state=…). code를 서버로 보내 로그인을 마무리한다
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useAuth } from '@/src/auth/AuthProvider';
import { kakaoWebRedirectUri, takeKakaoWebState } from '@/src/auth/kakao';
import { Button } from '@/src/components/Button';
import { HeroPig } from '@/src/components/Brand';
import { describeError } from '@/src/lib/apiError';
import { Theme, useTheme, useThemedStyles } from '@/src/theme/ThemeProvider';

export default function KakaoRedirectScreen() {
  const styles = useThemedStyles(makeStyles);
  const { colors } = useTheme();
  const { status, kakaoWebLogin } = useAuth();
  const { code, state, error } = useLocalSearchParams<{ code?: string; state?: string; error?: string }>();
  const [failure, setFailure] = useState<string | null>(null);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    (async () => {
      // 사용자가 카카오 화면에서 취소함
      if (error) {
        setFailure(error === 'access_denied' ? '카카오 로그인을 취소했어요.' : `카카오 로그인에 실패했어요 (${error})`);
        return;
      }
      if (!code || !takeKakaoWebState(state)) {
        setFailure('로그인 요청이 올바르지 않아요. 처음부터 다시 시도해 주세요.');
        return;
      }
      try {
        await kakaoWebLogin(code, kakaoWebRedirectUri());
        router.replace('/');
      } catch (e) {
        const info = describeError(e);
        setFailure(`${info.title} — ${info.message}`);
      }
    })();
  }, [code, state, error, kakaoWebLogin]);

  // 이미 로그인된 상태로 들어오면 홈으로
  useEffect(() => {
    if (status === 'signedIn' && !failure) router.replace('/');
  }, [status, failure]);

  return (
    <View style={styles.page}>
      <HeroPig width={220} />
      {failure ? (
        <>
          <Text style={styles.error}>{failure}</Text>
          <Button label="로그인 화면으로" onPress={() => router.replace('/login')} />
        </>
      ) : (
        <View style={styles.row}>
          <ActivityIndicator color={colors.primary} />
          <Text style={styles.text}>카카오 로그인 중이에요…</Text>
        </View>
      )}
    </View>
  );
}

const makeStyles = ({ colors, spacing, typography }: Theme) =>
  StyleSheet.create({
    page: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.lg, padding: spacing.xl, backgroundColor: colors.background },
    row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    text: { ...typography.body, color: colors.text },
    error: { ...typography.body, color: colors.expense, textAlign: 'center' },
  });
