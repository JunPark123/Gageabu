import { PropsWithChildren } from 'react';
import { View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { useTheme } from '../theme/ThemeProvider';

export interface DonutSlice {
  value: number;
  color: string;
}

interface DonutChartProps {
  slices: DonutSlice[];
  size?: number;
  thickness?: number;
}

// 도넛 차트. 가운데 내용은 children으로
export function DonutChart({ slices, size = 180, thickness = 28, children }: PropsWithChildren<DonutChartProps>) {
  const { colors } = useTheme();
  const r = (size - thickness) / 2;
  const circumference = 2 * Math.PI * r;
  const total = slices.reduce((sum, s) => sum + s.value, 0);
  const gap = slices.length > 1 ? 2 : 0; // 조각 사이 틈 (px)

  let offset = 0;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      {/* 12시 방향부터 시작하도록 통째로 -90도 회전 */}
      <Svg width={size} height={size} style={{ position: 'absolute', transform: [{ rotate: '-90deg' }] }}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={colors.surfaceMuted} strokeWidth={thickness} fill="none" />
          {total > 0 &&
            slices.map((s, i) => {
              const length = (s.value / total) * circumference;
              const dash = Math.max(length - gap, 0);
              const el = (
                <Circle
                  key={i}
                  cx={size / 2}
                  cy={size / 2}
                  r={r}
                  stroke={s.color}
                  strokeWidth={thickness}
                  fill="none"
                  strokeDasharray={`${dash} ${circumference - dash}`}
                  strokeDashoffset={-offset}
                />
              );
              offset += length;
              return el;
            })}
      </Svg>
      {children}
    </View>
  );
}
