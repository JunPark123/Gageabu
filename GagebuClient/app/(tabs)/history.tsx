// 내역: 리스트(날짜별) / 달력, 기간·입출금 필터
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import dayjs from 'dayjs';
import { BottomSheet } from '@/src/components/BottomSheet';
import { Button } from '@/src/components/Button';
import { Card } from '@/src/components/Card';
import { Chip } from '@/src/components/Chip';
import { KoreanCalendar } from '@/src/components/KoreanCalendar';
import { MonthSwitcher } from '@/src/components/MonthSwitcher';
import { Screen } from '@/src/components/Screen';
import { SegmentedControl } from '@/src/components/SegmentedControl';
import { TransactionRow } from '@/src/components/TransactionRow';
import { useTransactionSheet } from '@/src/features/transactions/TransactionSheetProvider';
import { useRefreshOnFocus, useTransactionSummary } from '@/src/hooks/useTransactions';
import { DateRange, kstDateRange, kstMonthRange, toKst } from '@/src/lib/date';
import { compactWon, dayHeaderLabel, formatWon, WEEKDAYS } from '@/src/lib/format';
import { PayType, Transaction } from '@/src/models/Transaction';
import { useSelectedMonth } from '@/src/store/month';
import { Theme, useTheme, useThemedStyles } from '@/src/theme/ThemeProvider';

type View_ = 'list' | 'calendar';
// 기간: 선택한 달(기본) / 오늘 / 직접 고른 기간 ('YYYY-MM-DD', KST)
type Period = { kind: 'month' } | { kind: 'today' } | { kind: 'range'; start: string; end: string };

export default function HistoryScreen() {
  const styles = useThemedStyles(makeStyles);
  const { colors } = useTheme();
  const { year, monthIndex, shiftMonth, isCurrentMonth } = useSelectedMonth();
  const { openEdit, openActions } = useTransactionSheet();

  const [view, setView] = useState<View_>('list');
  const [period, setPeriod] = useState<Period>({ kind: 'month' });
  const [payType, setPayType] = useState<PayType | undefined>(undefined);
  const [periodSheetVisible, setPeriodSheetVisible] = useState(false);
  const [selectedDay, setSelectedDay] = useState<string | null>(null); // 달력에서 누른 날

  // 달력은 한 달 단위로만 보여준다
  const effectivePeriod: Period = view === 'calendar' ? { kind: 'month' } : period;
  const range: DateRange = useMemo(() => periodRange(effectivePeriod, year, monthIndex),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 기간 객체는 매 렌더 새로 만들어지므로 값으로 비교
    [JSON.stringify(effectivePeriod), year, monthIndex]);

  const params = useMemo(() => ({ ...range, payType }), [range, payType]);
  const { data, isError, refetch } = useTransactionSummary(params);
  useRefreshOnFocus(refetch);

  const transactions = data?.transactions ?? [];
  const groups = useMemo(() => groupByDay(transactions), [transactions]);

  const periodLabel =
    period.kind === 'month' ? (isCurrentMonth ? '이번 달' : `${monthIndex + 1}월`) :
      period.kind === 'today' ? '오늘' :
        `${dayjs(period.start).format('M.D')} ~ ${dayjs(period.end).format('M.D')}`;

  return (
    <Screen onRefresh={refetch}>
      <View style={styles.titleRow}>
        <Text style={styles.title}>내역</Text>
        <SegmentedControl
          size="sm"
          options={[
            { value: 'list', label: '리스트', icon: (c) => <Feather name="list" size={14} color={c} /> },
            { value: 'calendar', label: '달력', icon: (c) => <Feather name="calendar" size={14} color={c} /> },
          ]}
          value={view}
          onChange={(v) => { setView(v); setSelectedDay(null); }}
        />
      </View>

      <View style={styles.periodRow}>
        {effectivePeriod.kind === 'month' ? (
          <MonthSwitcher year={year} monthIndex={monthIndex} onPrev={() => { shiftMonth(-1); setSelectedDay(null); }} onNext={() => { shiftMonth(1); setSelectedDay(null); }} size="lg" />
        ) : (
          <Pressable onPress={() => setPeriod({ kind: 'month' })} style={styles.periodReset} hitSlop={8} accessibilityLabel="월별 보기로 돌아가기">
            <Text style={styles.periodText}>{periodLabel}</Text>
            <Feather name="x-circle" size={16} color={colors.textTertiary} />
          </Pressable>
        )}
        <View style={styles.totals}>
          <Text style={[styles.total, { color: colors.expense }]}>지출 {formatWon(data?.statistics.totalExpense ?? 0)}</Text>
          <Text style={[styles.total, { color: colors.income }]}>수입 {formatWon(data?.statistics.totalIncome ?? 0)}</Text>
        </View>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
        {view === 'list' && (
          <Chip
            label={periodLabel}
            onPress={() => setPeriodSheetVisible(true)}
            trailing={<Feather name="chevron-down" size={14} color={colors.text} />}
          />
        )}
        <Chip label="전체" selected={payType === undefined} onPress={() => setPayType(undefined)} />
        <Chip label="지출" selected={payType === PayType.Expense} onPress={() => setPayType(PayType.Expense)} />
        <Chip label="수입" selected={payType === PayType.Income} onPress={() => setPayType(PayType.Income)} />
      </ScrollView>

      {isError && <Text style={styles.error}>서버에 연결하지 못했어요. 당겨서 다시 시도해 주세요.</Text>}

      {view === 'calendar' && (
        <MonthGrid
          year={year}
          monthIndex={monthIndex}
          transactions={transactions}
          selectedDay={selectedDay}
          onSelectDay={(d) => setSelectedDay((prev) => (prev === d ? null : d))}
        />
      )}

      {(view === 'list' ? groups : groups.filter((g) => g.ymd === selectedDay)).map((g) => (
        <View key={g.ymd} style={styles.group}>
          <View style={styles.groupHeader}>
            <Text style={styles.groupTitle}>{g.label}</Text>
            <Text style={styles.groupTotal}>{formatWon(g.net, { sign: true })}</Text>
          </View>
          <Card padded={false} style={{ overflow: 'hidden' }}>
            {g.items.map((t, i) => (
              <View key={t.id}>
                {i > 0 && <View style={styles.divider} />}
                <TransactionRow item={t} onPress={openEdit} onLongPress={openActions} />
              </View>
            ))}
          </Card>
        </View>
      ))}

      {data && groups.length === 0 && <Text style={styles.empty}>이 기간에는 내역이 없어요</Text>}
      {view === 'calendar' && groups.length > 0 && selectedDay === null && (
        <Text style={styles.empty}>날짜를 누르면 그날 내역을 볼 수 있어요</Text>
      )}

      <PeriodSheet
        visible={periodSheetVisible}
        onClose={() => setPeriodSheetVisible(false)}
        onSelect={(p) => { setPeriod(p); setPeriodSheetVisible(false); }}
      />
    </Screen>
  );
}

function periodRange(period: Period, year: number, monthIndex: number): DateRange {
  if (period.kind === 'today') {
    const today = toKst().format('YYYY-MM-DD');
    return kstDateRange(today, today);
  }
  if (period.kind === 'range') return kstDateRange(period.start, period.end);
  return kstMonthRange(year, monthIndex);
}

interface DayGroup {
  ymd: string;
  label: string;
  net: number;           // 수입 - 지출
  items: Transaction[];  // 최신순
}

// KST 날짜별로 묶어서 최신 날짜부터
function groupByDay(transactions: Transaction[]): DayGroup[] {
  const map = new Map<string, DayGroup>();
  for (const t of transactions) {
    const ymd = toKst(t.date).format('YYYY-MM-DD');
    let g = map.get(ymd);
    if (!g) {
      g = { ymd, label: dayHeaderLabel(t.date), net: 0, items: [] };
      map.set(ymd, g);
    }
    g.net += t.paytype === PayType.Income ? t.cost : -t.cost;
    g.items.push(t);
  }
  const groups = [...map.values()].sort((a, b) => (a.ymd < b.ymd ? 1 : -1));
  groups.forEach((g) => g.items.reverse()); // 서버는 오름차순
  return groups;
}

function MonthGrid({ year, monthIndex, transactions, selectedDay, onSelectDay }: {
  year: number;
  monthIndex: number;
  transactions: Transaction[];
  selectedDay: string | null;
  onSelectDay: (ymd: string) => void;
}) {
  const styles = useThemedStyles(makeStyles);
  const { colors } = useTheme();

  const totals = useMemo(() => {
    const map = new Map<string, { income: number; expense: number }>();
    for (const t of transactions) {
      const ymd = toKst(t.date).format('YYYY-MM-DD');
      const v = map.get(ymd) ?? { income: 0, expense: 0 };
      if (t.paytype === PayType.Income) v.income += t.cost;
      else v.expense += t.cost;
      map.set(ymd, v);
    }
    return map;
  }, [transactions]);

  const first = dayjs(new Date(year, monthIndex, 1));
  const blanks = first.day();
  const days = first.daysInMonth();
  const today = toKst().format('YYYY-MM-DD');
  const cells: (string | null)[] = [
    ...Array(blanks).fill(null),
    ...Array.from({ length: days }, (_, i) => first.date(i + 1).format('YYYY-MM-DD')),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <Card padded={false} style={styles.grid}>
      <View style={styles.gridRow}>
        {WEEKDAYS.map((w, i) => (
          <Text key={w} style={[styles.weekday, i === 0 && { color: colors.expense }, i === 6 && { color: colors.income }]}>{w}</Text>
        ))}
      </View>
      {Array.from({ length: cells.length / 7 }, (_, row) => (
        <View key={row} style={styles.gridRow}>
          {cells.slice(row * 7, row * 7 + 7).map((ymd, i) => {
            if (!ymd) return <View key={i} style={styles.cell} />;
            const v = totals.get(ymd);
            const selected = ymd === selectedDay;
            return (
              <Pressable key={ymd} onPress={() => onSelectDay(ymd)} style={[styles.cell, selected && styles.cellSelected]} accessibilityLabel={`${dayjs(ymd).date()}일`}>
                <Text style={[styles.cellDay, ymd === today && styles.cellToday]}>{dayjs(ymd).date()}</Text>
                {v && v.income > 0 && <Text style={[styles.cellAmount, { color: colors.income }]} numberOfLines={1}>+{compactWon(v.income)}</Text>}
                {v && v.expense > 0 && <Text style={[styles.cellAmount, { color: colors.expense }]} numberOfLines={1}>-{compactWon(v.expense)}</Text>}
              </Pressable>
            );
          })}
        </View>
      ))}
    </Card>
  );
}

function PeriodSheet({ visible, onClose, onSelect }: { visible: boolean; onClose: () => void; onSelect: (p: Period) => void }) {
  const styles = useThemedStyles(makeStyles);
  const { colors } = useTheme();
  const [picking, setPicking] = useState(false);
  const [start, setStart] = useState<string | null>(null);
  const [end, setEnd] = useState<string | null>(null);

  const close = () => { setPicking(false); setStart(null); setEnd(null); onClose(); };
  const choose = (p: Period) => { setPicking(false); setStart(null); setEnd(null); onSelect(p); };

  // 첫 탭 = 시작일, 두 번째 탭 = 종료일 (시작일보다 앞이면 시작일을 다시 고름)
  const pressDay = (ymd: string) => {
    if (!start || end || ymd < start) {
      setStart(ymd);
      setEnd(null);
    } else {
      setEnd(ymd);
    }
  };

  const marked: Record<string, object> = {};
  if (start) {
    const last = end ?? start;
    for (let d = dayjs(start); !d.isAfter(dayjs(last), 'day'); d = d.add(1, 'day')) {
      const key = d.format('YYYY-MM-DD');
      marked[key] = {
        startingDay: key === start,
        endingDay: key === last,
        color: key === start || key === last ? colors.primary : colors.primarySoft,
        textColor: colors.textOnPrimary,
      };
    }
  }

  return (
    <BottomSheet visible={visible} onClose={close} title={picking ? '기간 선택' : '기간'}>
      {picking ? (
        <View>
          <KoreanCalendar
            markingType="period"
            markedDates={marked}
            onDayPress={(d) => pressDay(d.dateString)}
          />
          <Text style={styles.pickHint}>
            {!start ? '시작일을 고르세요' : !end ? '종료일을 고르세요' : `${dayjs(start).format('M월 D일')} ~ ${dayjs(end).format('M월 D일')}`}
          </Text>
          <Button label="확인" disabled={!start || !end} onPress={() => start && end && choose({ kind: 'range', start, end })} />
        </View>
      ) : (
        <View style={styles.periodOptions}>
          <PeriodOption icon="calendar" label="월별로 보기" onPress={() => choose({ kind: 'month' })} />
          <PeriodOption icon="sun" label="오늘" onPress={() => choose({ kind: 'today' })} />
          <PeriodOption icon="sliders" label="기간 직접 선택" onPress={() => setPicking(true)} />
        </View>
      )}
    </BottomSheet>
  );
}

function PeriodOption({ icon, label, onPress }: { icon: keyof typeof Feather.glyphMap; label: string; onPress: () => void }) {
  const styles = useThemedStyles(makeStyles);
  const { colors } = useTheme();
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.periodOption, pressed && { opacity: 0.6 }]} accessibilityRole="button">
      <Feather name={icon} size={18} color={colors.textSecondary} />
      <Text style={styles.periodOptionText}>{label}</Text>
      <Feather name="chevron-right" size={18} color={colors.textTertiary} />
    </Pressable>
  );
}

const makeStyles = ({ colors, radius, spacing, typography }: Theme) =>
  StyleSheet.create({
    titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    title: { ...typography.title, color: colors.text },
    periodRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    periodReset: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    periodText: { ...typography.heading, color: colors.text },
    totals: { alignItems: 'flex-end', gap: 2 },
    total: { ...typography.captionBold },
    chips: { gap: spacing.sm, paddingRight: spacing.lg },
    error: { ...typography.caption, color: colors.expense },
    group: { gap: spacing.sm },
    groupHeader: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 2 },
    groupTitle: { ...typography.captionBold, fontSize: 13, color: colors.textSecondary },
    groupTotal: { ...typography.caption, fontSize: 13, color: colors.textSecondary, fontVariant: ['tabular-nums'] },
    divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.divider, marginLeft: 68 },
    empty: { ...typography.body, color: colors.textSecondary, textAlign: 'center', marginTop: spacing.lg },

    grid: { paddingVertical: spacing.sm, paddingHorizontal: 4 },
    gridRow: { flexDirection: 'row' },
    weekday: { flex: 1, textAlign: 'center', ...typography.caption, color: colors.textSecondary, paddingVertical: 6 },
    cell: { flex: 1, minHeight: 58, alignItems: 'center', paddingTop: 6, borderRadius: radius.sm, gap: 1 },
    cellSelected: { backgroundColor: colors.primarySoft },
    cellDay: { ...typography.caption, fontSize: 13, color: colors.text, fontWeight: '600' },
    cellToday: { color: colors.expense, fontWeight: '800' },
    cellAmount: { fontSize: 9.5, fontWeight: '600', fontVariant: ['tabular-nums'] },

    periodOptions: { marginBottom: spacing.sm },
    periodOption: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.lg, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.divider },
    periodOptionText: { ...typography.body, color: colors.text, flex: 1 },
    pickHint: { ...typography.body, color: colors.textSecondary, textAlign: 'center', marginVertical: spacing.md },
  });
