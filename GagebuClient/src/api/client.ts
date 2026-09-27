import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { tokenStore } from '../auth/tokenStore';
import { AuthTokens } from '../models/Auth';

// Windows에서 실행하는 Expo가 GagebuClient/.env.local에서 읽는다.
export const API_URL = process.env.EXPO_PUBLIC_API_URL;
if (!API_URL) {
  console.warn('EXPO_PUBLIC_API_URL이 설정되지 않았습니다. GagebuClient/.env.local을 확인하세요.');
}

// timeout: 서버 주소가 틀리거나 꺼져 있을 때 끝없이 기다리지 않도록 (폰 기본값은 제한 없음)
export const API = axios.create({
  baseURL: API_URL,
  timeout: 6000,
});

declare module 'axios' {
  interface AxiosRequestConfig {
    skipAuth?: boolean;     // 로그인·토큰 갱신 요청: 토큰을 붙이지 않고, 401이어도 갱신하지 않음
  }
}

interface RetryConfig extends InternalAxiosRequestConfig {
  _retried?: boolean;
}

// 갱신 토큰이 거절돼 다시 로그인해야 할 때 (AuthProvider가 등록)
let signedOutListener: (() => void) | null = null;
export function onSignedOut(listener: (() => void) | null) {
  signedOutListener = listener;
}

type RefreshResult = 'ok' | 'rejected' | 'failed';
let refreshing: Promise<RefreshResult> | null = null;

// 토큰 갱신은 한 번에 하나만 (여러 요청이 동시에 401을 받아도 갱신은 한 번)
export function refreshTokens(): Promise<RefreshResult> {
  refreshing ??= doRefresh().finally(() => {
    refreshing = null;
  });
  return refreshing;
}

async function doRefresh(): Promise<RefreshResult> {
  const tokens = await tokenStore.get();
  if (!tokens) return 'rejected';
  try {
    const res = await API.post<AuthTokens>('/api/auth/refresh', { refreshToken: tokens.refreshToken }, { skipAuth: true });
    await tokenStore.set(res.data);
    return 'ok';
  } catch (e) {
    // 서버가 거절(401) = 다시 로그인. 연결 실패 등은 로그인을 유지하고 원래 오류를 보여준다
    if (axios.isAxiosError(e) && e.response?.status === 401) {
      await tokenStore.clear();
      signedOutListener?.();
      return 'rejected';
    }
    return 'failed';
  }
}

// 곧 만료될 접근 토큰은 요청 전에 미리 갱신 (401 왕복 한 번 절약)
const EXPIRY_MARGIN_MS = 30_000;

API.interceptors.request.use(async (config) => {
  if (config.skipAuth) return config;
  let tokens = await tokenStore.get();
  if (tokens && Date.parse(tokens.expiresAt) - Date.now() < EXPIRY_MARGIN_MS) {
    await refreshTokens();
    tokens = await tokenStore.get();
  }
  if (tokens) config.headers.Authorization = `Bearer ${tokens.token}`;
  return config;
});

// 401이면 토큰을 갱신해서 한 번만 다시 보낸다
API.interceptors.response.use(undefined, async (error: AxiosError) => {
  const config = error.config as RetryConfig | undefined;
  if (error.response?.status !== 401 || !config || config.skipAuth || config._retried) throw error;
  if (!(await tokenStore.get())) throw error;

  config._retried = true;
  const result = await refreshTokens();
  if (result !== 'ok') throw error;
  return API(config);
});
