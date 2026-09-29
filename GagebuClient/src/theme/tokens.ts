// 디자인 토큰 — 루트 Mockup.png의 크림/핑크 화면 기준.

export type ColorScheme = 'light' | 'dark';

const light = {
  background: '#FFF9F2',
  surface: '#FFFFFF',        // 카드
  surfaceMuted: '#FFF1ED',
  border: '#F6EAE5',
  divider: '#F6EEEA',

  text: '#29232B',
  textSecondary: '#8E8791',
  textTertiary: '#B8AFB7',
  textOnPrimary: '#FFFFFF',

  primary: '#FF557D',
  primarySoft: '#FFE4EA',
  primaryCard: '#FFFFFF',
  primaryCardTile: '#FFF2F4',

  expense: '#FF315F',
  expenseSoft: '#FFE8EE',
  income: '#08B67B',
  incomeSoft: '#E5FAF0',

  chipActive: '#FF557D',
  chipActiveText: '#FFFFFF',
  overlay: 'rgba(20, 16, 12, 0.45)',
  shadow: '#B78C7B',
  heart: '#FF557D',
};

export type ThemeColors = typeof light;

const dark: ThemeColors = {
  background: '#131110',
  surface: '#1E1B19',
  surfaceMuted: '#2A2623',
  border: '#2E2A26',
  divider: '#2A2623',

  text: '#F5F0EA',
  textSecondary: '#A39A91',
  textTertiary: '#6F675F',
  textOnPrimary: '#FFFFFF',

  primary: '#FF557D',
  primarySoft: '#40232B',
  primaryCard: '#1E1B19',
  primaryCardTile: '#35232A',

  expense: '#FF6B88',
  expenseSoft: '#3A211E',
  income: '#45D5A3',
  incomeSoft: '#173D32',

  chipActive: '#F5F0EA',
  chipActiveText: '#131110',
  overlay: 'rgba(0, 0, 0, 0.6)',
  shadow: '#000000',
  heart: '#FF6B5E',
};

export const palette: Record<ColorScheme, ThemeColors> = { light, dark };

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 22,
  pill: 999,
} as const;

// 귀여운 금액 표시용 한글 폰트 (주아체, OFL) — app/_layout.tsx에서 불러옴. 굵기는 하나뿐이라 fontWeight를 주지 말 것
export const CUTE_FONT = 'Jua_400Regular';

export const typography = {
  display: { fontSize: 32, fontWeight: '800' as const, letterSpacing: -0.5 },
  title: { fontSize: 24, fontWeight: '800' as const, letterSpacing: -0.4 },
  heading: { fontSize: 18, fontWeight: '700' as const, letterSpacing: -0.2 },
  body: { fontSize: 15, fontWeight: '500' as const },
  bodyBold: { fontSize: 15, fontWeight: '700' as const },
  caption: { fontSize: 12, fontWeight: '500' as const },
  captionBold: { fontSize: 12, fontWeight: '700' as const },
};
