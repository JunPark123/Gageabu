import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Transaction } from '../models/Transaction';
import { findCategory } from '../lib/categories';
import { relativeDayLabel, timeLabel } from '../lib/format';
import { Theme, useThemedStyles } from '../theme/ThemeProvider';
import { AmountText } from './AmountText';
import { CategoryIcon } from './CategoryIcon';
import { justSwiped } from './MonthSwipe';

interface TransactionRowProps {
  item: Transaction;
  onPress?: (item: Transaction) => void;
  onLongPress?: (item: Transaction) => void;
  showDay?: boolean;    // true: "카페 · 오늘 08:42", false: "카페 · 08:42"
}

export function TransactionRow({ item, onPress, onLongPress, showDay }: TransactionRowProps) {
  const styles = useThemedStyles(makeStyles);
  const category = findCategory(item.category, item.paytype);
  const when = showDay ? `${relativeDayLabel(item.date)} ${timeLabel(item.date)}` : timeLabel(item.date);

  return (
    <Pressable
      onPress={onPress && (() => !justSwiped() && onPress(item))}
      onLongPress={onLongPress && (() => !justSwiped() && onLongPress(item))}
      delayLongPress={350}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityHint={onLongPress ? '길게 누르면 편집·삭제 메뉴' : undefined}
    >
      <CategoryIcon category={category} />
      <View style={styles.body}>
        <Text style={styles.title} numberOfLines={1}>{item.type || category.name}</Text>
        <Text style={styles.subtitle} numberOfLines={1}>{category.name} · {when}</Text>
      </View>
      <AmountText amount={item.cost} payType={item.paytype} style={styles.amount} />
    </Pressable>
  );
}

const makeStyles = ({ colors, spacing, typography }: Theme) =>
  StyleSheet.create({
    row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md, paddingHorizontal: spacing.lg },
    pressed: { backgroundColor: colors.surfaceMuted },
    body: { flex: 1, gap: 3 },
    title: { ...typography.bodyBold, color: colors.text },
    subtitle: { ...typography.caption, color: colors.textSecondary },
    amount: { fontSize: 15 },
  });
