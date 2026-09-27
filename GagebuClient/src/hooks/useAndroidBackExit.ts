import { useEffect, useRef } from 'react';
import { BackHandler, Platform, ToastAndroid } from 'react-native';
import { router, usePathname } from 'expo-router';

const EXIT_WINDOW_MS = 2000;
const TAB_PATHS = ['/', '/history', '/stats', '/settings'];

// Android 뒤로가기: 다른 탭이면 홈 탭으로, 홈에서는 2초 안에 두 번 눌러야 종료 (docs/PLAN.md 2.5단계 결정)
// 시트(Modal)가 열려 있으면 Modal이 먼저 뒤로가기를 받아 시트를 닫으므로 여기까지 오지 않는다.
// iOS는 뒤로가기 버튼·앱 종료 개념이 없어서 해당 없음
export function useAndroidBackExit() {
  const pathname = usePathname();
  const lastPressedAt = useRef(0);

  useEffect(() => {
    if (Platform.OS !== 'android') return;

    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      // 탭 위에 쌓인 화면(가계부 공유·기기 등)은 기본 동작 = 이전 화면으로 (여기서 가로채면 홈으로 튀었음)
      if (!TAB_PATHS.includes(pathname)) return false;
      if (pathname !== '/') {
        router.navigate('/');
        return true;
      }
      const now = Date.now();
      if (now - lastPressedAt.current < EXIT_WINDOW_MS) {
        BackHandler.exitApp();
        return true;
      }
      lastPressedAt.current = now;
      ToastAndroid.show('한 번 더 누르면 종료돼요', ToastAndroid.SHORT);
      return true;
    });
    return () => sub.remove();
  }, [pathname]);
}
