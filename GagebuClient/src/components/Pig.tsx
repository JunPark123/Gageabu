import Svg, { Circle, Ellipse, G, Path, Rect, Text as SvgText } from 'react-native-svg';

// 예산 상태에 따라 바뀌는 돼지 (직접 그린 SVG — 이모지엔 이런 모양이 없어서)
//   rich:   예산 안 — 통통하고 웃는 부유한 돼지 + 금화
//   skinny: 예산 초과 — 홀쭉하고 울상인 돼지 + 식은땀
//   normal: 예산을 안 정했을 때
export type PigMood = 'normal' | 'rich' | 'skinny';

const INK = '#3A2A2A';
const OUTLINE = '#E2839A';
const SKIN = '#FBC4CE';
const SNOUT = '#F79BB0';
const NOSTRIL = '#B85A70';
const BLUSH = '#F48AA0';

export function Pig({ mood, size = 64 }: { mood: PigMood; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 120 120" accessibilityLabel={LABELS[mood]}>
      {mood === 'rich' && <RichPig />}
      {mood === 'skinny' && <SkinnyPig />}
      {mood === 'normal' && <NormalPig />}
    </Svg>
  );
}

const LABELS: Record<PigMood, string> = {
  rich: '예산 안이라 부유한 돼지',
  skinny: '예산을 넘어서 홀쭉해진 돼지',
  normal: '돼지',
};

function Ears({ droopy }: { droopy?: boolean }) {
  // 처진 귀는 바깥 아래로
  return droopy ? (
    <G>
      <Path d="M34 36 L10 44 L30 58 Z" fill={SKIN} stroke={OUTLINE} strokeWidth={3} strokeLinejoin="round" />
      <Path d="M86 36 L110 44 L90 58 Z" fill={SKIN} stroke={OUTLINE} strokeWidth={3} strokeLinejoin="round" />
    </G>
  ) : (
    <G>
      <Path d="M30 38 L22 10 L50 26 Z" fill={SKIN} stroke={OUTLINE} strokeWidth={3} strokeLinejoin="round" />
      <Path d="M32 32 L28 18 L42 26 Z" fill={BLUSH} />
      <Path d="M90 38 L98 10 L70 26 Z" fill={SKIN} stroke={OUTLINE} strokeWidth={3} strokeLinejoin="round" />
      <Path d="M88 32 L92 18 L78 26 Z" fill={BLUSH} />
    </G>
  );
}

function Snout({ cy, rx, ry }: { cy: number; rx: number; ry: number }) {
  return (
    <G>
      <Ellipse cx={60} cy={cy} rx={rx} ry={ry} fill={SNOUT} stroke={OUTLINE} strokeWidth={2.5} />
      <Ellipse cx={60 - rx * 0.38} cy={cy} rx={rx * 0.18} ry={ry * 0.42} fill={NOSTRIL} />
      <Ellipse cx={60 + rx * 0.38} cy={cy} rx={rx * 0.18} ry={ry * 0.42} fill={NOSTRIL} />
    </G>
  );
}

function RichPig() {
  return (
    <G>
      <Ears />
      {/* 통통한 얼굴 + 턱살 */}
      <Circle cx={60} cy={66} r={44} fill={SKIN} stroke={OUTLINE} strokeWidth={3} />
      <Path d="M36 100 Q60 112 84 100" fill="none" stroke={OUTLINE} strokeWidth={2.5} strokeLinecap="round" opacity={0.7} />
      <Ellipse cx={29} cy={78} rx={9} ry={6} fill={BLUSH} opacity={0.55} />
      <Ellipse cx={91} cy={78} rx={9} ry={6} fill={BLUSH} opacity={0.55} />
      {/* 웃는 눈 ^ ^ */}
      <Path d="M36 60 Q43 50 50 60" fill="none" stroke={INK} strokeWidth={4} strokeLinecap="round" />
      <Path d="M70 60 Q77 50 84 60" fill="none" stroke={INK} strokeWidth={4} strokeLinecap="round" />
      <Snout cy={78} rx={17} ry={12} />
      <Path d="M50 95 Q60 102 70 95" fill="none" stroke={INK} strokeWidth={3} strokeLinecap="round" />
      {/* 금화와 반짝임 */}
      <Circle cx={102} cy={22} r={15} fill="#FFD740" stroke="#D9A400" strokeWidth={3} />
      <SvgText x={102} y={28} fontSize={17} fontWeight="bold" fill="#9A6B00" textAnchor="middle">₩</SvgText>
      <Path d="M78 8 L80 13 L85 15 L80 17 L78 22 L76 17 L71 15 L76 13 Z" fill="#FFD740" />
      <Path d="M114 44 L115.5 47 L118.5 48.5 L115.5 50 L114 53 L112.5 50 L109.5 48.5 L112.5 47 Z" fill="#FFD740" />
    </G>
  );
}

function SkinnyPig() {
  return (
    <G>
      <Ears droopy />
      {/* 홀쭉한 얼굴 + 쏙 들어간 볼 */}
      <Ellipse cx={60} cy={64} rx={27} ry={46} fill="#F6D3DA" stroke={OUTLINE} strokeWidth={3} />
      <Path d="M40 74 Q44 80 41 86" fill="none" stroke={OUTLINE} strokeWidth={2} strokeLinecap="round" opacity={0.7} />
      <Path d="M80 74 Q76 80 79 86" fill="none" stroke={OUTLINE} strokeWidth={2} strokeLinecap="round" opacity={0.7} />
      {/* 울상 눈썹 + 작은 눈 */}
      <Path d="M43 46 L54 41" stroke={INK} strokeWidth={3} strokeLinecap="round" />
      <Path d="M77 46 L66 41" stroke={INK} strokeWidth={3} strokeLinecap="round" />
      <Circle cx={50} cy={54} r={3.5} fill={INK} />
      <Circle cx={70} cy={54} r={3.5} fill={INK} />
      <Snout cy={74} rx={11} ry={8} />
      <Path d="M52 94 Q60 87 68 94" fill="none" stroke={INK} strokeWidth={3} strokeLinecap="round" />
      {/* 식은땀 */}
      <Path d="M92 30 Q99 42 92 47 Q85 42 92 30 Z" fill="#8EC2FF" stroke="#5E9BE0" strokeWidth={1.5} />
    </G>
  );
}

function NormalPig() {
  return (
    <G>
      <Ears />
      <Circle cx={60} cy={66} r={40} fill={SKIN} stroke={OUTLINE} strokeWidth={3} />
      <Ellipse cx={33} cy={76} rx={8} ry={5} fill={BLUSH} opacity={0.5} />
      <Ellipse cx={87} cy={76} rx={8} ry={5} fill={BLUSH} opacity={0.5} />
      <Circle cx={45} cy={57} r={4.5} fill={INK} />
      <Circle cx={75} cy={57} r={4.5} fill={INK} />
      <Snout cy={75} rx={15} ry={11} />
      <Path d="M52 92 Q60 97 68 92" fill="none" stroke={INK} strokeWidth={3} strokeLinecap="round" />
    </G>
  );
}

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
