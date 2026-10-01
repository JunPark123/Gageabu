import { PropsWithChildren, useId } from 'react';
import { View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import { useTheme } from '../theme/ThemeProvider';

export interface DonutSlice {
  value: number;
  color: string;
}

interface DonutChartProps {
  slices: DonutSlice[];
  size?: number;
  thickness?: number;
  progress?: number;         // 0→1: 12시부터 시계 방향으로 한 줄로 채워지는 진입 애니메이션
}

// #RRGGBB를 흰색 쪽으로 섞은 밝은 색 (그라데이션 시작색)
function lighten(hex: string, amount: number) {
  const n = parseInt(hex.slice(1, 7), 16);
  const mix = (c: number) => Math.round(c + (255 - c) * amount);
  const r = mix((n >> 16) & 255), g = mix((n >> 8) & 255), b = mix(n & 255);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

// 도넛 차트: 조각 사이 구분 없이 이어진 고리 + 조각마다 밝은 색→원래 색 그라데이션 + 연한 바탕 고리.
// 가운데 내용은 children으로
export function DonutChart({ slices, size = 180, thickness = 26, progress = 1, children }: PropsWithChildren<DonutChartProps>) {
  const { colors } = useTheme();
  // 한 화면에 도넛이 여러 개(앞뒤 달 페이지) 있어도 그라데이션 id가 겹치지 않게
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const r = (size - thickness) / 2;
  const circumference = 2 * Math.PI * r;
  const shown = slices.filter((s) => s.value > 0);
  const total = shown.reduce((sum, s) => sum + s.value, 0);
  const sweep = circumference * Math.max(0, Math.min(1, progress));
  // 이웃 조각 경계에 바탕이 가는 줄로 비치지 않게 다음 조각 쪽으로 살짝 겹쳐 그린다
  const OVERLAP = 1;
  const inner = size - thickness * 2;

  let offset = 0;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      {/* 12시 방향부터 시작하도록 통째로 -90도 회전 */}
      <Svg width={size} height={size} style={{ position: 'absolute', transform: [{ rotate: '-90deg' }] }}>
        <Defs>
          {shown.map((s, i) => (
            <LinearGradient key={i} id={`donut${uid}g${i}`} x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor={lighten(s.color, 0.35)} />
              <Stop offset="1" stopColor={s.color} />
            </LinearGradient>
          ))}
        </Defs>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={colors.surfaceMuted} strokeWidth={thickness} fill="none" />
        {total > 0 &&
          shown.map((s, i) => {
            const length = (s.value / total) * circumference;
            const start = offset;
            offset += length;
            // 채워진 만큼만: 이 조각의 시작을 지난 길이 (마지막 조각이 아니면 살짝 겹침)
            const visible = Math.min(length + (i < shown.length - 1 ? OVERLAP : 0), sweep - start);
            if (visible <= 0) return null;
            return (
              <Circle
                key={i}
                cx={size / 2}
                cy={size / 2}
                r={r}
                stroke={`url(#donut${uid}g${i})`}
                strokeWidth={thickness}
                strokeLinecap="butt"
                fill="none"
                strokeDasharray={`${visible} ${circumference}`}
                strokeDashoffset={-start}
              />
            );
          })}
      </Svg>
      <View style={{ alignItems: 'center', justifyContent: 'center', maxWidth: inner - 16 }}>{children}</View>
    </View>
  );
}
