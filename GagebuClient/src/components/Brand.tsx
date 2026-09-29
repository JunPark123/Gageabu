import { Image } from 'react-native';

// "부자돼지" 글자 로고와 코인 돼지 그림 — assets/images/로그인 화면,앱아이콘.png에서 잘라 배경을 투명하게 만든 것
// 그림 비율을 지키려고 한쪽 크기만 받는다

const WORDMARK = require('@/assets/images/brand/wordmark.png');
const WORDMARK_RATIO = 434 / 177;
const HERO_PIG = require('@/assets/images/brand/hero-pig.png');
const HERO_PIG_RATIO = 498 / 285;

export function Wordmark({ height = 40 }: { height?: number }) {
  return (
    <Image
      source={WORDMARK}
      style={{ height, width: height * WORDMARK_RATIO }}
      resizeMode="contain"
      accessibilityRole="header"
      accessibilityLabel="부자돼지"
    />
  );
}

export function HeroPig({ width = 260 }: { width?: number }) {
  return (
    <Image
      source={HERO_PIG}
      style={{ width, height: width / HERO_PIG_RATIO }}
      resizeMode="contain"
      accessible={false}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    />
  );
}
