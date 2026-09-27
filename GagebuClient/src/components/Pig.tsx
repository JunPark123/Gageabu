import Svg, { Circle, Ellipse, G, Path, Rect, Text as SvgText } from 'react-native-svg';
import { NOTO_PIG_FACE } from './notoPigFace';

// 예산 상태에 따라 바뀌는 돼지 — 누구나 돼지로 알아보게 Noto 🐷 얼굴을 바탕으로 모양·소품만 바꿈
//   rich:   예산 안 — 옆으로 통통하게, 웃는 눈 ^^, 볼 홍조, 금화
//   skinny: 예산 초과 — 옆으로 홀쭉하게, 울상 눈썹, 찡그린 입, 식은땀
//   normal: 예산을 안 정했을 때 (원본 그대로)
export type PigMood = 'normal' | 'rich' | 'skinny';

const INK = '#312f2c';
const FACE = '#ffd3b0';   // 원본 얼굴색 (눈을 덮을 때 사용)
const MOUTH_PATH = 5;     // NOTO_PIG_FACE에서 입 곡선

// 얼굴 변형: x' = sx*x + tx, y' = sy*y + ty (viewBox 128 안에 들어오게)
const SHAPES: Record<PigMood, { sx: number; sy: number; tx: number; ty: number }> = {
  normal: { sx: 1, sy: 1, tx: 0, ty: 0 },
  rich: { sx: 0.896, sy: 0.8, tx: 6.66, ty: 20.8 },     // 가로 1.12배로 통통하게 + 금화 자리
  skinny: { sx: 0.78, sy: 0.92, tx: 14.08, ty: 9.2 },   // 가로 0.78배로 홀쭉하게
};

const at = (mood: PigMood, x: number, y: number) => {
  const t = SHAPES[mood];
  return { x: t.sx * x + t.tx, y: t.sy * y + t.ty };
};

export function Pig({ mood, size = 64 }: { mood: PigMood; size?: number }) {
  const t = SHAPES[mood];
  const leftEye = at(mood, 36, 68);
  const rightEye = at(mood, 90, 68);
  return (
    <Svg width={size} height={size} viewBox="0 0 128 128" accessibilityLabel={LABELS[mood]}>
      <G transform={`matrix(${t.sx} 0 0 ${t.sy} ${t.tx} ${t.ty})`}>
        {NOTO_PIG_FACE.map((p, i) =>
          mood === 'skinny' && i === MOUTH_PATH ? null : <Path key={i} fill={p.fill} d={p.d} />
        )}
      </G>

      {mood === 'rich' && (
        <G>
          {/* 원래 눈을 덮고 웃는 눈 ^^ */}
          {[leftEye, rightEye].map((e, i) => (
            <G key={i}>
              <Ellipse cx={e.x} cy={e.y} rx={6.5} ry={7.5} fill={FACE} />
              <Path d={`M${e.x - 6} ${e.y + 2} Q${e.x} ${e.y - 7} ${e.x + 6} ${e.y + 2}`} fill="none" stroke={INK} strokeWidth={3.4} strokeLinecap="round" />
            </G>
          ))}
          <Ellipse cx={24} cy={92} rx={8} ry={5} fill="#fd7e89" opacity={0.35} />
          <Ellipse cx={104} cy={92} rx={8} ry={5} fill="#fd7e89" opacity={0.35} />
          {/* 금화와 반짝임 */}
          <Circle cx={108} cy={18} r={14} fill="#FFD740" stroke="#D9A400" strokeWidth={3} />
          <SvgText x={108} y={24} fontSize={16} fontWeight="bold" fill="#9A6B00" textAnchor="middle">₩</SvgText>
          <Path d="M84 6 L86 11 L91 13 L86 15 L84 20 L82 15 L77 13 L82 11 Z" fill="#FFD740" />
          <Path d="M121 40 L122.5 43 L125.5 44.5 L122.5 46 L121 49 L119.5 46 L116.5 44.5 L119.5 43 Z" fill="#FFD740" />
        </G>
      )}

      {mood === 'skinny' && (
        <G>
          {/* 울상 눈썹 (안쪽이 올라감) */}
          <Path d={`M${leftEye.x - 8} ${leftEye.y - 11} L${leftEye.x + 5} ${leftEye.y - 16}`} stroke={INK} strokeWidth={3.2} strokeLinecap="round" />
          <Path d={`M${rightEye.x + 8} ${rightEye.y - 11} L${rightEye.x - 5} ${rightEye.y - 16}`} stroke={INK} strokeWidth={3.2} strokeLinecap="round" />
          {/* 찡그린 입 */}
          <Path d="M52 108 Q64 100 76 108" fill="none" stroke={INK} strokeWidth={3.4} strokeLinecap="round" />
          {/* 식은땀 */}
          <Path d="M104 36 Q111 48 104 53 Q97 48 104 36 Z" fill="#8EC2FF" stroke="#5E9BE0" strokeWidth={1.5} />
        </G>
      )}
    </Svg>
  );
}

const LABELS: Record<PigMood, string> = {
  rich: '예산 안이라 부유한 돼지',
  skinny: '예산을 넘어서 홀쭉해진 돼지',
  normal: '돼지',
};

// 저금통 색 — 위 돼지(Noto)와 같은 계열
const SKIN = '#ffd3b0';
const OUTLINE = '#e89a7c';
const SNOUT = '#fd7e89';
const NOSTRIL = '#8a4b4b';
const BLUSH = '#fd7e89';

// 저금통 (앱 이름 옆)
export function PiggyBank({ size = 36 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 120 120" accessibilityLabel="저금통">
      {/* 떨어지는 동전 */}
      <Circle cx={54} cy={16} r={11} fill="#FFD740" stroke="#D9A400" strokeWidth={3} />
      {/* 꼬리 */}
      <Path d="M16 62 Q6 58 10 50 Q14 44 18 50" fill="none" stroke={OUTLINE} strokeWidth={3} strokeLinecap="round" />
      {/* 다리 */}
      <Rect x={32} y={88} width={14} height={20} rx={5} fill={SKIN} stroke={OUTLINE} strokeWidth={3} />
      <Rect x={72} y={88} width={14} height={20} rx={5} fill={SKIN} stroke={OUTLINE} strokeWidth={3} />
      {/* 몸통 */}
      <Ellipse cx={58} cy={66} rx={44} ry={32} fill={SKIN} stroke={OUTLINE} strokeWidth={3} />
      {/* 귀 */}
      <Path d="M74 40 L80 22 L92 42 Z" fill={SKIN} stroke={OUTLINE} strokeWidth={3} strokeLinejoin="round" />
      {/* 동전 넣는 구멍 */}
      <Rect x={42} y={36} width={26} height={6} rx={3} fill={NOSTRIL} />
      {/* 코 */}
      <Ellipse cx={103} cy={66} rx={9} ry={12} fill={SNOUT} stroke={OUTLINE} strokeWidth={2.5} />
      <Ellipse cx={101} cy={61} rx={2} ry={3} fill={NOSTRIL} />
      <Ellipse cx={101} cy={71} rx={2} ry={3} fill={NOSTRIL} />
      {/* 눈·볼 */}
      <Circle cx={84} cy={56} r={4} fill={INK} />
      <Ellipse cx={84} cy={72} rx={6} ry={4} fill={BLUSH} opacity={0.55} />
    </Svg>
  );
}
