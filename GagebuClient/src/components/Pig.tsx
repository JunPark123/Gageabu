import { Image } from 'react-native';
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

function PigImage({ item, size, decorative }: { item: { source: number; label: string }; size: number; decorative: boolean }) {
  return (
    <Image
      source={item.source}
      style={{ width: size, height: size }}
      resizeMode="contain"
      accessible={!decorative}
      accessibilityLabel={decorative ? undefined : item.label}
      accessibilityElementsHidden={decorative}
      importantForAccessibility={decorative ? 'no-hide-descendants' : 'yes'}
    />
  );
}
