// 카카오 로그인 (네이티브 SDK). 앱 키는 app.json(플러그인·extra.kakaoNativeAppKey) — 앱에 들어가는 공개 값
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { initializeKakaoSDK } from '@react-native-kakao/core';
import { login, logout } from '@react-native-kakao/user';

// 웹 미리보기는 JavaScript 키·리다이렉트가 따로 필요해서 지금은 폰 앱에서만
export const kakaoLoginAvailable = Platform.OS !== 'web';

const appKey = Constants.expoConfig?.extra?.kakaoNativeAppKey as string | undefined;
let initialized: Promise<void> | null = null;

function ensureInitialized() {
  if (!appKey) throw new Error('카카오 앱 키가 설정되지 않았어요');
  initialized ??= initializeKakaoSDK(appKey);
  return initialized;
}

// 사용자가 로그인 창을 닫은 경우 — 오류 안내를 띄우지 않는다
export class KakaoCancelledError extends Error {}

// 카카오톡이 있으면 카카오톡으로, 없으면 카카오 계정(웹뷰)으로 로그인 → 카카오 accessToken
export async function kakaoSignIn(): Promise<string> {
  await ensureInitialized();
  try {
    const token = await login();
    return token.accessToken;
  } catch (e) {
    const text = `${(e as { code?: string })?.code ?? ''} ${(e as Error)?.message ?? ''}`.toLowerCase();
    if (text.includes('cancel')) throw new KakaoCancelledError('cancelled');
    throw e;
  }
}

// 우리 앱 로그아웃 때 카카오 SDK 쪽 토큰도 지운다 (실패해도 무시)
export async function kakaoSignOut() {
  if (!kakaoLoginAvailable || !appKey) return;
  try {
    await ensureInitialized();
    await logout();
  } catch {
    // 이미 로그아웃됨 등
  }
}
