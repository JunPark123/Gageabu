import { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Theme, useThemedStyles } from '../theme/ThemeProvider';

// 화면 위에 잠깐 떴다 사라지는 작은 안내 (소리·진동·버튼 없음, 터치를 막지 않음)
type Listener = (text: string) => void;
const listeners = new Set<Listener>();

export function showToast(text: string) {
  listeners.forEach((l) => l(text));
}

export function ToastHost() {
  const styles = useThemedStyles(makeStyles);
  const insets = useSafeAreaInsets();
  const [text, setText] = useState<string | null>(null);
  const opacity = useRef(new Animated.Value(0)).current;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const listener: Listener = (next) => {
      setText(next);
      Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }).start();
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        Animated.timing(opacity, { toValue: 0, duration: 250, useNativeDriver: true }).start(({ finished }) => finished && setText(null));
      }, 2600);
    };
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
      if (timer.current) clearTimeout(timer.current);
    };
  }, [opacity]);

  if (!text) return null;
  return (
    <Animated.View
      pointerEvents="none"
      accessibilityLiveRegion="polite"
      style={[styles.toast, { top: insets.top + 8, opacity, transform: [{ translateY: opacity.interpolate({ inputRange: [0, 1], outputRange: [-8, 0] }) }] }]}
    >
      <Text style={styles.text} numberOfLines={2}>{text}</Text>
    </Animated.View>
  );
}

const makeStyles = ({ colors, radius, spacing, typography }: Theme) =>
  StyleSheet.create({
    toast: {
      position: 'absolute',
      alignSelf: 'center',
      maxWidth: '86%',
      paddingHorizontal: spacing.lg,
      paddingVertical: 10,
      borderRadius: radius.pill,
      backgroundColor: colors.text,
      shadowColor: '#000',
      shadowOpacity: 0.15,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 4 },
      elevation: 6,
      zIndex: 100,
    },
    text: { ...typography.captionBold, fontSize: 13, color: colors.background, textAlign: 'center' },
  });
