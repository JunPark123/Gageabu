import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { BottomSheet } from '../../components/BottomSheet';
import { PigMain } from '../../components/Pig';
import { PayType } from '../../models/Transaction';
import { Theme, useThemedStyles } from '../../theme/ThemeProvider';

type Action = {
  title: string;
  subtitle: string;
  emoji: string;
  tint: string;
  accent: string;
  payType?: PayType;
};

const ACTIONS: Action[] = [
  { title: '지출 추가', subtitle: '식비, 쇼핑, 교통 등', emoji: '🧺', tint: '#FFE4E9', accent: '#FF436B', payType: PayType.Expense },
  { title: '수입 추가', subtitle: '급여, 용돈, 기타 수입', emoji: '👛', tint: '#E4FAEF', accent: '#08B67B', payType: PayType.Income },
  { title: '저금 추가', subtitle: '새로운 저금 등록', emoji: '🐷', tint: '#FFF1D6', accent: '#F4A32A' },
  { title: '대출 추가', subtitle: '대출 내역 등록', emoji: '🏦', tint: '#E5EEFF', accent: '#527BE7' },
  { title: '이체', subtitle: '계좌 간 이체', emoji: '🔁', tint: '#E8F1FF', accent: '#3587E9' },
  { title: '목표 추가', subtitle: '저축 목표 설정', emoji: '🎯', tint: '#FFE8EB', accent: '#FF557D' },
];

export function AddMenu({ visible, onClose, onCreate }: {
  visible: boolean;
  onClose: () => void;
  onCreate: (payType: PayType) => void;
}) {
  const styles = useThemedStyles(makeStyles);
  return (
    <BottomSheet visible={visible} onClose={onClose} title="내역 추가">
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <View style={styles.hero}>
          <PigMain state="wealthy" size={108} />
          <View style={styles.heroCopy}>
            <Text style={styles.heroTitle}>함께 기록하면{'\n'}더 큰 부자가 될 수 있어요! 💕</Text>
            <Text style={styles.heroSub}>무엇을 기록할까요?</Text>
          </View>
        </View>
        <View style={styles.grid}>
          {ACTIONS.map((action) => (
            <Pressable
              key={action.title}
              onPress={action.payType ? () => onCreate(action.payType!) : undefined}
              disabled={!action.payType}
              accessibilityRole="button"
              accessibilityState={{ disabled: !action.payType }}
              style={({ pressed }) => [styles.tile, { backgroundColor: action.tint }, pressed && styles.pressed]}
            >
              <Text style={styles.tileEmoji}>{action.emoji}</Text>
              <Text style={styles.tileTitle}>{action.title}</Text>
              <Text style={styles.tileSub}>{action.payType ? action.subtitle : '준비 중'}</Text>
              <View style={styles.arrow}>
                <Feather name={action.payType ? 'chevron-right' : 'clock'} size={16} color={action.accent} />
              </View>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </BottomSheet>
  );
}

const makeStyles = ({ colors, radius, spacing, typography }: Theme) => StyleSheet.create({
  scroll: { flexShrink: 1 },
  scrollContent: { paddingBottom: spacing.sm },
  hero: { flexDirection: 'row', alignItems: 'center', gap: 2, marginBottom: spacing.md },
  heroCopy: { flex: 1 },
  heroTitle: { ...typography.heading, color: colors.text, lineHeight: 24 },
  heroSub: { ...typography.caption, color: colors.textSecondary, marginTop: 5 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, paddingBottom: spacing.md },
  tile: { width: '48.5%', minHeight: 132, borderRadius: radius.lg, padding: spacing.md, overflow: 'hidden' },
  tileEmoji: { fontSize: 34, marginBottom: 2 },
  tileTitle: { ...typography.bodyBold, color: colors.text },
  tileSub: { ...typography.caption, color: colors.textSecondary, marginTop: 2, paddingRight: 17 },
  arrow: { position: 'absolute', right: 10, bottom: 10, width: 24, height: 24, borderRadius: 12, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  pressed: { opacity: 0.7 },
});
