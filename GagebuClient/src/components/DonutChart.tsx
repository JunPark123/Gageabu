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
  progress?: number;         // 0에서 시작해 조각이 채워지는 진입 애니메이션
}

// 도넛 차트: 둥근 끝 조각 + 조각 사이 틈 + 가운데 흰 원(그림자). 가운데 내용은 children으로
export function DonutChart({ slices, size = 180, thickness = 26, progress = 1, children }: PropsWithChildren<DonutChartProps>) {
  const { colors, scheme } = useTheme();
  const r = (size - thickness) / 2;
  const circumference = 2 * Math.PI * r;
  const total = slices.reduce((sum, s) => sum + s.value, 0);
  const shown = slices.filter((s) => s.value > 0);
  const single = shown.length <= 1;
  // 둥근 끝은 양쪽으로 두께의 절반씩 튀어나오므로 그만큼 줄이고 틈을 더한다.
  // 짧은 조각은 둥근 끝이면 동그란 점처럼 부풀어 보이므로 평평한 끝 + 작은 틈
  const GAP = 4;
  const reveal = Math.max(0, Math.min(1, progress));
  const inner = size - thickness * 2 - 10;

  let offset = 0;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      {/* 12시 방향부터 시작하도록 통째로 -90도 회전 */}
      <Svg width={size} height={size} style={{ position: 'absolute', transform: [{ rotate: '-90deg' }] }}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={colors.surfaceMuted} strokeWidth={thickness} fill="none" />
        {total > 0 &&
          shown.map((s, i) => {
            const length = (s.value / total) * circumference;
            const round = !single && length > thickness * 2;
            const trim = single ? 0 : round ? thickness + GAP : GAP;
            const dash = Math.max(length * reveal - trim, 0.01);
            const el = (
              <Circle
                key={i}
                cx={size / 2}
                cy={size / 2}
                r={r}
                stroke={s.color}
                strokeWidth={thickness}
                strokeLinecap={round ? 'round' : 'butt'}
                fill="none"
                strokeDasharray={`${dash} ${circumference - dash}`}
                strokeDashoffset={-(offset + trim / 2)}
              />
            );
            offset += length;
            return el;
          })}
      </Svg>
      {/* 가운데 원 */}
      <View
        style={{
          position: 'absolute',
          width: inner,
          height: inner,
          borderRadius: inner / 2,
          backgroundColor: colors.surface,
          shadowColor: colors.shadow,
          shadowOpacity: scheme === 'dark' ? 0 : 0.12,
          shadowRadius: 10,
          shadowOffset: { width: 0, height: 3 },
          elevation: 3,
        }}
      />
      <View style={{ alignItems: 'center', justifyContent: 'center', maxWidth: inner - 12 }}>{children}</View>
    </View>
  );
}
