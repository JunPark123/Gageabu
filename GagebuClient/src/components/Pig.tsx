import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Animated, Easing, Image, StyleSheet, View } from 'react-native';
import { useReducedMotion } from '../hooks/useReducedMotion';
import type { PigFaceState, PigMainState } from '../lib/pigState';

// 돼지 그림 — docs/design/pig-react-kit 원본(1254px)을 표시 크기에 맞춰 줄인 사본 (assets/images/pig, @2x/@3x)
// 그림은 늘이거나 고치지 말고 상자 크기만 정할 것. PNG에 투명 여백이 있어 96px 상자에서 그림은 약 65~80px

const MAIN: Record<PigMainState, { source: number; label: string }> = {
  wealthy: { source: require('@/assets/images/pig/main_wealthy.png'), label: '부유한 돼지' },
  normal: { source: require('@/assets/images/pig/main_normal.png'), label: '보통 돼지' },
  hungry: { source: require('@/assets/images/pig/main_hungry.png'), label: '배고픈 돼지' },
};

const FACE: Record<PigFaceState, { source: number; label: string }> = {
  happy: { source: require('@/assets/images/pig/face_happy.png'), label: '웃는 돼지' },
  concerned: { source: require('@/assets/images/pig/face_concerned.png'), label: '살짝 걱정하는 돼지' },
  crying: { source: require('@/assets/images/pig/face_crying.png'), label: '우는 돼지' },
};

export const pigFaceLabel = (state: PigFaceState) => FACE[state].label;

interface PigImageProps {
  size?: number;
  decorative?: boolean; // 기본은 장식 — 뜻은 옆 글자(상태 문구, 바 읽기 텍스트)가 전달
}

// 요약 카드용 (96px 기준, 80~96px). state는 예산 정책(pigStatus)에서 명시적으로 받는다
export function PigMain({ state, size = 96, decorative = true }: PigImageProps & { state: PigMainState }) {
  return <PigImage item={MAIN[state]} size={size} decorative={decorative} />;
}

// 예산 바 표시용 얼굴 (28px 기준, 24~28px)
export function PigFace({ state, size = 28, decorative = true }: PigImageProps & { state: PigFaceState }) {
  return <PigImage item={FACE[state]} size={size} decorative={decorative} />;
}

type PigItem = { source: number; label: string };

const SWAP_DURATION = 380;

// 상태가 바뀌면 이전 그림은 흐려지며 빠지고 새 그림이 톡 커지며 나타남 (움직임 줄이기 설정이면 바로 교체)
function PigImage({ item, size, decorative }: { item: PigItem; size: number; decorative: boolean }) {
  const reduced = useReducedMotion();
  const [current, setCurrent] = useState(item);
  const [previous, setPrevious] = useState<PigItem | null>(null);
  const progress = useRef(new Animated.Value(1)).current;
  const started = useRef(false);

  // 렌더 중에 바로 바꿔야 새 그림이 한 프레임 먼저 보이는 깜빡임이 없음
  if (item !== current) {
    setPrevious(reduced ? null : current);
    setCurrent(item);
  }

  // 그리기 전에 새 그림을 투명하게 — 새 그림이 불러와지면(onLoad) 애니메이션 시작
  useLayoutEffect(() => {
    if (!previous) return;
    started.current = false;
    progress.setValue(0);
  }, [previous, current, progress]);

  const start = () => {
    if (!previous || started.current) return;
    started.current = true;
    Animated.timing(progress, { toValue: 1, duration: SWAP_DURATION, easing: Easing.out(Easing.back(1.6)), useNativeDriver: true })
      .start(({ finished }) => finished && setPrevious(null));
  };

  // onLoad가 안 오는 경우를 대비해 조금 뒤에는 무조건 시작
  useEffect(() => {
    if (!previous) return;
    const t = setTimeout(start, 150);
    return () => clearTimeout(t);
  });

  const box = { width: size, height: size };
  const a11y = {
    accessible: !decorative,
    accessibilityLabel: decorative ? undefined : current.label,
    accessibilityElementsHidden: decorative,
    importantForAccessibility: decorative ? ('no-hide-descendants' as const) : ('yes' as const),
  };

  return (
    <View style={box} {...a11y}>
      {previous && (
        <Animated.Image
          source={previous.source}
          style={[StyleSheet.absoluteFill, box, {
            opacity: progress.interpolate({ inputRange: [0, 1], outputRange: [1, 0], extrapolate: 'clamp' }),
            transform: [{ scale: progress.interpolate({ inputRange: [0, 1], outputRange: [1, 0.9], extrapolate: 'clamp' }) }],
          }]}
          resizeMode="contain"
          fadeDuration={0}
        />
      )}
      <Animated.Image
        key={current.source}
        source={current.source}
        onLoad={start}
        onError={start}
        style={[StyleSheet.absoluteFill, box, previous && {
          opacity: progress.interpolate({ inputRange: [0, 1], outputRange: [0, 1], extrapolate: 'clamp' }),
          transform: [{ scale: progress.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1] }) }],
        }]}
        resizeMode="contain"
        fadeDuration={0} // Android 기본 페이드(300ms)가 '사라졌다 나타나는' 느낌의 원인
      />
    </View>
  );
}
