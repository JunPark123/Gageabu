import { Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Theme, useTheme, useThemedStyles } from '../theme/ThemeProvider';

// 금액 입력용 숫자 키패드. 시스템 키보드를 쓰지 않아서 시트를 가리지 않음 (빠른 입력·예산)
const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '00', '0', 'back'];

// 서버 Cost가 int라 10억 미만(9자리)으로 제한
export const MAX_AMOUNT_DIGITS = 9;

// 키 하나를 눌렀을 때의 숫자 문자열 (앞자리 0 제거, 자릿수 제한)
export function applyKey(digits: string, key: string, maxDigits = MAX_AMOUNT_DIGITS) {
  if (key === 'back') return digits.slice(0, -1);
  const next = (digits + key).replace(/^0+/, '');
  return next.length > maxDigits ? digits : next;
}

export function Keypad({ onPress }: { onPress: (key: string) => void }) {
  const styles = useThemedStyles(makeStyles);
  const { colors } = useTheme();
  return (
    <View style={styles.keypad}>
      {KEYS.map((k) => (
        <Pressable
          key={k}
          onPress={() => onPress(k)}
          style={({ pressed }) => [styles.key, pressed && { backgroundColor: colors.surfaceMuted }]}
          accessibilityLabel={k === 'back' ? '지우기' : k}
        >
          {k === 'back' ? (
            <MaterialCommunityIcons name="backspace-outline" size={22} color={colors.text} />
          ) : (
            <Text style={styles.keyText}>{k}</Text>
          )}
        </Pressable>
      ))}
    </View>
  );
}

const makeStyles = ({ colors, radius, spacing }: Theme) =>
  StyleSheet.create({
    keypad: { flexDirection: 'row', flexWrap: 'wrap', marginVertical: spacing.sm },
    key: { width: '33.333%', height: 50, alignItems: 'center', justifyContent: 'center', borderRadius: radius.md },
    keyText: { fontSize: 22, fontWeight: '500', color: colors.text },
  });
