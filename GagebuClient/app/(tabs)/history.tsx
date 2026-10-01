// 내역: 리스트(날짜별) / 달력, 기간·입출금 필터
import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import dayjs from 'dayjs';
import { BottomSheet } from '@/src/components/BottomSheet';
import { Button } from '@/src/components/Button';
import { Card } from '@/src/components/Card';
import { Chip } from '@/src/components/Chip';
import { IconButton } from '@/src/components/IconButton';
import { ErrorState } from '@/src/components/ErrorState';
import { LoadingState } from '@/src/components/LoadingState';
import { KoreanCalendar } from '@/src/components/KoreanCalendar';
import { MonthNavigator } from '@/src/components/MonthNavigator';
import { MonthPager } from '@/src/components/MonthPager';
import { MonthPageScroll, PagedScreen, ScreenHeader } from '@/src/components/Screen';
import { TransactionRow } from '@/src/components/TransactionRow';
import { useTransactionSheet } from '@/src/features/transactions/TransactionSheetProvider';
import { useRefreshOnFocus, useTransactionSummary } from '@/src/hooks/useTransactions';
import { DateRange, kstDateRange, kstMonthRange, toKst } from '@/src/lib/date';
import { compactWon, dayHeaderLabel, formatWon, WEEKDAYS } from '@/src/lib/format';
import { PayType, Transaction } from '@/src/models/Transaction';
import { useSelectedMonth } from '@/src/store/month';
import { Theme, useTheme, useThemedStyles } from '@/src/theme/ThemeProvider';
import { CUTE_FONT } from '@/src/theme/tokens';
import { noWebOutline } from '@/src/theme/web';

type View_ = 'list' | 'calendar';
// 기간: 선택한 달(기본) / 오늘 / 직접 고른 기간 ('YYYY-MM-DD', KST)
type Period = { kind: 'month' } | { kind: 'today' } | { kind: 'range'; start: string; end: string };

export default function HistoryScreen() {
  const styles = useThemedStyles(makeStyles);
  const { colors } = useTheme();
  const { year, monthIndex, isCurrentMonth } = useSelectedMonth();

  const [view, setView] = useState<View_>('list');
  const [period, setPeriod] = useState<Period>({ kind: 'month' });
  const [payType, setPayType] = useState<PayType | undefined>(undefined);
  const [periodSheetVisible, setPeriodSheetVisible] = useState(false);
  const [selectedDay, setSelectedDay] = useState<string | null>(null); // 달력에서 누른 날
  const [search, setSearch] = useState('');

  // 달이 바뀌면 달력에서 고른 날은 해제
  useEffect(() => setSelectedDay(null), [year, monthIndex]);

  // 달력은 한 달 단위로만 보여준다
  const effectivePeriod: Period = view === 'calendar' ? { kind: 'month' } : period;
  const range: DateRange = useMemo(() => periodRange(effectivePeriod, year, monthIndex),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 기간 객체는 매 렌더 새로 만들어지므로 값으로 비교
    [JSON.stringify(effectivePeriod), year, monthIndex]);

  const periodLabel =
    period.kind === 'month' ? (isCurrentMonth ? '이번 달' : `${monthIndex + 1}월`) :
      period.kind === 'today' ? '오늘' :
        `${dayjs(period.start).format('M.D')} ~ ${dayjs(period.end).format('M.D')}`;

  return (
    <PagedScreen>
      <ScreenHeader>
        <Text style={styles.title}>내역</Text>

        {/* 날짜(또는 고른 기간) 왼쪽 · 기간 필터·달력 보기 오른쪽 */}
        <View style={styles.periodRow}>
          {effectivePeriod.kind === 'month' ? (
            <MonthNavigator size="lg" />
          ) : (
            <Pressable onPress={() => setPeriod({ kind: 'month' })} style={styles.periodReset} hitSlop={8} accessibilityLabel="월별 보기로 돌아가기">
              <Text style={styles.periodText}>{periodLabel}</Text>
              <Feather name="x-circle" size={16} color={colors.textTertiary} />
            </Pressable>
          )}
          <View style={styles.periodActions}>
            {view === 'list' && <IconButton icon="sliders" label="기간 선택" onPress={() => setPeriodSheetVisible(true)} size={34} tone="muted" />}
            <IconButton
              icon={view === 'list' ? 'calendar' : 'list'}
              label={view === 'list' ? '달력 보기' : '목록 보기'}
              onPress={() => { setView(view === 'list' ? 'calendar' : 'list'); setSelectedDay(null); }}
              size={34}
              tone="muted"
            />
          </View>
        </View>

        <View style={styles.chips}>
          <Chip label="전체" selected={payType === undefined} onPress={() => setPayType(undefined)} />
          <Chip label="지출" selected={payType === PayType.Expense} onPress={() => setPayType(PayType.Expense)} />
          <Chip label="수입" selected={payType === PayType.Income} onPress={() => setPayType(PayType.Income)} />
        </View>

        {/* 검색: 필터 칩 아래 한 줄 */}
        <View style={styles.searchBox}>
          <Feather name="search" size={17} color={colors.textTertiary} />
          <TextInput value={search} onChangeText={setSearch} placeholder="가맹점명, 금액, 메모로 검색해보세요" placeholderTextColor={colors.textTertiary} style={[styles.searchInput, noWebOutline]} returnKeyType="search" accessibilityLabel="내역 검색" />
          {search ? <Pressable onPress={() => setSearch('')} hitSlop={8} accessibilityLabel="검색어 지우기"><Feather name="x-circle" size={17} color={colors.textSecondary} /></Pressable> : null}
        </View>
      </ScreenHeader>

      {effectivePeriod.kind === 'month' ? (
        // 월별 보기: 달별 페이지를 좌우로 넘김
        <MonthPager
          renderPage={(y, m, isCurrent) => (
            <HistoryPage
              range={kstMonthRange(y, m)}
              payType={payType}
              search={search}
              view={view}
              month={{ year: y, monthIndex: m }}
              isCurrent={isCurrent}
              selectedDay={isCurrent ? selectedDay : null}
              onSelectDay={(d) => setSelectedDay((prev) => (prev === d ? null : d))}
            />
          )}
        />
      ) : (
        // 오늘·직접 고른 기간: 넘김 없이 한 페이지
        <HistoryPage range={range} payType={payType} search={search} view="list" isCurrent selectedDay={null} onSelectDay={() => {}} />
      )}

      <PeriodSheet
        visible={periodSheetVisible}
        onClose={() => setPeriodSheetVisible(false)}
        onSelect={(p) => { setPeriod(p); setPeriodSheetVisible(false); }}
      />
    </PagedScreen>
  );
}

// 한 페이지: (달력) + 날짜별 목록
function HistoryPage({ range, payType, search, view, month, isCurrent, selectedDay, onSelectDay }: {
  range: DateRange;
  payType: PayType | undefined;
  search: string;
  view: View_;
  month?: { year: number; monthIndex: number }; // 달력을 그릴 달 (월별 보기일 때)
  isCurrent: boolean;
  selectedDay: string | null;
  onSelectDay: (ymd: string) => void;
}) {
  const styles = useThemedStyles(makeStyles);
  const { colors } = useTheme();
  const { openEdit, openActions } = useTransactionSheet();

  const params = useMemo(() => ({ ...range, payType }), [range.from, range.to, payType]); // eslint-disable-line react-hooks/exhaustive-deps
  const { data, error, isError, isFetching, refetch } = useTransactionSummary(params);
  useRefreshOnFocus(refetch, isCurrent);

  const transactions = data?.transactions ?? [];
  const query = search.trim().toLocaleLowerCase();
  const visibleTransactions = query ? transactions.filter((t) =>
    `${t.type} ${t.category} ${t.content} ${t.cost}`.toLocaleLowerCase().includes(query)) : transactions;
  const groups = useMemo(() => groupByDay(visibleTransactions), [visibleTransactions]);
  const showCalendar = view === 'calendar' && month;

  return (
    <MonthPageScroll onRefresh={refetch}>
      {isError && <ErrorState error={error} onRetry={() => refetch()} retrying={isFetching} compact={!!data} />}

      {!data && !isError && <LoadingState />}

      {data && !showCalendar && <TotalsCard transactions={visibleTransactions} payType={payType} />}

      {showCalendar && data && (
        <MonthGrid
          year={month.year}
          monthIndex={month.monthIndex}
          transactions={visibleTransactions}
          selectedDay={selectedDay}
          onSelectDay={onSelectDay}
        />
      )}

      {(showCalendar ? groups.filter((g) => g.ymd === selectedDay) : groups).map((g) => (
        <View key={g.ymd} style={styles.group}>
          <View style={styles.groupHeader}>
            <Text style={styles.groupTitle}>{g.label}</Text>
            <View style={[styles.groupTotalPill, { backgroundColor: g.net > 0 ? colors.incomeSoft : g.net < 0 ? colors.expenseSoft : colors.surfaceMuted }]}>
              <Text style={[styles.groupTotal, { color: g.net > 0 ? colors.income : g.net < 0 ? colors.expense : colors.textSecondary }]}>{formatWon(g.net, { sign: true })}</Text>
            </View>
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
      {showCalendar && groups.length > 0 && selectedDay === null && (
        <Text style={styles.empty}>날짜를 누르면 그날 내역을 볼 수 있어요</Text>
      )}
    </MonthPageScroll>
  );
}

// 보이는 내역의 수입·지출·합계 (필터·검색 반영)
function TotalsCard({ transactions, payType }: { transactions: Transaction[]; payType: PayType | undefined }) {
  const styles = useThemedStyles(makeStyles);
  const { colors } = useTheme();
  let income = 0, expense = 0;
  for (const t of transactions) {
    if (t.paytype === PayType.Income) income += t.cost;
    else expense += t.cost;
  }
  const items = [
    { label: '수입', value: income, color: colors.income, bg: colors.incomeSoft, show: payType !== PayType.Expense },
    { label: '지출', value: -expense, color: colors.expense, bg: colors.expenseSoft, show: payType !== PayType.Income },
    { label: '합계', value: income - expense, color: colors.text, bg: colors.surfaceMuted, show: payType === undefined },
  ].filter((i) => i.show);
  return (
    <View style={styles.totals}>
      {items.map((i) => (
        <View key={i.label} style={[styles.totalBox, { backgroundColor: i.bg }]}>
          <Text style={styles.totalLabel}>{i.label}</Text>
          <Text style={[styles.totalValue, { color: i.color }]} numberOfLines={1} adjustsFontSizeToFit>{i.label === '합계' ? formatWon(i.value, { sign: true }) : formatWon(Math.abs(i.value))}</Text>
        </View>
      ))}
    </View>
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
    title: { ...typography.heading, fontSize: 19, color: colors.text, textAlign: 'center' },
    periodActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    searchBox: { backgroundColor: colors.surface, borderRadius: radius.md, minHeight: 42, paddingHorizontal: spacing.md, gap: spacing.sm, flexDirection: 'row', alignItems: 'center', borderWidth: StyleSheet.hairlineWidth * 2, borderColor: colors.border },
    searchInput: { ...typography.caption, fontSize: 13, color: colors.text, flex: 1, paddingVertical: 8 },
    periodRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.md },
    periodReset: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    periodText: { ...typography.heading, color: colors.text },
    chips: { flexDirection: 'row', gap: spacing.sm },
    group: { gap: spacing.sm },
    groupHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingLeft: 6 },
    groupTotalPill: { borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 3 },
    totals: { flexDirection: 'row', gap: spacing.sm },
    totalBox: { flex: 1, minWidth: 0, borderRadius: radius.lg, paddingVertical: spacing.md, paddingHorizontal: 10, gap: 2 },
    totalLabel: { ...typography.captionBold, color: colors.textSecondary },
    totalValue: { fontFamily: CUTE_FONT, fontSize: 15 },
    groupTitle: { ...typography.captionBold, fontSize: 13, color: colors.text },
    groupTotal: { ...typography.captionBold, fontSize: 13, color: colors.expense, fontVariant: ['tabular-nums'] },
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
