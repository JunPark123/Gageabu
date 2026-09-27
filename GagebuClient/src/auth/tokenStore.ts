import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { AuthTokens, Me } from '../models/Auth';

// 로그인 토큰 저장. 폰은 암호화 저장소(Keychain/Keystore), 웹 미리보기는 브라우저 저장소(개발용)
const TOKENS_KEY = 'gageabu.auth.v1';
// 마지막으로 받은 내 정보 — 서버에 못 붙을 때(오프라인)도 로그인 상태로 앱을 열기 위해
const ME_KEY = 'gageabu.me.v1';

const secure = Platform.OS !== 'web';

async function read(key: string) {
  return secure ? SecureStore.getItemAsync(key) : AsyncStorage.getItem(key);
}
async function write(key: string, value: string) {
  return secure ? SecureStore.setItemAsync(key, value) : AsyncStorage.setItem(key, value);
}
async function remove(key: string) {
  return secure ? SecureStore.deleteItemAsync(key) : AsyncStorage.removeItem(key);
}

// 요청마다 저장소를 읽지 않게 메모리에 둔다 (undefined = 아직 안 읽음)
let cache: AuthTokens | null | undefined;

export const tokenStore = {
  async get(): Promise<AuthTokens | null> {
    if (cache === undefined) {
      try {
        const raw = await read(TOKENS_KEY);
        cache = raw ? (JSON.parse(raw) as AuthTokens) : null;
      } catch (e) {
        console.warn('로그인 정보 읽기 실패', e);
        cache = null;
      }
    }
    return cache;
  },

  async set(tokens: AuthTokens) {
    cache = { token: tokens.token, expiresAt: tokens.expiresAt, refreshToken: tokens.refreshToken, sessionId: tokens.sessionId };
    await write(TOKENS_KEY, JSON.stringify(cache));
  },

  async clear() {
    cache = null;
    await Promise.all([remove(TOKENS_KEY), AsyncStorage.removeItem(ME_KEY)]);
  },

  async getMe(): Promise<Me | null> {
    try {
      const raw = await AsyncStorage.getItem(ME_KEY);
      return raw ? (JSON.parse(raw) as Me) : null;
    } catch {
      return null;
    }
  },

  async setMe(me: Me) {
    await AsyncStorage.setItem(ME_KEY, JSON.stringify(me)).catch(() => {});
  },
};
