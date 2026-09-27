import { ReactNode, useState } from 'react';
import { StyleSheet, View } from 'react-native';
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
  const center = Math.max(half, Math.min(width - half, (width * pct) / 100));

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
        <View style={[styles.fill, { width: `${pct}%`, backgroundColor: color ?? colors.primary }]} />
      </View>
      {/* 폭을 재기 전에는 위치를 모르니 그리지 않음 */}
      {marker && width > 0 && (
        <View style={[styles.marker, { left: center - half, width: markerSize, height: markerSize }]} pointerEvents="none">
          {marker}
        </View>
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
