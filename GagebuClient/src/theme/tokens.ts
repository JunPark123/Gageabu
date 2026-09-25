// 디자인 토큰 — docs/gageabumockup.png 기준. 화면 코드에는 색 값을 직접 쓰지 말고 여기 이름을 쓴다.

export type ColorScheme = 'light' | 'dark';

const light = {
  background: '#FBF6EE',     // 크림색 바탕
  surface: '#FFFFFF',        // 카드
  surfaceMuted: '#F4EEE5',   // 세그먼트·입력 칸 바탕
  border: '#EEE6DA',
  divider: '#F2ECE3',

  text: '#221C17',
  textSecondary: '#8C837A',
  textTertiary: '#B5ACA2',
  textOnPrimary: '#221C17',  // 노란 바탕 위 글자

  primary: '#FFD740',        // 노랑 (FAB, 요약 카드, 저장 버튼)
  primarySoft: '#FFF3C4',
  primaryCard: '#FFD84D',
  primaryCardTile: '#FFE68A',

  expense: '#E0483C',
  expenseSoft: '#FDECEA',
  income: '#2F66E0',
  incomeSoft: '#E8EFFD',

  chipActive: '#221C17',
  chipActiveText: '#FFFFFF',
  overlay: 'rgba(20, 16, 12, 0.45)',
  shadow: '#5A4A32',
  heart: '#E0483C',
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
  textOnPrimary: '#221C17',

  primary: '#FFD740',
  primarySoft: '#3A3218',
  primaryCard: '#2A2519',
  primaryCardTile: '#35301F',

  expense: '#FF6B5E',
  expenseSoft: '#3A211E',
  income: '#6C9BFF',
  incomeSoft: '#1D2640',

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

export const typography = {
  display: { fontSize: 32, fontWeight: '800' as const, letterSpacing: -0.5 },
  title: { fontSize: 24, fontWeight: '800' as const, letterSpacing: -0.4 },
  heading: { fontSize: 18, fontWeight: '700' as const, letterSpacing: -0.2 },
  body: { fontSize: 15, fontWeight: '500' as const },
  bodyBold: { fontSize: 15, fontWeight: '700' as const },
  caption: { fontSize: 12, fontWeight: '500' as const },
  captionBold: { fontSize: 12, fontWeight: '700' as const },
};
