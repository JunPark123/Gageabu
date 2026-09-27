import { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';

interface ProgressBarProps {
  ratio: number;          // 0~1 (넘으면 가득 참)
  color?: string;
  marker?: ReactNode;     // 채워진 끝에 붙는 표시 (예: 돼지 그림)
  markerSize?: number;
}

export function ProgressBar({ ratio, color, marker, markerSize = 24 }: ProgressBarProps) {
  const { colors } = useTheme();
  const pct = Math.max(0, Math.min(1, ratio)) * 100;
  return (
    <View style={[styles.wrap, { height: Math.max(20, markerSize) }]}>
      <View style={[styles.track, { backgroundColor: colors.surfaceMuted }]}>
        <View style={[styles.fill, { width: `${pct}%`, backgroundColor: color ?? colors.primary }]} />
      </View>
      {marker && (
        <View style={[styles.marker, { left: `${pct}%`, marginLeft: -markerSize / 2, width: markerSize, height: markerSize }]} accessibilityElementsHidden>
          {marker}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { justifyContent: 'center' },
  track: { height: 10, borderRadius: 5, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 5 },
  marker: { position: 'absolute', top: 0 },
});
