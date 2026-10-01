import { DarkTheme, DefaultTheme, ThemeProvider as NavigationThemeProvider } from 'expo-router/react-navigation';
import { ErrorBoundaryProps, Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import * as SystemUI from 'expo-system-ui';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo } from 'react';
import { AppState, Pressable, Text, View } from 'react-native';
import { focusManager, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import 'react-native-reanimated';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Jua_400Regular, useFonts } from '@expo-google-fonts/jua';
import { AuthProvider, useAuth } from '@/src/auth/AuthProvider';
import { SettingsProvider, useSettings } from '@/src/store/settings';
import { ThemeProvider, useTheme } from '@/src/theme/ThemeProvider';


// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

// staleTime: 10초 안에 받은 데이터는 다시 받지 않음 (미리 불러온 옆 달을 넘기자마자 또 받는 것 방지).
//   탭 이동·앱 복귀·내 변경 후에는 따로 강제로 다시 가져오므로 영향 없음
// retry: 실패하면 1번만 다시 시도 (기본 3번이면 연결이 안 될 때 안내가 한참 늦게 뜸)
const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 10_000, retry: 1, retryDelay: 1000 } },
});

// 앱이 백그라운드에서 돌아오면 오래된 조회를 다시 가져오도록 (RN에는 브라우저 focus 이벤트가 없음)
AppState.addEventListener('change', (status) => {
  focusManager.setFocused(status === 'active');
});

// 화면 코드에서 예상 못 한 에러가 나도 앱이 하얗게 죽지 않게 (expo-router 에러 경계).
// 테마 쪽이 원인일 수도 있어서 테마를 쓰지 않고 고정 색으로 그린다
export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24, backgroundColor: '#FBF6EE' }}>
      <Text style={{ fontSize: 48 }}>🐷</Text>
      <Text style={{ fontSize: 18, fontWeight: '700', color: '#221C17' }}>문제가 생겼어요</Text>
      <Text style={{ fontSize: 13, color: '#8C837A', textAlign: 'center' }} numberOfLines={3}>{error.message}</Text>
      <Pressable onPress={retry} style={{ marginTop: 8, backgroundColor: '#FFD740', borderRadius: 12, paddingHorizontal: 28, paddingVertical: 14 }} accessibilityRole="button">
        <Text style={{ fontSize: 16, fontWeight: '700', color: '#221C17' }}>다시 시도</Text>
      </Pressable>
    </View>
  );
}

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <AuthProvider>
          <SettingsProvider>
            <ThemeProvider>
              <AppStack />
            </ThemeProvider>
          </SettingsProvider>
          </AuthProvider>
        </GestureHandlerRootView>
      </SafeAreaProvider>
    </QueryClientProvider>
  );
}

function AppStack() {
  const { loaded: settingsLoaded } = useSettings();
  const { status } = useAuth();
  const [fontsLoaded, fontError] = useFonts({ Jua_400Regular });
  const { scheme, colors } = useTheme();
  // 폰트를 못 불러와도 앱은 뜨게 (기본 글꼴로). 로그인 여부를 확인할 때까지 스플래시 유지
  const loaded = settingsLoaded && (fontsLoaded || !!fontError) && status !== 'loading';
  const signedIn = status === 'signedIn';

  // 저장된 테마 설정·폰트를 읽기 전에 화면을 보여주면 번쩍이므로 그때까지 스플래시 유지
  useEffect(() => {
    if (loaded) SplashScreen.hideAsync();
  }, [loaded]);

  // 앱 창 자체의 배경색 (화면 전환 틈으로 보이는 색) — 라이트/다크에 맞춘다
  useEffect(() => {
    SystemUI.setBackgroundColorAsync(colors.background).catch(() => {});
  }, [colors.background]);

  const navigationTheme = useMemo(() => {
    const base = scheme === 'dark' ? DarkTheme : DefaultTheme;
    return { ...base, colors: { ...base.colors, background: colors.background, card: colors.surface, text: colors.text, border: colors.border, primary: colors.primary } };
  }, [scheme, colors]);

  if (!loaded) return null;

  return (
    <NavigationThemeProvider value={navigationTheme}>
      {/* 로그인 전에는 로그인 화면만, 로그인 후에는 앱 화면만 (로그아웃하면 자동으로 로그인 화면) */}
      <Stack
        screenOptions={{
          // 설정에서 들어가는 화면(가계부 공유·기기) 머리를 앱 배경·굵은 제목으로
          headerStyle: { backgroundColor: colors.background },
          headerShadowVisible: false,
          headerTintColor: colors.text,
          headerTitleStyle: { fontWeight: '700', color: colors.text },
          // 화면이 밀려 들어올 때 뒤쪽이 흰색으로 비치지 않게 (전환 중 오른쪽 흰 띠의 원인)
          contentStyle: { backgroundColor: colors.background },
          animation: 'slide_from_right',
        }}
      >
        <Stack.Protected guard={signedIn}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="members" options={{ title: '멤버 관리', headerBackTitle: '설정' }} />
          <Stack.Screen name="invite" options={{ title: '초대하기', headerBackTitle: '설정' }} />
          <Stack.Screen name="join" options={{ title: '초대 코드 입력', headerBackTitle: '설정' }} />
          <Stack.Screen name="profile" options={{ title: '프로필', headerBackTitle: '설정' }} />
          <Stack.Screen name="household-name" options={{ title: '가계부 이름', headerBackTitle: '설정' }} />
          <Stack.Screen name="profile-icon" options={{ title: '아이콘 설정', headerBackTitle: '프로필' }} />
          <Stack.Screen name="devices" options={{ title: '로그인한 기기', headerBackTitle: '설정' }} />
          <Stack.Screen name="notifications" options={{ title: '알림 설정', headerBackTitle: '설정' }} />
        </Stack.Protected>
        <Stack.Protected guard={!signedIn}>
          <Stack.Screen name="login" options={{ headerShown: false }} />
        </Stack.Protected>
        <Stack.Screen name="+not-found" />
      </Stack>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
    </NavigationThemeProvider>
  );
}
