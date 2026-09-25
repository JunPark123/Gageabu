import { DarkTheme, DefaultTheme, ThemeProvider as NavigationThemeProvider } from 'expo-router/react-navigation';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo } from 'react';
import { AppState } from 'react-native';
import { focusManager, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import 'react-native-reanimated';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { SettingsProvider, useSettings } from '@/src/store/settings';
import { ThemeProvider, useTheme } from '@/src/theme/ThemeProvider';


// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

// 앱이 백그라운드에서 돌아오면 오래된 조회를 다시 가져오도록 (RN에는 브라우저 focus 이벤트가 없음)
AppState.addEventListener('change', (status) => {
  focusManager.setFocused(status === 'active');
});

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <SettingsProvider>
            <ThemeProvider>
              <AppStack />
            </ThemeProvider>
          </SettingsProvider>
        </GestureHandlerRootView>
      </SafeAreaProvider>
    </QueryClientProvider>
  );
}

function AppStack() {
  const { loaded } = useSettings();
  const { scheme, colors } = useTheme();

  // 저장된 테마 설정을 읽기 전에 화면을 보여주면 라이트↔다크가 번쩍이므로 그때까지 스플래시 유지
  useEffect(() => {
    if (loaded) SplashScreen.hideAsync();
  }, [loaded]);

  const navigationTheme = useMemo(() => {
    const base = scheme === 'dark' ? DarkTheme : DefaultTheme;
    return { ...base, colors: { ...base.colors, background: colors.background, card: colors.surface, text: colors.text, border: colors.border, primary: colors.primary } };
  }, [scheme, colors]);

  if (!loaded) return null;

  return (
    <NavigationThemeProvider value={navigationTheme}>
      <Stack initialRouteName="(tabs)">
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="+not-found" />
      </Stack>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
    </NavigationThemeProvider>
  );
}
