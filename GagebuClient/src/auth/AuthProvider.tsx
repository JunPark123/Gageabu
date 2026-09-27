import { createContext, PropsWithChildren, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Platform } from 'react-native';
import * as Device from 'expo-device';
import { isAxiosError } from 'axios';
import { useQueryClient } from '@tanstack/react-query';
import { onSignedOut } from '../api/client';
import * as authApi from '../api/auth';
import { Me } from '../models/Auth';
import { tokenStore } from './tokenStore';

// 로그인 상태. 로그인 전에는 로그인 화면만 보인다 (app/_layout.tsx)
type AuthStatus = 'loading' | 'signedOut' | 'signedIn';

interface AuthContextValue {
  status: AuthStatus;
  me: Me | null;
  devLogin: (key: string, nickname?: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshMe: () => Promise<void>;
  setMe: (me: Me) => void;   // 내 정보가 바뀌는 요청(프로필·초대 수락·나가기)의 응답을 바로 반영
}

const AuthContext = createContext<AuthContextValue | null>(null);

// 기기 목록에 보일 이름
export function deviceName() {
  if (Platform.OS === 'web') return '웹 브라우저';
  return Device.modelName ?? (Platform.OS === 'ios' ? 'iPhone' : 'Android');
}

export function AuthProvider({ children }: PropsWithChildren) {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [me, setMeState] = useState<Me | null>(null);

  const setMe = useCallback((next: Me) => {
    setMeState(next);
    void tokenStore.setMe(next);
  }, []);

  // 다른 사람의 데이터가 화면에 남지 않게 로그아웃·사용자 바뀜 때 캐시를 비운다
  const signOutLocally = useCallback(() => {
    queryClient.clear();
    setMeState(null);
    setStatus('signedOut');
  }, [queryClient]);

  // 갱신 토큰이 거절되면(기기 끊김·만료) 로그인 화면으로
  useEffect(() => {
    onSignedOut(signOutLocally);
    return () => onSignedOut(null);
  }, [signOutLocally]);

  // 앱 시작: 저장된 토큰이 있으면 내 정보를 받아 로그인 상태로
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const tokens = await tokenStore.get();
      if (!tokens) {
        if (!cancelled) setStatus('signedOut');
        return;
      }
      try {
        const fresh = await authApi.getMe();
        if (cancelled) return;
        setMe(fresh);
        setStatus('signedIn');
      } catch (e) {
        if (cancelled) return;
        if (isAxiosError(e) && e.response?.status === 401) {
          await tokenStore.clear();
          setStatus('signedOut');
          return;
        }
        // 서버에 못 붙음(오프라인 등): 마지막 내 정보로 들어가고, 화면마다 연결 안내가 뜬다
        const cached = await tokenStore.getMe();
        if (cached) {
          setMeState(cached);
          setStatus('signedIn');
        } else {
          setStatus('signedOut');
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [setMe]);

  const devLogin = useCallback(async (key: string, nickname?: string) => {
    const res = await authApi.devLogin(key, nickname, deviceName());
    await tokenStore.set(res);
    queryClient.clear();
    setMe(res.me);
    setStatus('signedIn');
  }, [queryClient, setMe]);

  const logout = useCallback(async () => {
    // 서버에서 이 기기를 끊는다. 실패해도(오프라인) 이 폰에서는 로그아웃
    await authApi.logout().catch(() => {});
    await tokenStore.clear();
    signOutLocally();
  }, [signOutLocally]);

  const refreshMe = useCallback(async () => {
    setMe(await authApi.getMe());
  }, [setMe]);

  const value = useMemo(
    () => ({ status, me, devLogin, logout, refreshMe, setMe }),
    [status, me, devLogin, logout, refreshMe, setMe],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth는 AuthProvider 안에서만 쓸 수 있습니다');
  return ctx;
}

// 로그인된 화면에서만 쓴다 (로그인 전에는 그 화면이 안 보이므로 me가 있음)
export function useMe(): Me {
  const { me } = useAuth();
  if (!me) throw new Error('로그인 정보가 없습니다');
  return me;
}
