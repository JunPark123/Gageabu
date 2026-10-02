// 통계: 카테고리 도넛 + 최근 6개월 막대
import { ComponentProps, memo, useMemo, useState } from 'react';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useIsFocused } from 'expo-router';
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
import { useChartProgress } from '@/src/hooks/useChartProgress';
import { categoriesFor, findCategory, tint } from '@/src/lib/categories';
import { addMonths, kstMonthRange, toKst } from '@/src/lib/date';
import { compactWon, formatWon } from '@/src/lib/format';
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
      {/* 제목·월 이동은 고정 — 좌우로 넘길 때는 아래 차트만 움직임 */}
      <ScreenHeader>
        <View style={styles.headingBlock}>
          <Text style={styles.title}>통계</Text>
          <Text style={styles.subtitle}>선택한 달의 돈 흐름을 살펴봐요</Text>
        </View>
        <View style={styles.monthBar}><MonthNavigator size="lg" context="stats" showThisMonth /></View>
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
const StatsMonthPage = memo(function StatsMonthPage({ year, monthIndex, payType, onPayTypeChange, isCurrent, animate }: { year: number; monthIndex: number; payType: PayType; onPayTypeChange: (payType: PayType) => void; isCurrent: boolean; animate: boolean }) {
  const styles = useThemedStyles(makeStyles);
  const { colors, scheme } = useTheme();
  const { width } = useWindowDimensions();
  const [legendMode, setLegendMode] = useState<'amount' | 'ratio'>('amount');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // 이 달 포함 최근 6개월을 한 번에 조회
  const params = useMemo(() => sixMonthWindow(year, monthIndex), [year, monthIndex]);
  const { data, error, isError, isFetching, refetch } = useTransactionSummary(params);
  useRefreshOnFocus(refetch, isCurrent);

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
  const selectedIndex = slices.findIndex((s) => s.category.name === selectedCategory);
  const selectedSlice = selectedIndex >= 0 ? slices[selectedIndex] : null;
  const narrowChart = width < 400;
  const donutSize = narrowChart ? 108 : 150;
  const remainder = total - (slices[0]?.value ?? 0);
  const showRemainder = slices.length >= 3 && total > 0 && slices[0].value / total >= 0.8 && remainder > 0;

  return (
    <MonthPageScroll onRefresh={refetch} isCurrent={isCurrent}>
      {isError && <ErrorState error={error} onRetry={() => refetch()} retrying={isFetching} compact={!!data} />}
      {/* 처음 불러오는 중이면 로딩, 못 불러왔으면 위 안내만 — 모르는 값을 ₩0으로 보여주지 않음 */}
      {!data && !isError && <LoadingState />}
      {data && (<>

        <Card style={[styles.donutCard, narrowChart && styles.donutCardNarrow]}>
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
            <RevealingDonut active={animate} trigger={payType} slices={slices.map((s) => ({ value: s.value, color: s.category.color }))} size={donutSize} thickness={19}>
              <Text style={styles.donutLabel}>총 {isExpense ? '지출' : '수입'}</Text>
              <CountUpText value={total} active={animate} format={narrowChart ? compactWon : formatChartTotal} accessibilityLabel={formatWon(total)} style={[styles.donutAmount, narrowChart && styles.donutAmountNarrow]} numberOfLines={1} adjustsFontSizeToFit />
            </RevealingDonut>
            <View style={styles.ranking}>
              <Text style={styles.rankingTitle}>카테고리 순위</Text>
              {slices.length === 0 ? <Text style={styles.empty}>이 달에는 {isExpense ? '지출' : '수입'}이 없어요</Text> : slices.map((s, i) => {
                const chosen = selectedIndex === i;
                return (
                  <Pressable
                    key={s.category.name}
                    onPress={() => setSelectedCategory(chosen ? null : s.category.name)}
                    accessibilityRole="button"
                    accessibilityState={{ selected: chosen }}
                    accessibilityLabel={`${i + 1}위 ${s.category.name}, ${formatWon(s.value)}, ${formatShare(s.value, total)}`}
                    style={({ pressed }) => [styles.rankRow, chosen && { backgroundColor: tint(s.category.color, scheme === 'dark' ? 0.16 : 0.09), borderLeftColor: s.category.color }, pressed && styles.rankPressed]}
                  >
                    <Text style={[styles.rankNumber, chosen && { color: s.category.color }]}>{i + 1}</Text>
                    <View style={styles.rankCopy}>
                      <Text style={styles.rankName} numberOfLines={1}>{s.category.name}</Text>
                      <Text style={styles.rankValue} numberOfLines={1} adjustsFontSizeToFit>
                        {legendMode === 'amount' ? formatWon(s.value) : formatShare(s.value, total)}
                      </Text>
                    </View>
                    <View style={[styles.rankSwatch, { backgroundColor: s.category.color }]} />
                  </Pressable>
                );
              })}
            </View>
          </View>
          {selectedSlice && (
            <View style={styles.selectedDetail}>
              <View style={[styles.selectedAccent, { backgroundColor: selectedSlice.category.color }]} />
              <Text style={styles.selectedDetailName}>{selectedSlice.category.name}</Text>
              <Text style={styles.selectedDetailValue} numberOfLines={1} adjustsFontSizeToFit>
                {formatWon(selectedSlice.value)} · {formatShare(selectedSlice.value, total)}
              </Text>
            </View>
          )}
          {showRemainder && (
            <View style={styles.remainder}>
              <View style={styles.remainderHeading}>
                <Text style={styles.remainderTitle}>{slices[0].category.name} 외 카테고리 확대</Text>
                <Text style={styles.remainderShare}>{formatShare(remainder, total)}</Text>
              </View>
              <View style={styles.remainderTrack} accessibilityLabel={`${slices[0].category.name}을 제외한 카테고리의 비율 확대`}>
                {slices.slice(1).map(({ category, value: amount }) => (
                  <View key={category.name} style={{ flex: amount, backgroundColor: category.color }} />
                ))}
              </View>
            </View>
          )}
        </Card>

        <Card>
          <View style={styles.barHeader}>
            <View style={styles.barHeadingCopy}>
              <Text style={styles.cardTitle}>월별 {isExpense ? '지출' : '수입'} 추이</Text>
              <Text style={styles.barCurrentValue}>{monthIndex + 1}월 {formatWon(total)}</Text>
            </View>
            <SegmentedControl size="sm" options={[{ value: PayType.Expense, label: '지출', activeColor: colors.primary }, { value: PayType.Income, label: '수입', activeColor: colors.primary }]} value={payType} onChange={(next) => { setSelectedCategory(null); onPayTypeChange(next); }} />
          </View>
          <MonthBars months={months} payType={payType} active={animate} />
          <Text style={styles.compare}>
            🐷 {compareText(isExpense, current, previous)}
          </Text>
        </Card>
        <View style={styles.metrics}>
          <Card style={styles.metricCard}>
            <Text style={styles.cardTitle}>선택한 달의 수입·지출</Text>
            <Text style={styles.metricHint}>들어온 돈</Text>
            <CountUpText value={current.income} active={animate} format={formatWon} style={[styles.metricAmount, { color: colors.income }]} />
            <MetricTrack amount={current.income} maximum={Math.max(current.income, current.expense, 1)} color={colors.income} active={animate} />
            <Text style={styles.metricHint}>나간 돈</Text>
            <CountUpText value={current.expense} active={animate} format={formatWon} style={[styles.metricAmount, { color: colors.expense }]} />
            <MetricTrack amount={current.expense} maximum={Math.max(current.income, current.expense, 1)} color={colors.expense} active={animate} />
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
});

// 진행률은 작은 차트 안에서만 갱신한다. 페이지 전체와 순위 목록은 매 프레임 렌더하지 않는다.
function RevealingDonut({ active, trigger, ...props }: ComponentProps<typeof DonutChart> & { active: boolean; trigger: number | string }) {
  const progress = useChartProgress(active, trigger);
  return <DonutChart {...props} progress={progress} />;
}

function MetricTrack({ amount, maximum, color, active }: { amount: number; maximum: number; color: string; active: boolean }) {
  const styles = useThemedStyles(makeStyles);
  const progress = useChartProgress(active, amount);
  const fillStyle = useAnimatedStyle(() => ({ transform: [{ scaleX: progress.value }] }));
  return <View style={styles.metricTrack}><Animated.View style={[styles.metricFill, { width: `${Math.min(100, amount / maximum * 100)}%`, backgroundColor: color, transformOrigin: 'left center' }, fillStyle]} /></View>;
}

function MonthBars({ months, payType, active }: { months: MonthTotal[]; payType: PayType; active: boolean }) {
  const progress = useChartProgress(active, payType);
  const barStyle = useAnimatedStyle(() => ({ transform: [{ scaleY: progress.value }] }));
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
              <Animated.View style={[styles.bar, { height: ((payType === PayType.Expense ? m.expense : m.income) / max) * HEIGHT, backgroundColor: payType === PayType.Expense ? colors.expense : colors.income, opacity: last ? 1 : 0.35, transformOrigin: 'center bottom' }, barStyle]} />
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

function formatShare(value: number, total: number) {
  if (total <= 0 || value <= 0) return '0%';
  const share = value / total * 100;
  if (share < 0.01) return '<0.01%';
  if (share < 1) return `${share.toFixed(2)}%`;
  const rounded = Math.round(share * 10) / 10;
  if (share < 100 && rounded >= 100) return '<100%';
  return `${rounded}%`;
}

function formatChartTotal(value: number) {
  if (value < 10000) return formatWon(value);
  const unit = value < 100000000 ? 10000 : 100000000;
  const label = value < 100000000 ? '만' : '억';
  const rounded = (Math.round(value / unit * 10) / 10).toLocaleString('ko-KR', { maximumFractionDigits: 1 });
  return `₩${rounded}${label}`;
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
    headingBlock: { alignItems: 'center', gap: 3 },
    title: { ...typography.title, color: colors.text, textAlign: 'center' },
    subtitle: { ...typography.caption, color: colors.textSecondary, textAlign: 'center' },
    monthBar: { width: '100%' },
    donutCard: { gap: spacing.md },
    donutCardNarrow: { padding: spacing.md },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.sm },
    donutBody: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, paddingVertical: spacing.xs },
    donutLabel: { ...typography.caption, color: colors.textSecondary },
    donutAmount: { fontFamily: CUTE_FONT, fontSize: 18, color: colors.text, marginTop: 2 },
    donutAmountNarrow: { fontSize: 16 },
    ranking: { flex: 1, minWidth: 0, maxWidth: 220, gap: 3 },
    rankingTitle: { ...typography.captionBold, color: colors.textSecondary, marginBottom: 4 },
    rankRow: { flexDirection: 'row', alignItems: 'center', gap: 5, minHeight: 40, paddingHorizontal: 4, paddingVertical: 4, borderRadius: 9, borderLeftWidth: 3, borderLeftColor: 'transparent' },
    rankPressed: { opacity: 0.65 },
    rankNumber: { ...typography.captionBold, fontSize: 13, width: 12, color: colors.textSecondary, textAlign: 'center', fontVariant: ['tabular-nums'] },
    rankSwatch: { width: 14, height: 14, borderRadius: 4, marginLeft: 'auto' },
    rankCopy: { flex: 1, minWidth: 0, gap: 1 },
    rankName: { ...typography.captionBold, fontSize: 13, color: colors.text },
    rankValue: { ...typography.caption, fontSize: 11, color: colors.textSecondary, fontVariant: ['tabular-nums'] },
    selectedDetail: { flexDirection: 'row', alignItems: 'center', gap: 7, paddingTop: spacing.sm, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.divider },
    selectedAccent: { width: 4, height: 20, borderRadius: 2 },
    selectedDetailName: { ...typography.captionBold, color: colors.text },
    selectedDetailValue: { ...typography.caption, flex: 1, textAlign: 'right', color: colors.textSecondary, fontVariant: ['tabular-nums'] },
    remainder: { gap: 7 },
    remainderHeading: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.sm },
    remainderTitle: { ...typography.caption, color: colors.textSecondary },
    remainderShare: { ...typography.captionBold, color: colors.text, fontVariant: ['tabular-nums'] },
    remainderTrack: { flexDirection: 'row', height: 8, borderRadius: 4, overflow: 'hidden', backgroundColor: colors.surfaceMuted },
    empty: { ...typography.caption, color: colors.textSecondary, lineHeight: 18 },
    cardTitle: { ...typography.captionBold, fontSize: 13, color: colors.text },
    barHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: spacing.lg, gap: 4 },
    barHeadingCopy: { gap: 5, flex: 1, minWidth: 0 },
    barCurrentValue: { ...typography.captionBold, color: colors.textSecondary, fontVariant: ['tabular-nums'] },
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
