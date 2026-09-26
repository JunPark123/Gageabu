import { createContext, PropsWithChildren, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

// 이 기기에만 저장하는 설정. 예산·프로필은 3단계(로그인·커플 연결)에서 서버로 옮긴다
export type ThemeMode = 'system' | 'light' | 'dark';

export interface Settings {
  themeMode: ThemeMode;
  monthlyBudget: number | null;   // 기본 월 예산 (원). null이면 미설정
  budgetOverrides: Record<string, number>; // 달별 예외 ('YYYY-MM' → 원, 0이면 그 달은 예산 없음)
  nickname: string;
  avatar: string;                 // 이모지
}

const DEFAULT_SETTINGS: Settings = {
  themeMode: 'system',
  monthlyBudget: null,
  budgetOverrides: {},
  nickname: '나',
  avatar: '🐷',
};

export const monthKey = (year: number, monthIndex: number) => `${year}-${String(monthIndex + 1).padStart(2, '0')}`;

// 그 달에 적용되는 예산: 달별 예외가 있으면 그것, 없으면 기본 예산
export function budgetFor(settings: Settings, year: number, monthIndex: number) {
  const key = monthKey(year, monthIndex);
  if (key in settings.budgetOverrides) {
    return { amount: settings.budgetOverrides[key] || null, isOverride: true };
  }
  return { amount: settings.monthlyBudget, isOverride: false };
}

const STORAGE_KEY = 'gageabu.settings.v1';

interface SettingsContextValue {
  settings: Settings;
  loaded: boolean;
  updateSettings: (patch: Partial<Settings>) => void;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: PropsWithChildren) {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (raw) setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(raw) });
      })
      .catch((e) => console.warn('설정 불러오기 실패', e))
      .finally(() => setLoaded(true));
  }, []);

  const updateSettings = useCallback((patch: Partial<Settings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch((e) => console.warn('설정 저장 실패', e));
      return next;
    });
  }, []);

  const value = useMemo(() => ({ settings, loaded, updateSettings }), [settings, loaded, updateSettings]);
  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings는 SettingsProvider 안에서만 쓸 수 있습니다');
  return ctx;
}
