import { createContext, PropsWithChildren, useContext, useMemo } from 'react';
import { useColorScheme } from 'react-native';
import { useSettings } from '../store/settings';
import { ColorScheme, palette, radius, spacing, ThemeColors, typography } from './tokens';

export interface Theme {
  scheme: ColorScheme;
  colors: ThemeColors;
  spacing: typeof spacing;
  radius: typeof radius;
  typography: typeof typography;
}

const ThemeContext = createContext<Theme | null>(null);

// 설정의 테마(시스템/라이트/다크)를 반영. SettingsProvider 안에 둔다
export function ThemeProvider({ children }: PropsWithChildren) {
  const system = useColorScheme();
  const { settings } = useSettings();
  const scheme: ColorScheme =
    settings.themeMode === 'system' ? (system === 'dark' ? 'dark' : 'light') : settings.themeMode;

  const theme = useMemo<Theme>(
    () => ({ scheme, colors: palette[scheme], spacing, radius, typography }),
    [scheme]
  );
  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const theme = useContext(ThemeContext);
  if (!theme) throw new Error('useTheme은 ThemeProvider 안에서만 쓸 수 있습니다');
  return theme;
}

// 테마에 따라 바뀌는 StyleSheet를 만들 때: const styles = useThemedStyles(makeStyles)
export function useThemedStyles<T>(factory: (theme: Theme) => T): T {
  const theme = useTheme();
  return useMemo(() => factory(theme), [factory, theme]);
}
