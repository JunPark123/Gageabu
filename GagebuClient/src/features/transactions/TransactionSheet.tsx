import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { BottomSheet } from '../../components/BottomSheet';
import { Button } from '../../components/Button';
import { CategoryIcon } from '../../components/CategoryIcon';
import { KoreanCalendar } from '../../components/KoreanCalendar';
import { SegmentedControl } from '../../components/SegmentedControl';
import { categoriesFor, findCategory } from '../../lib/categories';
import { toApiDate, toYmd, withYmd } from '../../lib/date';
import { formatWon, koreanWon, monthDayWeekdayLabel, relativeDayLabel } from '../../lib/format';
import { PayType, Transaction } from '../../models/Transaction';
import { useCreateTransaction, useDeleteTransactions, useUpdateTransaction } from '../../hooks/useTransactions';
import { Theme, useTheme, useThemedStyles } from '../../theme/ThemeProvider';
import { noWebOutline } from '../../theme/web';

// 서버 Cost가 int라 10억 미만으로 제한
const MAX_DIGITS = 9;

interface TransactionSheetProps {
  visible: boolean;
  editing: Transaction | null;   // null이면 새로 추가
  onClose: () => void;
}

export function TransactionSheet({ visible, editing, onClose }: TransactionSheetProps) {
  const styles = useThemedStyles(makeStyles);
  const { colors } = useTheme();

  const [payType, setPayType] = useState(PayType.Expense);
  const [digits, setDigits] = useState('');
  const [categoryName, setCategoryName] = useState('식비');
  const [date, setDate] = useState(new Date());
  const [memo, setMemo] = useState('');
  const [mode, setMode] = useState<'form' | 'date'>('form');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createMutation = useCreateTransaction();
  const updateMutation = useUpdateTransaction();
  const deleteMutation = useDeleteTransactions();
  const saving = createMutation.isPending || updateMutation.isPending || deleteMutation.isPending;

  // 열릴 때마다 초기화 (수정이면 기존 값으로)
  useEffect(() => {
    if (!visible) return;
    if (editing) {
      const pt = editing.paytype === PayType.Income ? PayType.Income : PayType.Expense;
      setPayType(pt);
      setDigits(String(editing.cost));
      setCategoryName(findCategory(editing.category, pt).name);
      setDate(new Date(editing.date));
      setMemo(editing.type === editing.category ? '' : editing.type);
    } else {
      setPayType(PayType.Expense);
      setDigits('');
      setCategoryName('식비');
      setDate(new Date());
      setMemo('');
    }
    setMode('form');
    setConfirmDelete(false);
    setError(null);
  }, [visible, editing]);

  const amount = Number(digits || '0');
  const accent = payType === PayType.Expense ? colors.expense : colors.income;
  const categories = categoriesFor(payType);

  const changePayType = (next: PayType) => {
    setPayType(next);
    setCategoryName(categoriesFor(next)[0].name);
  };

  const pressKey = (key: string) => {
    setError(null);
    if (key === 'back') {
      setDigits((d) => d.slice(0, -1));
      return;
    }
    setDigits((d) => {
      const next = (d + key).replace(/^0+/, '');
      return next.length > MAX_DIGITS ? d : next;
    });
  };

  const save = async () => {
    if (amount <= 0) {
      setError('금액을 입력해 주세요');
      return;
    }
    const payload = {
      type: memo.trim() || categoryName,
      cost: amount,
      date: toApiDate(date),
      paytype: payType,
      category: categoryName,
      content: editing?.content ?? '',
    };
    try {
      if (editing) {
        await updateMutation.mutateAsync({ ...payload, id: editing.id });
      } else {
        await createMutation.mutateAsync(payload);
      }
      onClose();
    } catch (e) {
      console.error('저장 실패', e);
      setError('저장하지 못했어요. 서버 연결을 확인해 주세요');
    }
  };

  // 삭제는 두 번 눌러야 (Alert 대신 — 웹 미리보기에서도 동작)
  const remove = async () => {
    if (!editing) return;
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    try {
      await deleteMutation.mutateAsync([editing.id]);
      onClose();
    } catch (e) {
      console.error('삭제 실패', e);
      setError('삭제하지 못했어요');
    }
  };

  return (
    <BottomSheet visible={visible} onClose={onClose} title={mode === 'date' ? '날짜 · 시간' : editing ? '내역 수정' : '빠른 입력'}>
      {mode === 'date' ? (
        <DateTimePanel value={date} onDone={(d) => { setDate(d); setMode('form'); }} />
      ) : (
        <View>
          <SegmentedControl
            options={[
              { value: PayType.Expense, label: '출금', activeColor: colors.expense },
              { value: PayType.Income, label: '입금', activeColor: colors.income },
            ]}
            value={payType}
            onChange={changePayType}
          />

          <View style={styles.amountBox}>
            <Text style={[styles.amount, { color: amount > 0 ? accent : colors.textTertiary }]} numberOfLines={1} adjustsFontSizeToFit>
              {formatWon(amount)}
              <Text style={{ color: accent, fontWeight: '300' }}>|</Text>
            </Text>
            <Text style={styles.amountReading}>{amount > 0 ? koreanWon(amount) : '금액을 입력하세요'}</Text>
          </View>

          <View style={styles.categoryRow}>
            {categories.map((c) => {
              const selected = c.name === categoryName;
              return (
                <Pressable key={c.name} onPress={() => setCategoryName(c.name)} style={styles.categoryItem} accessibilityRole="button" accessibilityState={{ selected }}>
                  <View style={[styles.categoryRing, selected && { borderColor: c.color }]}>
                    <CategoryIcon category={c} size={44} />
                  </View>
                  <Text style={[styles.categoryLabel, selected && { color: colors.text, fontWeight: '700' }]}>{c.name}</Text>
                </Pressable>
              );
            })}
          </View>

          <View style={styles.infoBox}>
            <Pressable style={styles.infoRow} onPress={() => setMode('date')} accessibilityRole="button" accessibilityLabel="날짜와 시간 선택">
              <Feather name="calendar" size={16} color={colors.textSecondary} />
              <Text style={styles.infoText}>
                {monthDayWeekdayLabel(date)} · {relativeDayLabel(date)} {String(date.getHours()).padStart(2, '0')}:{String(date.getMinutes()).padStart(2, '0')}
              </Text>
              <Feather name="chevron-right" size={18} color={colors.textTertiary} />
            </Pressable>
            <View style={styles.infoDivider} />
            <View style={styles.infoRow}>
              <Feather name="edit-3" size={16} color={colors.textSecondary} />
              <TextInput
                value={memo}
                onChangeText={setMemo}
                placeholder="메모 (예: 점심 김치찌개)"
                placeholderTextColor={colors.textTertiary}
                style={[styles.memoInput, noWebOutline]}
                maxLength={40}
                returnKeyType="done"
              />
            </View>
          </View>

          <Keypad onPress={pressKey} />

          {error && <Text style={styles.error}>{error}</Text>}
          {confirmDelete && !error && <Text style={styles.error}>한 번 더 누르면 삭제돼요</Text>}

          {editing ? (
            <View style={styles.actions}>
              <Button label={confirmDelete ? '삭제 확인' : '삭제'} variant="danger" onPress={remove} loading={deleteMutation.isPending} disabled={saving} style={{ flex: 1 }} />
              <Button label="수정하기" onPress={save} loading={updateMutation.isPending} disabled={saving} style={{ flex: 1.6 }} />
            </View>
          ) : (
            <Button label="저장하기" icon={<Text style={{ fontSize: 18 }}>🐷</Text>} onPress={save} loading={createMutation.isPending} disabled={saving} />
          )}
        </View>
      )}
    </BottomSheet>
  );
}

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '00', '0', 'back'];

function Keypad({ onPress }: { onPress: (key: string) => void }) {
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

// 날짜 / 시간을 탭으로 나눠서 고른다. 날짜를 누르면 시간 탭으로 넘어감
function DateTimePanel({ value, onDone }: { value: Date; onDone: (d: Date) => void }) {
  const styles = useThemedStyles(makeStyles);
  const { colors } = useTheme();
  const [temp, setTemp] = useState(value);
  const [tab, setTab] = useState<'date' | 'time'>('date');

  const setHour = (h: number) => setTemp((d) => { const n = new Date(d); n.setHours(h); return n; });
  const setMinute = (m: number) => setTemp((d) => { const n = new Date(d); n.setMinutes(m); return n; });

  return (
    <View>
      <Text style={styles.pickedLabel}>
        {monthDayWeekdayLabel(temp)} {String(temp.getHours()).padStart(2, '0')}:{String(temp.getMinutes()).padStart(2, '0')}
      </Text>
      <SegmentedControl
        options={[
          { value: 'date', label: '날짜', icon: (c) => <Feather name="calendar" size={15} color={c} /> },
          { value: 'time', label: '시간', icon: (c) => <Feather name="clock" size={15} color={c} /> },
        ]}
        value={tab}
        onChange={setTab}
      />
      <View style={styles.pickerBody}>
        {tab === 'date' ? (
          <KoreanCalendar
            current={toYmd(temp)}
            onDayPress={(day) => { setTemp((d) => withYmd(d, day.dateString)); setTab('time'); }}
            markedDates={{ [toYmd(temp)]: { selected: true, selectedColor: colors.primary, selectedTextColor: colors.textOnPrimary } }}
          />
        ) : (
          <View style={{ gap: 14 }}>
            <Text style={styles.gridTitle}>시</Text>
            <ChoiceGrid values={HOURS} selected={temp.getHours()} onSelect={setHour} />
            <Text style={styles.gridTitle}>분</Text>
            <ChoiceGrid values={MINUTES} selected={temp.getMinutes()} onSelect={setMinute} />
          </View>
        )}
      </View>
      <View style={styles.actions}>
        <Button label="지금" variant="secondary" onPress={() => setTemp(new Date())} style={{ flex: 1 }} />
        <Button label="확인" onPress={() => onDone(temp)} style={{ flex: 2 }} />
      </View>
    </View>
  );
}

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MINUTES = Array.from({ length: 12 }, (_, i) => i * 5);

// 숫자 격자 (한 줄에 6개 — values 개수는 6의 배수로)
function ChoiceGrid({ values, selected, onSelect }: { values: number[]; selected: number; onSelect: (v: number) => void }) {
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.grid}>
      {values.map((v) => {
        const isSelected = v === selected;
        return (
          <Pressable
            key={v}
            onPress={() => onSelect(v)}
            style={({ pressed }) => [styles.gridCell, isSelected && styles.gridCellSelected, pressed && { opacity: 0.7 }]}
            accessibilityRole="button"
            accessibilityState={{ selected: isSelected }}
          >
            <Text style={[styles.gridText, isSelected && styles.gridTextSelected]}>{String(v).padStart(2, '0')}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const makeStyles = ({ colors, radius, spacing, typography }: Theme) =>
  StyleSheet.create({
    amountBox: { alignItems: 'center', paddingTop: spacing.xl, paddingBottom: spacing.md },
    amount: { ...typography.display, fontSize: 36 },
    amountReading: { ...typography.caption, color: colors.textSecondary, marginTop: spacing.xs },
    categoryRow: { flexDirection: 'row', justifyContent: 'space-between', marginVertical: spacing.md },
    categoryItem: { alignItems: 'center', gap: 4, flex: 1 },
    categoryRing: { borderWidth: 2, borderColor: 'transparent', borderRadius: 18, padding: 2 },
    categoryLabel: { ...typography.caption, color: colors.textSecondary },
    infoBox: { backgroundColor: colors.surfaceMuted, borderRadius: radius.md, paddingHorizontal: spacing.md },
    infoRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minHeight: 46 },
    infoText: { ...typography.body, color: colors.text, flex: 1 },
    infoDivider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border },
    memoInput: { ...typography.body, color: colors.text, flex: 1, paddingVertical: spacing.sm, },
    keypad: { flexDirection: 'row', flexWrap: 'wrap', marginVertical: spacing.sm },
    key: { width: '33.333%', height: 50, alignItems: 'center', justifyContent: 'center', borderRadius: radius.md },
    keyText: { fontSize: 22, fontWeight: '500', color: colors.text },
    error: { ...typography.caption, color: colors.expense, textAlign: 'center', marginBottom: spacing.sm },
    actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
    pickedLabel: { ...typography.heading, color: colors.text, textAlign: 'center', marginBottom: spacing.md },
    pickerBody: { minHeight: 330, marginTop: spacing.md, justifyContent: 'flex-start' },
    gridTitle: { ...typography.captionBold, color: colors.textSecondary, marginBottom: -6 },
    grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 6 }, // 24시·12분 모두 6의 배수라 줄이 꽉 참
    gridCell: { width: '15.6%', paddingVertical: 10, alignItems: 'center', borderRadius: radius.sm, backgroundColor: colors.surfaceMuted },
    gridCellSelected: { backgroundColor: colors.primary },
    gridText: { ...typography.body, color: colors.text, fontVariant: ['tabular-nums'] },
    gridTextSelected: { fontWeight: '800', color: colors.textOnPrimary },
  });
