import Svg, { Circle, Ellipse, G, Path, Rect, Text as SvgText } from 'react-native-svg';
import { NOTO_PIG_FACE } from './notoPigFace';

// 예산 상태에 따라 바뀌는 돼지 — 누구나 돼지로 알아보게 Noto 🐷 얼굴을 바탕으로 모양·소품만 바꿈
//   rich:   여유 있음 — 옆으로 통통하게, 웃는 눈 ^^, 볼 홍조, 금화·반짝임
//   normal: 예산대로 가는 중 / 예산 없음 (원본 그대로)
//   skinny: 예산 초과 — 옆으로 홀쭉하게, 울상 눈썹, 찡그린 입, 식은땀
// bank: 머리에 동전 구멍을 단 저금통 (홈 요약 카드). 홀쭉하면 동전 없이 빈 저금통
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

export function Pig({ mood, size = 64, bank }: { mood: PigMood; size?: number; bank?: boolean }) {
  const t = SHAPES[mood];
  const leftEye = at(mood, 36, 68);
  const rightEye = at(mood, 90, 68);
  const slot = at(mood, 64, 27); // 동전 구멍 (정수리 조금 아래)
  return (
    <Svg width={size} height={size} viewBox="0 0 128 128" accessibilityLabel={(bank ? '저금통 ' : '') + LABELS[mood]}>
      {/* 저금통이면 전체를 조금 줄이고 내려서 위에 동전 자리 */}
      <G transform={bank ? 'matrix(0.84 0 0 0.84 10.24 20)' : undefined}>
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
          {/* 금화(저금통이면 동전 구멍 위에 따로)와 반짝임 */}
          {!bank && <Coin cx={108} cy={18} />}
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

      {bank && (
        <G>
          <Rect x={slot.x - 13 * t.sx} y={slot.y - 3} width={26 * t.sx} height={6} rx={3} fill="#c9707c" />
          {/* 홀쭉하면 빈 저금통 — 동전 없음 */}
          {mood !== 'skinny' && <Coin cx={slot.x} cy={slot.y - 16} />}
        </G>
      )}
      </G>
    </Svg>
  );
}

function Coin({ cx, cy }: { cx: number; cy: number }) {
  return (
    <G>
      <Circle cx={cx} cy={cy} r={14} fill="#FFD740" stroke="#D9A400" strokeWidth={3} />
      <SvgText x={cx} y={cy + 6} fontSize={16} fontWeight="bold" fill="#9A6B00" textAnchor="middle">₩</SvgText>
    </G>
  );
}

const LABELS: Record<PigMood, string> = {
  rich: '여유 있는 부자 돼지',
  skinny: '예산을 넘어서 홀쭉해진 돼지',
  normal: '보통 돼지',
};
