import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';

interface ProgressBarProps {
  ratio: number;          // 0~1 (넘으면 가득 참)
  color?: string;
  marker?: string;        // 채워진 끝에 붙는 이모지
}

export function ProgressBar({ ratio, color, marker }: ProgressBarProps) {
  const { colors } = useTheme();
  const pct = Math.max(0, Math.min(1, ratio)) * 100;
  return (
    <View style={styles.wrap}>
      <View style={[styles.track, { backgroundColor: colors.surfaceMuted }]}>
        <View style={[styles.fill, { width: `${pct}%`, backgroundColor: color ?? colors.primary }]} />
      </View>
      {marker && (
        <Text style={[styles.marker, { left: `${pct}%` }]} accessibilityElementsHidden>
          {marker}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { height: 20, justifyContent: 'center' },
  track: { height: 10, borderRadius: 5, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 5 },
  marker: { position: 'absolute', fontSize: 16, marginLeft: -10, top: -1 },
});
