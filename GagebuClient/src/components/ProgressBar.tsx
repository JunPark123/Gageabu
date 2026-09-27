import { ReactNode, useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { useTheme } from '../theme/ThemeProvider';

interface ProgressBarProps {
  position: number;       // 0~100 (%; 밖의 값은 끝에 고정)
  color?: string;
  marker?: ReactNode;     // 채워진 끝에 붙는 표시 (예: 돼지 얼굴)
  markerSize?: number;
  label: string;          // 읽기용 이름 (예: "9월 예산")
  valueText: string;      // 읽기용 값 (예: "77% 사용, 살짝 걱정하는 돼지")
}

const TRACK_HEIGHT = 8;

// 읽기 전용 막대 (입력 슬라이더 아님). 표시는 채워진 끝에 두되 0%·100%에서도 잘리지 않게 안쪽으로 보정
export function ProgressBar({ position, color, marker, markerSize = 28, label, valueText }: ProgressBarProps) {
  const { colors } = useTheme();
  const [width, setWidth] = useState(0);
  const pct = Math.max(0, Math.min(100, position));
  const half = markerSize / 2;
  const reduced = useReducedMotion();

  // 값이 바뀌면 채움과 얼굴이 미끄러지듯 이동 (처음 그릴 때는 바로 그 자리)
  const anim = useRef(new Animated.Value(pct)).current;
  useEffect(() => {
    if (reduced) {
      anim.setValue(pct);
      return;
    }
    const a = Animated.timing(anim, { toValue: pct, duration: 380, easing: Easing.out(Easing.cubic), useNativeDriver: false });
    a.start();
    return () => a.stop();
  }, [pct, reduced, anim]);

  // 얼굴 왼쪽 위치: 채워진 끝에 가운데를 맞추되 양 끝에서는 안쪽으로 (0%·100%에서 잘리지 않게)
  const edge = width > markerSize ? (half / width) * 100 : 50;
  const markerLeft = anim.interpolate({
    inputRange: [0, edge, 100 - edge, 100],
    outputRange: [0, 0, Math.max(0, width - markerSize), Math.max(0, width - markerSize)],
    extrapolate: 'clamp',
  });
  const fillWidth = anim.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'], extrapolate: 'clamp' });

  return (
    <View
      style={[styles.wrap, { height: Math.max(TRACK_HEIGHT, markerSize) }]}
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      // accessibilityValue는 웹에서 aria-value*로 안 나가서 aria 속성으로 (RN도 같은 뜻으로 읽음)
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(pct)}
      aria-valuetext={valueText}
    >
      <View style={[styles.track, { backgroundColor: colors.surfaceMuted }]}>
        <Animated.View style={[styles.fill, { width: fillWidth, backgroundColor: color ?? colors.primary }]} />
      </View>
      {/* 폭을 재기 전에는 위치를 모르니 그리지 않음 */}
      {marker && width > 0 && (
        <Animated.View style={[styles.marker, { left: markerLeft, width: markerSize, height: markerSize }]} pointerEvents="none">
          {marker}
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { justifyContent: 'center' },
  track: { height: TRACK_HEIGHT, borderRadius: TRACK_HEIGHT / 2, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: TRACK_HEIGHT / 2 },
  marker: { position: 'absolute', top: 0 },
});
