import { StyleProp, Text, TextStyle } from 'react-native';
import { useEntranceProgress } from '../hooks/useEntranceProgress';

interface CountUpTextProps {
  value: number;
  active: boolean;
  format: (value: number) => string;
  style?: StyleProp<TextStyle>;
  duration?: number;
  numberOfLines?: number;
  adjustsFontSizeToFit?: boolean;
  accessibilityLabel?: string;
}

// 요약 숫자에만 사용한다. 접근성에는 애니메이션 중간값 대신 최종값을 읽힌다.
export function CountUpText({ value, active, format, style, duration, numberOfLines, adjustsFontSizeToFit, accessibilityLabel }: CountUpTextProps) {
  const progress = useEntranceProgress(active, value, duration);
  return (
    <Text style={style} numberOfLines={numberOfLines} adjustsFontSizeToFit={adjustsFontSizeToFit} accessibilityLabel={accessibilityLabel ?? format(value)}>
      {format(Math.round(value * progress))}
    </Text>
  );
}
