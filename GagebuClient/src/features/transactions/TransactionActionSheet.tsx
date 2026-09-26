import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { BottomSheet } from '../../components/BottomSheet';
import { Button } from '../../components/Button';
import { TransactionRow } from '../../components/TransactionRow';
import { useDeleteTransactions } from '../../hooks/useTransactions';
import { Transaction } from '../../models/Transaction';
import { Theme, useTheme, useThemedStyles } from '../../theme/ThemeProvider';

interface TransactionActionSheetProps {
  transaction: Transaction | null;   // null이면 닫힘
  onClose: () => void;
  onEdit: (transaction: Transaction) => void;
}

// 목록 카드를 꾹 눌렀을 때: 편집하기 / 삭제하기 (삭제는 한 번 더 확인)
export function TransactionActionSheet({ transaction, onClose, onEdit }: TransactionActionSheetProps) {
  const styles = useThemedStyles(makeStyles);
  const { colors } = useTheme();
  const deleteMutation = useDeleteTransactions();
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shown, setShown] = useState<Transaction | null>(transaction); // 닫히는 애니메이션 동안 내용 유지

  useEffect(() => {
    if (transaction) {
      setShown(transaction);
      setConfirming(false);
      setError(null);
    }
  }, [transaction]);

  const remove = async () => {
    if (!shown) return;
    try {
      await deleteMutation.mutateAsync([shown.id]);
      onClose();
    } catch (e) {
      console.error('삭제 실패', e);
      setError('삭제하지 못했어요. 서버 연결을 확인해 주세요');
    }
  };

  return (
    <BottomSheet visible={transaction !== null} onClose={onClose}>
      {shown && (
        <View>
          <View style={styles.preview}>
            <TransactionRow item={shown} showDay />
          </View>
          {confirming ? (
            <View style={{ gap: 12 }}>
              <Text style={styles.confirmText}>이 내역을 삭제할까요?</Text>
              <View style={styles.row}>
                <Button label="취소" variant="secondary" onPress={() => setConfirming(false)} style={{ flex: 1 }} />
                <Button label="삭제" variant="danger" onPress={remove} loading={deleteMutation.isPending} style={{ flex: 1 }} />
              </View>
            </View>
          ) : (
            <View>
              <Action icon="edit-2" label="편집하기" color={colors.text} onPress={() => { onClose(); onEdit(shown); }} />
              <Action icon="trash-2" label="삭제하기" color={colors.expense} onPress={() => setConfirming(true)} />
            </View>
          )}
          {error && <Text style={styles.error}>{error}</Text>}
        </View>
      )}
    </BottomSheet>
  );
}

function Action({ icon, label, color, onPress }: { icon: keyof typeof Feather.glyphMap; label: string; color: string; onPress: () => void }) {
  const styles = useThemedStyles(makeStyles);
  const { colors } = useTheme();
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.action, pressed && { backgroundColor: colors.surfaceMuted }]} accessibilityRole="button">
      <Feather name={icon} size={20} color={color} />
      <Text style={[styles.actionText, { color }]}>{label}</Text>
    </Pressable>
  );
}

const makeStyles = ({ colors, radius, spacing, typography }: Theme) =>
  StyleSheet.create({
    preview: { backgroundColor: colors.surfaceMuted, borderRadius: radius.md, marginBottom: spacing.md, overflow: 'hidden' },
    action: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.lg, paddingHorizontal: spacing.sm, borderRadius: radius.md },
    actionText: { ...typography.bodyBold, fontSize: 16 },
    confirmText: { ...typography.body, color: colors.text, textAlign: 'center', marginTop: spacing.sm },
    row: { flexDirection: 'row', gap: spacing.sm },
    error: { ...typography.caption, color: colors.expense, textAlign: 'center', marginTop: spacing.sm },
  });
