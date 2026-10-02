import { useEffect, useRef, useState } from 'react';
import { Animated, Keyboard, Pressable, ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { BottomSheet } from '../../components/BottomSheet';
import { Button } from '../../components/Button';
import { CategoryIcon } from '../../components/CategoryIcon';
import { KoreanCalendar } from '../../components/KoreanCalendar';
import { applyKey, Keypad } from '../../components/Keypad';
import { SegmentedControl } from '../../components/SegmentedControl';
import { WheelPicker } from '../../components/WheelPicker';
import { describeError } from '../../lib/apiError';
import { categoriesFor, findCategory } from '../../lib/categories';
import { formatKst, toApiDate, toKst } from '../../lib/date';
import { updateTransactionDate } from '../../lib/transactionDate';
import { formatWon, koreanWon, monthDayWeekdayLabel, relativeDayLabel } from '../../lib/format';
import { PayType, Transaction } from '../../models/Transaction';
import { useCreateTransaction, useDeleteTransactions, useUpdateTransaction } from '../../hooks/useTransactions';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { Theme, useTheme, useThemedStyles } from '../../theme/ThemeProvider';
import { noWebOutline } from '../../theme/web';

interface TransactionSheetProps {
  visible: boolean;
  editing: Transaction | null;   // null이면 새로 추가
  initialPayType?: PayType;
  initialDate?: Date;
  onClose: () => void;
}

export function TransactionSheet({ visible, editing, initialPayType = PayType.Expense, initialDate, onClose }: TransactionSheetProps) {
  const styles = useThemedStyles(makeStyles);
  const categorySize = useWindowDimensions().width < 360 ? 36 : 44;
  const { colors } = useTheme();

  const [payType, setPayType] = useState(PayType.Expense);
  const [digits, setDigits] = useState('');
  const [categoryName, setCategoryName] = useState('식비');
  const [date, setDate] = useState(new Date());
  const [memo, setMemo] = useState('');
  const [mode, setMode] = useState<'form' | 'date'>('form');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [memoFocused, setMemoFocused] = useState(false); // 메모 입력 중엔 숫자 키패드를 숨겨 시트를 낮춤
  const [error, setError] = useState<string | null>(null);
  const memoRef = useRef<TextInput>(null);

  // Android는 뒤로가기로 키보드만 내리면 메모 칸 포커스가 남아 키패드가 안 돌아옴 → 키보드가 내려가면 포커스도 해제
  useEffect(() => {
    const sub = Keyboard.addListener('keyboardDidHide', () => memoRef.current?.blur());
    return () => sub.remove();
  }, []);

  // 금액을 누르면 메모 입력을 끝내고 숫자 키패드로
  const focusAmount = () => {
    memoRef.current?.blur();
    Keyboard.dismiss();
    setMemoFocused(false);
  };

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
      setPayType(initialPayType);
      setDigits('');
      setCategoryName(categoriesFor(initialPayType)[0].name);
      setDate(initialDate ? new Date(initialDate) : new Date());
      setMemo('');
    }
    setMode('form');
    setConfirmDelete(false);
    setError(null);
  }, [visible, editing, initialPayType, initialDate]);

  const amount = Number(digits || '0');
  const accent = payType === PayType.Expense ? colors.expense : colors.income;
  const categories = categoriesFor(payType);

  const changePayType = (next: PayType) => {
    setPayType(next);
    setCategoryName(categoriesFor(next)[0].name);
  };

  const pressKey = (key: string) => {
    setError(null);
    setDigits((d) => applyKey(d, key));
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
      const info = describeError(e);
      setError(`저장하지 못했어요 — ${info.title}`);
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
      setError(`삭제하지 못했어요 — ${describeError(e).title}`);
    }
  };

  return (
    <BottomSheet visible={visible} onClose={mode === 'date' ? () => setMode('form') : onClose} title={mode === 'date' ? '날짜와 시간' : editing ? '내역 수정' : `${formatKst(date, 'YYYY년 M월')} 내역 추가`}>
      <ScrollView style={{ flexShrink: 1 }} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 4 }}>
      {mode === 'date' ? (
        <DateTimePanel value={date} onDone={(d) => { setDate(d); setMode('form'); }} />
      ) : (
        <View>
          <SegmentedControl
            options={[
              { value: PayType.Expense, label: '지출', activeColor: colors.expense },
              { value: PayType.Income, label: '수입', activeColor: colors.income },
            ]}
            value={payType}
            onChange={changePayType}
          />

          <Pressable style={styles.amountBox} onPress={focusAmount} accessibilityRole="button" accessibilityLabel={`금액 ${formatWon(amount)}, 눌러서 입력`}>
            <View style={styles.amountRow}>
              <Text style={[styles.amount, { color: amount > 0 ? accent : colors.textTertiary }]} numberOfLines={1} adjustsFontSizeToFit>
                {formatWon(amount)}
              </Text>
              {/* 키패드로 입력 중일 때만 깜빡이는 커서 (메모 입력 중엔 메모 칸에 커서가 있으니 숨김) */}
              {!memoFocused && <BlinkingCaret color={accent} restartKey={digits} />}
            </View>
            <Text style={styles.amountReading}>{amount > 0 ? koreanWon(amount) : '금액을 입력하세요'}</Text>
          </Pressable>

          <View style={styles.categoryRow}>
            {categories.map((c) => {
              const selected = c.name === categoryName;
              return (
                <Pressable key={c.name} onPress={() => setCategoryName(c.name)} style={styles.categoryItem} accessibilityRole="button" accessibilityState={{ selected }}>
                  <View style={[styles.categoryRing, selected && { borderColor: c.color }]}>
                    <CategoryIcon category={c} size={categorySize} />
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
                {formatKst(date, 'YYYY년')} {monthDayWeekdayLabel(date)} {formatKst(date, 'HH:mm')}
              </Text>
              {/* 오늘, 어제면 작은 표시 */}
              {(relativeDayLabel(date) === '오늘' || relativeDayLabel(date) === '어제') && (
                <Text style={styles.dayBadge}>{relativeDayLabel(date)}</Text>
              )}
              <Feather name="chevron-right" size={18} color={colors.textTertiary} />
            </Pressable>
            <View style={styles.infoDivider} />
            <View style={styles.infoRow}>
              <Feather name="edit-3" size={16} color={colors.textSecondary} />
              <TextInput
                ref={memoRef}
                value={memo}
                onChangeText={setMemo}
                placeholder="메모 (예: 점심 김치찌개)"
                placeholderTextColor={colors.textTertiary}
                style={[styles.memoInput, noWebOutline]}
                maxLength={40}
                returnKeyType="done"
                onFocus={() => setMemoFocused(true)}
                onBlur={() => setMemoFocused(false)}
              />
            </View>
          </View>

          {!memoFocused && <Keypad onPress={pressKey} />}

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
      </ScrollView>
    </BottomSheet>
  );
}

// 글자 입력칸처럼 깜빡이는 커서. 누를 때마다 다시 켜진 상태에서 시작 (움직임 줄이기 설정이면 깜빡이지 않음)
function BlinkingCaret({ color, restartKey }: { color: string; restartKey: string }) {
  const reduced = useReducedMotion();
  const opacity = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    opacity.setValue(1);
    if (reduced) return;
    const step = (toValue: number) => Animated.timing(opacity, { toValue, duration: 0, useNativeDriver: true });
    const blink = Animated.loop(Animated.sequence([Animated.delay(530), step(0), Animated.delay(530), step(1)]));
    blink.start();
    return () => blink.stop();
  }, [restartKey, reduced, opacity]);
  return <Animated.View style={{ width: 2, height: 34, marginLeft: 3, borderRadius: 1, backgroundColor: color, opacity }} />;
}

// 날짜·시간을 한 번에: 아이폰 스타일 휠 [월 | 일 | 시 | 분]. 달력 버튼을 누르면 달력으로 고르고 다시 휠로
function DateTimePanel({ value, onDone }: { value: Date; onDone: (d: Date) => void }) {
  const styles = useThemedStyles(makeStyles);
  const { colors } = useTheme();
  const [temp, setTemp] = useState(value);
  const [calendar, setCalendar] = useState(false);

  // 월을 바꿨는데 그 달에 없는 날(예: 31일 → 2월)이면 그 달 마지막 날로
  const update = (patch: { month?: number; day?: number; hour?: number; minute?: number }) =>
    setTemp((d) => updateTransactionDate(d, patch));

  const picked = toKst(temp);
  const daysInMonth = picked.daysInMonth();

  return (
    <View>
      <View style={styles.pickedRow}>
        <Text style={styles.pickedLabel}>
          {formatKst(temp, 'YYYY년')} {monthDayWeekdayLabel(temp)} {formatKst(temp, 'HH:mm')}
        </Text>
        <Pressable
          onPress={() => setCalendar(!calendar)}
          style={({ pressed }) => [styles.calendarToggle, calendar && { backgroundColor: colors.primary }, pressed && { opacity: 0.7 }]}
          accessibilityRole="button"
          accessibilityLabel={calendar ? '휠로 고르기' : '달력으로 고르기'}
        >
          <Feather name={calendar ? 'sliders' : 'calendar'} size={18} color={calendar ? colors.textOnPrimary : colors.text} />
        </Pressable>
      </View>
      <View style={styles.pickerBody}>
        {calendar ? (
          <KoreanCalendar
            current={picked.format('YYYY-MM-DD')}
            onDayPress={(day) => { setTemp((d) => updateTransactionDate(d, { year: day.year, month: day.month - 1, day: day.day })); setCalendar(false); }}
            markedDates={{ [picked.format('YYYY-MM-DD')]: { selected: true, selectedColor: colors.primary, selectedTextColor: colors.textOnPrimary } }}
          />
        ) : (
          <View>
            <View style={styles.wheelHeads}>
              {['월', '일', '시', '분'].map((h) => <Text key={h} style={styles.wheelHead}>{h}</Text>)}
            </View>
            <View style={styles.wheels}>
              <WheelPicker accessibilityLabel="월" items={MONTH_ITEMS} value={picked.month()} onChange={(month) => update({ month })} />
              <WheelPicker accessibilityLabel="일" items={DAY_ITEMS.slice(0, daysInMonth)} value={picked.date()} onChange={(day) => update({ day })} />
              <WheelPicker accessibilityLabel="시" items={HOUR_ITEMS} value={picked.hour()} onChange={(hour) => update({ hour })} />
              <WheelPicker accessibilityLabel="분" items={MINUTE_ITEMS} value={picked.minute()} onChange={(minute) => update({ minute })} />
            </View>
          </View>
        )}
      </View>
      <View style={styles.actions}>
        <Button label="지금" variant="secondary" onPress={() => { setTemp(new Date()); setCalendar(false); }} style={{ flex: 1 }} />
        <Button label="확인" onPress={() => onDone(temp)} style={{ flex: 2 }} />
      </View>
    </View>
  );
}

const MONTH_ITEMS = Array.from({ length: 12 }, (_, i) => ({ value: i, label: `${i + 1}월` }));
const DAY_ITEMS = Array.from({ length: 31 }, (_, i) => ({ value: i + 1, label: `${i + 1}일` }));
const HOUR_ITEMS = Array.from({ length: 24 }, (_, i) => ({ value: i, label: String(i).padStart(2, '0') }));
const MINUTE_ITEMS = Array.from({ length: 60 }, (_, i) => ({ value: i, label: String(i).padStart(2, '0') }));

const makeStyles = ({ colors, radius, spacing, typography }: Theme) =>
  StyleSheet.create({
    amountBox: { alignItems: 'center', paddingTop: spacing.xl, paddingBottom: spacing.md },
    amountRow: { flexDirection: 'row', alignItems: 'center', maxWidth: '100%' },
    amount: { ...typography.display, fontSize: 36, flexShrink: 1 },
    amountReading: { ...typography.caption, color: colors.textSecondary, marginTop: spacing.xs },
    categoryRow: { flexDirection: 'row', justifyContent: 'space-between', marginVertical: spacing.md },
    categoryItem: { alignItems: 'center', gap: 4, flex: 1 },
    categoryRing: { borderWidth: 2, borderColor: 'transparent', borderRadius: 18, padding: 2 },
    categoryLabel: { ...typography.caption, color: colors.textSecondary },
    infoBox: { backgroundColor: colors.surfaceMuted, borderRadius: radius.md, paddingHorizontal: spacing.md },
    infoRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minHeight: 46 },
    infoText: { ...typography.body, color: colors.text, flex: 1 },
    dayBadge: { ...typography.captionBold, color: colors.text, backgroundColor: colors.primarySoft, paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.pill, overflow: 'hidden' },
    infoDivider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border },
    memoInput: { ...typography.body, color: colors.text, flex: 1, paddingVertical: spacing.sm, },
    error: { ...typography.caption, color: colors.expense, textAlign: 'center', marginBottom: spacing.sm },
    actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
    pickedRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.md, marginBottom: spacing.sm },
    pickedLabel: { ...typography.heading, color: colors.text, textAlign: 'center' },
    calendarToggle: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceMuted },
    wheelHeads: { flexDirection: 'row', marginBottom: 4 },
    wheelHead: { flex: 1, textAlign: 'center', ...typography.captionBold, color: colors.textSecondary },
    wheels: { flexDirection: 'row', gap: 4 },
    pickerBody: { minHeight: 330, marginTop: spacing.sm, justifyContent: 'center' },
  });
