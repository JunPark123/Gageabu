// 카카오 로그인 (네이티브 SDK). 앱 키는 app.json(플러그인·extra.kakaoNativeAppKey) — 앱에 들어가는 공개 값
import { Platform } from 'react-native';
import Constants, { ExecutionEnvironment } from 'expo-constants';

// 웹 미리보기는 JavaScript 키·리다이렉트가 따로 필요해서 지금은 설치용 앱(APK)에서만.
// Expo Go에는 카카오 네이티브 모듈이 없어 불러오기만 해도 앱이 멈추므로 제외하고, 모듈은 실제로 쓸 때 불러온다
export const kakaoLoginAvailable = Platform.OS !== 'web' && Constants.executionEnvironment !== ExecutionEnvironment.StoreClient;

const sdk = () => ({
  core: require('@react-native-kakao/core') as typeof import('@react-native-kakao/core'),
  user: require('@react-native-kakao/user') as typeof import('@react-native-kakao/user'),
});

const appKey = Constants.expoConfig?.extra?.kakaoNativeAppKey as string | undefined;
let initialized: Promise<void> | null = null;

function ensureInitialized() {
  if (!kakaoLoginAvailable) throw new Error('카카오 로그인은 설치용 앱에서만 할 수 있어요');
  if (!appKey) throw new Error('카카오 앱 키가 설정되지 않았어요');
  initialized ??= sdk().core.initializeKakaoSDK(appKey);
  return initialized;
}

// 사용자가 로그인 창을 닫은 경우 — 오류 안내를 띄우지 않는다
export class KakaoCancelledError extends Error {}

// 카카오톡이 있으면 카카오톡으로, 없으면 카카오 계정(웹뷰)으로 로그인 → 카카오 accessToken
export async function kakaoSignIn(): Promise<string> {
  await ensureInitialized();
  try {
    const token = await sdk().user.login();
    return token.accessToken;
  } catch (e) {
    const text = `${(e as { code?: string })?.code ?? ''} ${(e as Error)?.message ?? ''}`.toLowerCase();
    if (text.includes('cancel')) throw new KakaoCancelledError('cancelled');
    throw e;
  }
}

// 우리 앱 로그아웃 때 카카오 SDK 쪽 토큰도 지운다 (실패해도 무시)
export async function kakaoSignOut() {
  if (!kakaoLoginAvailable || !appKey || !initialized) return;   // 이번 실행에서 카카오를 안 썼으면 건너뜀
  try {
    await ensureInitialized();
    await sdk().user.logout();
  } catch {
    // 이미 로그아웃됨 등
  }
}
