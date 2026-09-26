// 통계: 카테고리 도넛 + 최근 6개월 막대
import { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Card } from '@/src/components/Card';
import { DonutChart } from '@/src/components/DonutChart';
import { MonthNavigator } from '@/src/components/MonthNavigator';
import { MonthSwipeContent } from '@/src/components/MonthSwipe';
import { Screen } from '@/src/components/Screen';
import { SegmentedControl } from '@/src/components/SegmentedControl';
import { usePrefetchSummaries, useRefreshOnFocus, useTransactionSummary } from '@/src/hooks/useTransactions';
import { categoriesFor, findCategory } from '@/src/lib/categories';
import { addMonths, kstMonthRange, toKst } from '@/src/lib/date';
import { formatWon } from '@/src/lib/format';
import { PayType, Transaction } from '@/src/models/Transaction';
import { useSelectedMonth } from '@/src/store/month';
import { Theme, useTheme, useThemedStyles } from '@/src/theme/ThemeProvider';

const MONTHS = 6;

interface MonthTotal {
  year: number;
  monthIndex: number;
  income: number;
  expense: number;
}

export default function StatsScreen() {
  const styles = useThemedStyles(makeStyles);
  const { colors } = useTheme();
  const { year, monthIndex, shiftMonth } = useSelectedMonth();
  const [payType, setPayType] = useState<PayType>(PayType.Expense);

  // 선택한 달 포함 최근 6개월을 한 번에 조회 (스와이프 대비 이전·다음 달 기준 창도 미리)
  const params = useMemo(() => sixMonthWindow(year, monthIndex), [year, monthIndex]);
  usePrefetchSummaries([-1, 1].map((d) => { const m = addMonths(year, monthIndex, d); return sixMonthWindow(m.year, m.monthIndex); }));
  const { data, isError, refetch } = useTransactionSummary(params);
  useRefreshOnFocus(refetch);

  const transactions = data?.transactions ?? [];
  const months = useMemo(() => monthTotals(transactions, year, monthIndex), [transactions, year, monthIndex]);
  const current = months[MONTHS - 1];
  const previous = months[MONTHS - 2];

  // 이번 달 카테고리별 합계 (큰 순)
  const slices = useMemo(() => {
    const sums = new Map<string, number>();
    for (const t of transactions) {
      if (t.paytype !== payType) continue;
      const d = toKst(t.date);
      if (d.year() !== year || d.month() !== monthIndex) continue;
      const name = findCategory(t.category, payType).name;
      sums.set(name, (sums.get(name) ?? 0) + t.cost);
    }
    return categoriesFor(payType)
      .map((c) => ({ category: c, value: sums.get(c.name) ?? 0 }))
      .filter((s) => s.value > 0)
      .sort((a, b) => b.value - a.value);
  }, [transactions, payType, year, monthIndex]);

  const isExpense = payType === PayType.Expense;
  const total = isExpense ? current.expense : current.income;
  const prevTotal = isExpense ? previous.expense : previous.income;
  const change = prevTotal > 0 ? Math.round(((total - prevTotal) / prevTotal) * 100) : null;

  return (
    <Screen onRefresh={refetch} onSwipeMonth={shiftMonth}>
      <View style={styles.titleRow}>
        <Text style={styles.title}>통계</Text>
        <MonthNavigator />
      </View>

      <SegmentedControl
        options={[
          { value: PayType.Expense, label: '지출', activeTextColor: colors.expense },
          { value: PayType.Income, label: '수입', activeTextColor: colors.income },
        ]}
        value={payType}
        onChange={setPayType}
      />

      {/* 달에 따라 바뀌는 부분 — 스와이프할 때 이 부분만 밀려남 */}
      <MonthSwipeContent style={{ gap: 16 }}>
        {isError && <Text style={styles.error}>서버에 연결하지 못했어요. 당겨서 다시 시도해 주세요.</Text>}

        <Card style={styles.donutCard}>
          <DonutChart slices={slices.map((s) => ({ value: s.value, color: s.category.color }))} size={196} thickness={30}>
            <Text style={styles.donutLabel}>{monthIndex + 1}월 {isExpense ? '지출' : '수입'}</Text>
            <Text style={styles.donutAmount} numberOfLines={1} adjustsFontSizeToFit>{formatWon(total)}</Text>
            {change !== null && (
              <Text style={styles.donutChange}>지난달보다 {change > 0 ? '+' : ''}{change}%</Text>
            )}
          </DonutChart>

          {slices.length === 0 ? (
            <Text style={styles.empty}>{data ? `이 달에는 ${isExpense ? '지출' : '수입'}이 없어요` : '불러오는 중…'}</Text>
          ) : (
            <View style={styles.legend}>
              {slices.map((s) => (
                <View key={s.category.name} style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: s.category.color }]} />
                  <Text style={styles.legendName}>{s.category.name}</Text>
                  <Text style={styles.legendPct}>{Math.round((s.value / total) * 100)}%</Text>
                  <Text style={styles.legendAmount} numberOfLines={1}>{formatWon(s.value)}</Text>
                </View>
              ))}
            </View>
          )}
        </Card>

        <Card>
          <View style={styles.barHeader}>
            <Text style={styles.cardTitle}>최근 6개월</Text>
            <View style={styles.barLegend}>
              <View style={[styles.legendDot, { backgroundColor: colors.income }]} />
              <Text style={styles.barLegendText}>수입</Text>
              <View style={[styles.legendDot, { backgroundColor: colors.expense, marginLeft: 6 }]} />
              <Text style={styles.barLegendText}>지출</Text>
            </View>
          </View>
          <MonthBars months={months} />
          <Text style={styles.compare}>
            🐷 {compareText(isExpense, current, previous)}
          </Text>
        </Card>
      </MonthSwipeContent>
    </Screen>
  );
}

function MonthBars({ months }: { months: MonthTotal[] }) {
  const styles = useThemedStyles(makeStyles);
  const { colors } = useTheme();
  const max = Math.max(1, ...months.flatMap((m) => [m.income, m.expense]));
  const HEIGHT = 120;

  return (
    <View style={styles.bars}>
      {months.map((m, i) => {
        const last = i === months.length - 1;
        return (
          <View key={`${m.year}-${m.monthIndex}`} style={styles.barGroup}>
            <View style={[styles.barPair, { height: HEIGHT }]}>
              <View style={[styles.bar, { height: (m.income / max) * HEIGHT, backgroundColor: colors.income, opacity: last ? 1 : 0.45 }]} />
              <View style={[styles.bar, { height: (m.expense / max) * HEIGHT, backgroundColor: colors.expense, opacity: last ? 1 : 0.45 }]} />
            </View>
            <Text style={[styles.barLabel, last && styles.barLabelCurrent]}>{m.monthIndex + 1}월</Text>
          </View>
        );
      })}
    </View>
  );
}

function sixMonthWindow(year: number, monthIndex: number) {
  const start = addMonths(year, monthIndex, -(MONTHS - 1));
  return { from: kstMonthRange(start.year, start.monthIndex).from, to: kstMonthRange(year, monthIndex).to };
}

function compareText(isExpense: boolean, current: MonthTotal, previous: MonthTotal) {
  const prevLabel = `${previous.monthIndex + 1}월`;
  if (isExpense) {
    const diff = current.expense - previous.expense;
    if (diff === 0) return `${prevLabel}과 똑같이 썼어요`;
    return `${prevLabel}보다 ${formatWon(Math.abs(diff))} ${diff < 0 ? '덜' : '더'} 썼어요`;
  }
  const diff = current.income - previous.income;
  if (diff === 0) return `${prevLabel}과 수입이 같아요`;
  return `${prevLabel}보다 ${formatWon(Math.abs(diff))} ${diff > 0 ? '더' : '덜'} 벌었어요`;
}

// 선택한 달까지 최근 6개월의 월별 수입·지출 (KST 기준, 오래된 달부터)
function monthTotals(transactions: Transaction[], year: number, monthIndex: number): MonthTotal[] {
  const months: MonthTotal[] = Array.from({ length: MONTHS }, (_, i) => ({
    ...addMonths(year, monthIndex, i - (MONTHS - 1)),
    income: 0,
    expense: 0,
  }));
  for (const t of transactions) {
    const d = toKst(t.date);
    const m = months.find((x) => x.year === d.year() && x.monthIndex === d.month());
    if (!m) continue;
    if (t.paytype === PayType.Income) m.income += t.cost;
    else m.expense += t.cost;
  }
  return months;
}

const makeStyles = ({ colors, spacing, typography }: Theme) =>
  StyleSheet.create({
    titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    title: { ...typography.title, color: colors.text },
    error: { ...typography.caption, color: colors.expense },
    donutCard: { alignItems: 'center', gap: spacing.lg },
    donutLabel: { ...typography.caption, color: colors.textSecondary },
    donutAmount: { ...typography.heading, fontSize: 20, fontWeight: '800', color: colors.text, maxWidth: 120 },
    donutChange: { ...typography.caption, fontSize: 11, color: colors.textSecondary, marginTop: 2 },
    empty: { ...typography.body, color: colors.textSecondary },
    legend: { flexDirection: 'row', flexWrap: 'wrap', rowGap: spacing.sm, alignSelf: 'stretch' },
    legendItem: { width: '50%', flexDirection: 'row', alignItems: 'center', gap: 5, paddingRight: spacing.sm },
    legendDot: { width: 9, height: 9, borderRadius: 2 },
    legendName: { ...typography.caption, fontSize: 13, color: colors.text },
    legendPct: { ...typography.caption, color: colors.textSecondary },
    legendAmount: { ...typography.captionBold, fontSize: 13, color: colors.text, marginLeft: 'auto', fontVariant: ['tabular-nums'] },
    cardTitle: { ...typography.heading, color: colors.text },
    barHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.lg },
    barLegend: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    barLegendText: { ...typography.caption, color: colors.textSecondary },
    bars: { flexDirection: 'row', justifyContent: 'space-between' },
    barGroup: { flex: 1, alignItems: 'center', gap: 6 },
    barPair: { flexDirection: 'row', alignItems: 'flex-end', gap: 3 },
    bar: { width: 10, borderTopLeftRadius: 4, borderTopRightRadius: 4, minHeight: 2 },
    barLabel: { ...typography.caption, color: colors.textSecondary },
    barLabelCurrent: { color: colors.text, fontWeight: '800' },
    compare: { ...typography.caption, fontSize: 13, color: colors.textSecondary, marginTop: spacing.lg },
  });
