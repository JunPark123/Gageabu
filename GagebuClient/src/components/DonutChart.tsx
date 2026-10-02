import { PropsWithChildren } from 'react';
import { View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import Animated, { SharedValue, useAnimatedProps } from 'react-native-reanimated';
import { useTheme } from '../theme/ThemeProvider';

export interface DonutSlice {
  value: number;
  color: string;
}

interface DonutChartProps {
  slices: DonutSlice[];
  size?: number;
  thickness?: number;
  progress?: number | SharedValue<number>;
}

// 도넛 차트: 실제 비율을 유지하는 단색 조각과 연한 바탕 고리.
// 가운데 내용은 children으로
export function DonutChart({ slices, size = 180, thickness = 26, progress = 1, children }: PropsWithChildren<DonutChartProps>) {
  const { colors } = useTheme();
  const r = (size - thickness) / 2;
  const circumference = 2 * Math.PI * r;
  const shown = slices.filter((s) => s.value > 0);
  const total = shown.reduce((sum, s) => sum + s.value, 0);
  const inner = size - thickness * 2;

  let offset = 0;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      {/* 12시 방향부터 시작하도록 통째로 -90도 회전 */}
      <Svg width={size} height={size} style={{ position: 'absolute', transform: [{ rotate: '-90deg' }] }}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={colors.surfaceMuted} strokeWidth={thickness} fill="none" />
        {total > 0 &&
          shown.map((s, i) => {
            const length = (s.value / total) * circumference;
            const start = offset;
            offset += length;
            // 실제 조각 크기를 바꾸지 않고 진입 애니메이션만 적용한다.
            return (
              <DonutArc
                key={i}
                progress={progress}
                length={length}
                start={start}
                circumference={circumference}
                cx={size / 2}
                cy={size / 2}
                r={r}
                stroke={s.color}
                strokeWidth={thickness}
                strokeLinecap="butt"
                fill="none"
                strokeDashoffset={-start}
              />
            );
          })}
      </Svg>
      <View style={{ alignItems: 'center', justifyContent: 'center', maxWidth: inner - 16 }}>{children}</View>
    </View>
  );
}

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

function DonutArc({ progress, length, start, circumference, ...props }: React.ComponentProps<typeof Circle> & {
  progress: number | SharedValue<number>; length: number; start: number; circumference: number;
}) {
  const animatedProps = useAnimatedProps(() => {
    const fraction = typeof progress === 'number' ? progress : progress.value;
    const visible = Math.max(0, Math.min(length, circumference * Math.max(0, Math.min(1, fraction)) - start));
    return { strokeDasharray: [visible, circumference], opacity: visible > 0 ? 1 : 0 };
  });
  return <AnimatedCircle {...props} animatedProps={animatedProps} />;
}
