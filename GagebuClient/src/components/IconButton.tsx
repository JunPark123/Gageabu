import { PropsWithChildren, useRef } from 'react';
import { Animated, Pressable, PressableProps, StyleProp, StyleSheet, ViewStyle } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { useTheme } from '../theme/ThemeProvider';

// 누르면 살짝 작아졌다 돌아오는 영역 (버튼인 것이 느껴지게). 움직임 줄이기 설정이면 투명도만
export function PressableScale({ children, style, disabled, ...rest }: PropsWithChildren<Omit<PressableProps, 'style'> & { style?: StyleProp<ViewStyle> }>) {
  const reduced = useReducedMotion();
  const scale = useRef(new Animated.Value(1)).current;
  const to = (value: number) => Animated.spring(scale, { toValue: value, useNativeDriver: true, speed: 40, bounciness: 8 }).start();
  return (
    <Pressable
      {...rest}
      disabled={disabled}
      onPressIn={(e) => { if (!reduced) to(0.9); rest.onPressIn?.(e); }}
      onPressOut={(e) => { if (!reduced) to(1); rest.onPressOut?.(e); }}
    >
      {({ pressed }) => (
        <Animated.View style={[style, { transform: [{ scale }] }, (pressed || disabled) && { opacity: disabled ? 0.4 : 0.8 }]}>
          {children}
        </Animated.View>
      )}
    </Pressable>
  );
}

// 둥근 네모 박스 아이콘 버튼 — 머리·월 이동 등 공통
export function IconButton({ icon, onPress, label, size = 38, iconSize = 18, disabled, style, tone = 'surface' }: {
  icon: keyof typeof Feather.glyphMap;
  onPress: () => void;
  label: string;
  size?: number;
  iconSize?: number;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  tone?: 'surface' | 'muted';   // surface: 흰 카드색 + 테두리, muted: 옅은 분홍
}) {
  const { colors } = useTheme();
  return (
    <PressableScale
      onPress={onPress}
      disabled={disabled}
      hitSlop={6}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={[
        {
          width: size,
          height: size,
          borderRadius: size * 0.32,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: tone === 'surface' ? colors.surface : colors.surfaceMuted,
          borderWidth: tone === 'surface' ? StyleSheet.hairlineWidth * 2 : 0,
          borderColor: colors.border,
        },
        style,
      ]}
    >
      <Feather name={icon} size={iconSize} color={colors.textSecondary} />
    </PressableScale>
  );
}
