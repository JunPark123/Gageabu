// 푸시 알림 (Expo push token → 서버 등록). 앱이 켜져 있을 때는 배너를 띄우지 않는다 — 실시간 반영 + 작은 안내가 대신함
import { Platform } from 'react-native';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import * as Device from 'expo-device';
import { registerPushToken, unregisterPushToken } from '../api/auth';

// Expo Go(안드로이드)는 원격 푸시를 지원하지 않고, expo-notifications를 불러오기만 해도 오류가 난다
// → 설치용 앱에서만, 그리고 모듈은 실제로 쓸 때 불러온다
export const pushAvailable = Platform.OS !== 'web' && Constants.executionEnvironment !== ExecutionEnvironment.StoreClient;

type NotificationsModule = typeof import('expo-notifications');
let module: NotificationsModule | null = null;

export function notificationsModule(): NotificationsModule {
  if (!module) {
    module = require('expo-notifications') as NotificationsModule;
    module.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: false,   // 사용 중에는 방해하지 않기
        shouldShowList: true,      // 알림 목록에는 남김
        shouldPlaySound: false,
        shouldSetBadge: false,
      }),
    });
  }
  return module;
}

let currentToken: string | null = null;

export type PushPermission = 'granted' | 'denied' | 'undetermined' | 'unavailable';

export async function getPushPermission(): Promise<PushPermission> {
  if (!pushAvailable || !Device.isDevice) return 'unavailable';
  const { status } = await notificationsModule().getPermissionsAsync();
  return status === 'granted' ? 'granted' : status === 'denied' ? 'denied' : 'undetermined';
}

// 로그인 상태에서 앱이 켜질 때마다: 채널 → 권한(처음 한 번 묻기) → 토큰 → 서버 등록. 실패해도 앱은 그대로
export async function registerForPush(ask = true): Promise<PushPermission> {
  if (!pushAvailable || !Device.isDevice) return 'unavailable';
  try {
    const Notifications = notificationsModule();
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: '가계부 알림',
        importance: Notifications.AndroidImportance.DEFAULT,
        lightColor: '#FF557D',
      });
    }
    let { status, canAskAgain } = await Notifications.getPermissionsAsync();
    if (status !== 'granted' && ask && canAskAgain) {
      ({ status } = await Notifications.requestPermissionsAsync());
    }
    if (status !== 'granted') return status === 'denied' ? 'denied' : 'undetermined';

    const projectId = Constants.expoConfig?.extra?.eas?.projectId as string | undefined;
    const { data: token } = await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined);
    currentToken = token;
    await registerPushToken(token, Platform.OS);
    return 'granted';
  } catch (e) {
    // Firebase 설정(google-services.json)이 없는 빌드 등
    console.warn('푸시 등록 실패', e);
    return 'unavailable';
  }
}

// 로그아웃 전에: 이 기기 토큰을 서버에서 지운다 (세션이 끊기면 서버도 안 보내지만 깔끔하게)
export async function unregisterForPush() {
  if (!currentToken) return;
  const token = currentToken;
  currentToken = null;
  await unregisterPushToken(token).catch(() => {});
}
