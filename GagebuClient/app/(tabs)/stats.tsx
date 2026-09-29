// 통계: 카테고리 도넛 + 최근 6개월 막대
import { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useIsFocused } from 'expo-router';
import { AppIcon } from '@/src/components/AppIcon';
import { Card } from '@/src/components/Card';
import { CountUpText } from '@/src/components/CountUpText';
import { DonutChart } from '@/src/components/DonutChart';
import { ErrorState } from '@/src/components/ErrorState';
import { LoadingState } from '@/src/components/LoadingState';
import { MonthNavigator } from '@/src/components/MonthNavigator';
import { MonthPager } from '@/src/components/MonthPager';
import { PigFace } from '@/src/components/Pig';
import { MonthPageScroll, PagedScreen, ScreenHeader } from '@/src/components/Screen';
import { SegmentedControl } from '@/src/components/SegmentedControl';
import { useRefreshOnFocus, useTransactionSummary } from '@/src/hooks/useTransactions';
import { useEntranceProgress } from '@/src/hooks/useEntranceProgress';
import { categoriesFor, findCategory, tint } from '@/src/lib/categories';
import { addMonths, kstMonthRange, toKst } from '@/src/lib/date';
import { formatWon } from '@/src/lib/format';
import { PayType, Transaction } from '@/src/models/Transaction';
import { Theme, useTheme, useThemedStyles } from '@/src/theme/ThemeProvider';
import { CUTE_FONT } from '@/src/theme/tokens';

const MONTHS = 6;

interface MonthTotal {
  year: number;
  monthIndex: number;
  income: number;
  expense: number;
}

export default function StatsScreen() {
  const styles = useThemedStyles(makeStyles);
  const [payType, setPayType] = useState<PayType>(PayType.Expense);
  const focused = useIsFocused();

  return (
    <PagedScreen>
      <ScreenHeader>
        <Text style={styles.title}>통계</Text>
        <View style={styles.monthBar}><MonthNavigator size="lg" /></View>
      </ScreenHeader>
      <MonthPager
        renderPage={(year, monthIndex, isCurrent) => (
          <StatsMonthPage year={year} monthIndex={monthIndex} payType={payType} onPayTypeChange={setPayType} isCurrent={isCurrent} animate={focused && isCurrent} />
        )}
      />
    </PagedScreen>
  );
}

// 한 달 페이지: 카테고리 도넛 + 최근 6개월 막대
function StatsMonthPage({ year, monthIndex, payType, onPayTypeChange, isCurrent, animate }: { year: number; monthIndex: number; payType: PayType; onPayTypeChange: (payType: PayType) => void; isCurrent: boolean; animate: boolean }) {
  const styles = useThemedStyles(makeStyles);
  const { colors, scheme } = useTheme();
  const [legendMode, setLegendMode] = useState<'amount' | 'ratio'>('amount');

  // 이 달 포함 최근 6개월을 한 번에 조회
  const params = useMemo(() => sixMonthWindow(year, monthIndex), [year, monthIndex]);
  const { data, dataUpdatedAt, error, isError, isFetching, refetch } = useTransactionSummary(params);
  useRefreshOnFocus(refetch, isCurrent);
  const reveal = useEntranceProgress(animate, `${dataUpdatedAt}:${payType}:${year}:${monthIndex}`);

  const transactions = data?.transactions ?? [];
  const months = useMemo(() => monthTotals(transactions, year, monthIndex), [transactions, year, monthIndex]);
  const current = months[MONTHS - 1];
  const previous = months[MONTHS - 2];
  const savingRate = current.income > 0 ? Math.round((current.income - current.expense) / current.income * 100) : null;

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

  return (
    <MonthPageScroll onRefresh={refetch}>
      {isError && <ErrorState error={error} onRetry={() => refetch()} retrying={isFetching} compact={!!data} />}
      {/* 처음 불러오는 중이면 로딩, 못 불러왔으면 위 안내만 — 모르는 값을 ₩0으로 보여주지 않음 */}
      {!data && !isError && <LoadingState />}
      {data && (<>

        <Card style={styles.donutCard}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>카테고리별 {isExpense ? '지출' : '수입'} 비율</Text>
            <SegmentedControl
              size="sm"
              options={[{ value: 'amount', label: '금액', activeColor: colors.primary }, { value: 'ratio', label: '비율', activeColor: colors.primary }]}
              value={legendMode}
              onChange={setLegendMode}
            />
          </View>
          <View style={styles.donutBody}>
            <DonutChart slices={slices.map((s) => ({ value: s.value, color: s.category.color }))} size={176} thickness={24} progress={reveal}>
              <Text style={styles.donutLabel}>총 {isExpense ? '지출' : '수입'}</Text>
              <CountUpText value={total} active={animate} format={formatWon} style={styles.donutAmount} numberOfLines={1} adjustsFontSizeToFit />
            </DonutChart>
          </View>
          {slices.length === 0 ? <Text style={styles.empty}>이 달에는 {isExpense ? '지출' : '수입'}이 없어요</Text> : (
            <View style={styles.legend}>
              {slices.slice(0, 6).map((s) => (
                <View key={s.category.name} style={[styles.legendItem, { backgroundColor: tint(s.category.color, scheme === 'dark' ? 0.18 : 0.1) }]}>
                  <View style={[styles.legendDot, { backgroundColor: s.category.color }]} />
                  <AppIcon name={s.category.art} size={20} />
                  <Text style={styles.legendName}>{s.category.name}</Text>
                  <Text style={styles.legendAmount} numberOfLines={1}>{legendMode === 'amount' ? formatWon(s.value) : `${Math.round((s.value / total) * 100)}%`}</Text>
                </View>
              ))}
            </View>
          )}
        </Card>

        <Card>
          <View style={styles.barHeader}>
            <Text style={styles.cardTitle}>월별 {isExpense ? '지출' : '수입'} 추이</Text>
            <SegmentedControl size="sm" options={[{ value: PayType.Expense, label: '지출', activeColor: colors.primary }, { value: PayType.Income, label: '수입', activeColor: colors.primary }]} value={payType} onChange={onPayTypeChange} />
          </View>
          <MonthBars months={months} payType={payType} progress={reveal} />
          <Text style={styles.compare}>
            🐷 {compareText(isExpense, current, previous)}
          </Text>
        </Card>
        <View style={styles.metrics}>
          <Card style={styles.metricCard}>
            <Text style={styles.cardTitle}>이번 달 돈의 흐름</Text>
            <Text style={styles.metricHint}>들어온 돈</Text>
            <CountUpText value={current.income} active={animate} format={formatWon} style={[styles.metricAmount, { color: colors.income }]} />
            <View style={styles.metricTrack}><View style={[styles.metricFill, { width: `${Math.min(100, current.income / Math.max(current.income, current.expense, 1) * 100) * reveal}%`, backgroundColor: colors.income }]} /></View>
            <Text style={styles.metricHint}>나간 돈</Text>
            <CountUpText value={current.expense} active={animate} format={formatWon} style={[styles.metricAmount, { color: colors.expense }]} />
            <View style={styles.metricTrack}><View style={[styles.metricFill, { width: `${Math.min(100, current.expense / Math.max(current.income, current.expense, 1) * 100) * reveal}%`, backgroundColor: colors.expense }]} /></View>
          </Card>
          <Card style={styles.metricCard}>
            <Text style={styles.cardTitle}>저축률</Text>
            {/* 돼지 얼굴: 20% 이상 웃음, 0% 이상 걱정, 적자면 울음 */}
            <View style={styles.savingRow}>
              <PigFace state={savingRate === null || savingRate >= 20 ? 'happy' : savingRate >= 0 ? 'concerned' : 'crying'} size={40} />
              {savingRate !== null ? <CountUpText value={savingRate} active={animate} format={(v) => `${v}%`} style={[styles.savingRate, { color: colors.expense }]} /> : <Text style={styles.savingRate}>—</Text>}
            </View>
            <Text style={styles.metricHint}>수입 대비 남은 비율</Text>
          </Card>
        </View>
      </>)}
    </MonthPageScroll>
  );
}

function MonthBars({ months, payType, progress }: { months: MonthTotal[]; payType: PayType; progress: number }) {
  const styles = useThemedStyles(makeStyles);
  const { colors } = useTheme();
  const max = Math.max(1, ...months.map((m) => payType === PayType.Expense ? m.expense : m.income));
  const HEIGHT = 120;

  return (
    <View style={styles.bars}>
      {months.map((m, i) => {
        const last = i === months.length - 1;
        return (
          <View key={`${m.year}-${m.monthIndex}`} style={styles.barGroup}>
            <View style={[styles.barPair, { height: HEIGHT }]}>
              <View style={[styles.bar, { height: ((payType === PayType.Expense ? m.expense : m.income) / max) * HEIGHT * progress, backgroundColor: payType === PayType.Expense ? colors.expense : colors.income, opacity: last ? 1 : 0.35 }]} />
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
    title: { ...typography.heading, fontSize: 19, color: colors.text, textAlign: 'center' },
    monthBar: { alignItems: 'center', backgroundColor: colors.surface, borderRadius: 12, paddingVertical: 6 },
    donutCard: { gap: spacing.md },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.sm },
    donutBody: { alignItems: 'center', paddingVertical: spacing.xs },
    donutLabel: { ...typography.caption, color: colors.textSecondary },
    donutAmount: { fontFamily: CUTE_FONT, fontSize: 20, color: colors.text, marginTop: 2 },
    empty: { ...typography.body, color: colors.textSecondary, textAlign: 'center' },
    // 범례: 카테고리 색이 옅게 깔린 줄 (2칸씩)
    legend: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
    legendItem: { flexBasis: '47%', flexGrow: 1, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 8, borderRadius: 12 },
    legendDot: { width: 4, height: 18, borderRadius: 2 },
    legendName: { ...typography.captionBold, color: colors.text, flex: 1 },
    legendAmount: { ...typography.captionBold, fontSize: 11, color: colors.textSecondary, fontVariant: ['tabular-nums'] },
    cardTitle: { ...typography.captionBold, fontSize: 13, color: colors.text },
    barHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.lg, gap: 4 },
    barLegend: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    barLegendText: { ...typography.caption, color: colors.textSecondary },
    bars: { flexDirection: 'row', justifyContent: 'space-between' },
    barGroup: { flex: 1, alignItems: 'center', gap: 6 },
    barPair: { flexDirection: 'row', alignItems: 'flex-end', gap: 3 },
    bar: { width: 23, borderTopLeftRadius: 6, borderTopRightRadius: 6 },
    barLabel: { ...typography.caption, color: colors.textSecondary },
    barLabelCurrent: { color: colors.text, fontWeight: '800' },
    compare: { ...typography.caption, fontSize: 13, color: colors.textSecondary, marginTop: spacing.lg },
    metrics: { flexDirection: 'row', gap: spacing.sm },
    metricCard: { flex: 1, minWidth: 0, gap: 7 },
    metricAmount: { ...typography.captionBold, fontSize: 13 },
    metricTrack: { height: 10, borderRadius: 6, backgroundColor: colors.surfaceMuted, overflow: 'hidden' },
    metricFill: { height: '100%', borderRadius: 6 },
    savingRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 },
    savingRate: { ...typography.title },
    metricHint: { ...typography.caption, color: colors.textSecondary },
  });
