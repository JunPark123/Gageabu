import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../auth/AuthProvider';
import { Transaction } from '../models/Transaction';
import { findCategory } from '../lib/categories';
import { relativeDayLabel, timeLabel } from '../lib/format';
import { Theme, useThemedStyles } from '../theme/ThemeProvider';
import { AmountText } from './AmountText';
import { CategoryIcon } from './CategoryIcon';
import { ProfileAvatar } from './ProfileAvatar';

interface TransactionRowProps {
  item: Transaction;
  onPress?: (item: Transaction) => void;
  onLongPress?: (item: Transaction) => void;
  showDay?: boolean;    // true: "카페  오늘 08:42", false: "카페  08:42"
}

export function TransactionRow({ item, onPress, onLongPress, showDay }: TransactionRowProps) {
  const styles = useThemedStyles(makeStyles);
  const category = findCategory(item.category, item.paytype);
  const when = showDay ? `${relativeDayLabel(item.date)} ${timeLabel(item.date)}` : timeLabel(item.date);
  const author = useAuthor(item.createdByUserId);

  return (
    <Pressable
      onPress={onPress && (() => onPress(item))}
      onLongPress={onLongPress && (() => onLongPress(item))}
      delayLongPress={350}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityHint={onLongPress ? '길게 누르면 편집, 삭제 메뉴' : undefined}
    >
      <View>
        <CategoryIcon category={category} />
        {/* 여럿이 쓰는 가계부면 누가 기록했는지 아이콘 구석에 */}
        {author && (
          <View style={styles.author} accessibilityLabel={`${author.name} 기록`}>
            <ProfileAvatar value={author.avatar} size={17} emojiSize={11} />
          </View>
        )}
      </View>
      <View style={styles.body}>
        <Text style={styles.title} numberOfLines={1}>{item.type || category.name}</Text>
        <View style={styles.subRow}>
          <Text style={styles.subtitle}>{category.name}</Text>
          <Text style={styles.subtitle} numberOfLines={1}>{when}</Text>
        </View>
      </View>
      <AmountText amount={item.cost} payType={item.paytype} style={styles.amount} />
    </Pressable>
  );
}

// 기록한 사람. 혼자 쓰는 가계부거나 로그인 전 내역이면 표시하지 않는다
function useAuthor(userId: number | null | undefined) {
  const { me } = useAuth();
  if (!me || userId == null || me.household.members.length < 2) return null;
  const member = me.household.members.find((m) => m.userId === userId);
  return member ? { name: member.nickname, avatar: member.avatar } : { name: '나간 멤버', avatar: '👤' };
}

const makeStyles = ({ colors, spacing, typography }: Theme) =>
  StyleSheet.create({
    author: {
      position: 'absolute',
      right: -4,
      bottom: -4,
      width: 20,
      height: 20,
      borderRadius: 10,
      backgroundColor: colors.surface,
      borderWidth: 1.5,
      borderColor: colors.surface,
      alignItems: 'center',
      justifyContent: 'center',
    },
    row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md, paddingHorizontal: spacing.lg },
    pressed: { backgroundColor: colors.surfaceMuted },
    body: { flex: 1, gap: 3 },
    title: { ...typography.bodyBold, color: colors.text },
    subRow: { flexDirection: 'row', gap: 6 },
    subtitle: { ...typography.caption, color: colors.textSecondary },
    amount: { fontSize: 15 },
  });
