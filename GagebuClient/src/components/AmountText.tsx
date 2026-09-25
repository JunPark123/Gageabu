import { StyleProp, Text, TextStyle } from 'react-native';
import { PayType } from '../models/Transaction';
import { formatWon } from '../lib/format';
import { useTheme } from '../theme/ThemeProvider';

interface AmountTextProps {
  amount: number;
  payType?: PayType;     // 주면 지출은 -빨강, 수입은 +파랑
  style?: StyleProp<TextStyle>;
}

export function AmountText({ amount, payType, style }: AmountTextProps) {
  const { colors } = useTheme();
  const signed =
    payType === PayType.Expense ? -Math.abs(amount) :
      payType === PayType.Income ? Math.abs(amount) :
        amount;
  const color =
    payType === PayType.Expense ? colors.expense :
      payType === PayType.Income ? colors.income :
        colors.text;
  return (
    <Text style={[{ color, fontWeight: '700', fontVariant: ['tabular-nums'] }, style]} numberOfLines={1}>
      {formatWon(signed, { sign: payType !== undefined })}
    </Text>
  );
}
