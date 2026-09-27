// 홈: 이번 달 요약 · 예산 · 최근 내역
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Card } from '@/src/components/Card';
import { ErrorState } from '@/src/components/ErrorState';
import { LoadingState } from '@/src/components/LoadingState';
import { MonthNavigator } from '@/src/components/MonthNavigator';
import { MonthPager } from '@/src/components/MonthPager';
import { Pig, PiggyBank, PigMood } from '@/src/components/Pig';
import { ProgressBar } from '@/src/components/ProgressBar';
import { MonthPageScroll, PagedScreen, ScreenHeader } from '@/src/components/Screen';
import { TransactionRow } from '@/src/components/TransactionRow';
import { BudgetSheet } from '@/src/features/budget/BudgetSheet';
import { useTransactionSheet } from '@/src/features/transactions/TransactionSheetProvider';
import { useMonthSummary, useRefreshOnFocus } from '@/src/hooks/useTransactions';
import { toKst } from '@/src/lib/date';
import { formatWon } from '@/src/lib/format';
import { budgetFor, useSettings } from '@/src/store/settings';
import { Theme, useTheme, useThemedStyles } from '@/src/theme/ThemeProvider';

const RECENT_COUNT = 5;

export default function HomeScreen() {
  const styles = useThemedStyles(makeStyles);
  const { colors } = useTheme();
  const { settings } = useSettings();

  return (
    <PagedScreen>
      <ScreenHeader>
        <View style={styles.header}>
          <PiggyBank size={40} />
          <View style={{ flex: 1 }}>
            {/* 제목 줄에 공유 버튼 — 아래 월 표시 줄은 "이번 달" 버튼까지 넓게 쓰도록 */}
            <View style={styles.titleRow}>
              <Text style={styles.headerTitle} numberOfLines={1}>우리 둘 가계부</Text>
              <Pressable onPress={() => router.navigate('/settings')} style={styles.couple} accessibilityLabel="가계부 공유 설정">
                <Avatar emoji={settings.avatar} />
                <Text style={{ color: colors.heart, fontSize: 12 }}>♥</Text>
                {/* 파트너 연결은 3단계 — 지금은 초대 자리만 */}
                <View style={styles.partnerSlot}>
                  <Feather name="plus" size={14} color={colors.textTertiary} />
                </View>
              </Pressable>
            </View>
            <View style={styles.monthNav}>
              <MonthNavigator showThisMonth />
            </View>
          </View>
        </View>
      </ScreenHeader>
      <MonthPager renderPage={(year, monthIndex, isCurrent) => <HomeMonthPage year={year} monthIndex={monthIndex} isCurrent={isCurrent} />} />
    </PagedScreen>
  );
}

// 한 달 페이지: 요약 · 예산 · 최근 내역
function HomeMonthPage({ year, monthIndex, isCurrent }: { year: number; monthIndex: number; isCurrent: boolean }) {
  const styles = useThemedStyles(makeStyles);
  const { colors } = useTheme();
  const { settings } = useSettings();
  const budget = budgetFor(settings, year, monthIndex);
  const [budgetSheetVisible, setBudgetSheetVisible] = useState(false);
  const { openEdit, openActions } = useTransactionSheet();

  const { data, error, isError, isFetching, refetch } = useMonthSummary(year, monthIndex);
  useRefreshOnFocus(refetch, isCurrent);

  const now = toKst();
  const isThisMonth = now.year() === year && now.month() === monthIndex;
  const stats = data?.statistics;
  const recent = (data?.transactions ?? []).slice(-RECENT_COUNT).reverse();
  const mood = pigMood(budget.amount, stats?.totalExpense ?? 0);

  return (
    <MonthPageScroll onRefresh={refetch}>
      {isError && <ErrorState error={error} onRetry={() => refetch()} retrying={isFetching} compact={!!data} />}
            {/* 처음 불러오는 중이면 로딩, 못 불러왔으면 위 안내만 — 모르는 값을 ₩0으로 보여주지 않음 */}
      {!data && !isError && <LoadingState />}
      {data && (<>

        {/* 요약 카드 */}
        <View style={styles.summary}>
          {/* 예산 상태에 따라 부유한 돼지 / 홀쭉한 돼지 */}
          <View style={styles.summaryPig}>
            <Pig mood={mood} size={84} />
          </View>
          <Text style={styles.summaryLabel}>{isThisMonth ? '이번 달' : `${monthIndex + 1}월에`} 함께 모은 돈</Text>
          <Text style={styles.summaryAmount} numberOfLines={1} adjustsFontSizeToFit>
            {formatWon(stats?.netAmount ?? 0)}
          </Text>
          <View style={styles.tiles}>
            <View style={styles.tile}>
              <Text style={[styles.tileLabel, { color: colors.income }]}>↓ 수입</Text>
              <Text style={[styles.tileAmount, { color: colors.income }]} numberOfLines={1} adjustsFontSizeToFit>{formatWon(stats?.totalIncome ?? 0)}</Text>
            </View>
            <View style={styles.tile}>
              <Text style={[styles.tileLabel, { color: colors.expense }]}>↑ 지출</Text>
              <Text style={[styles.tileAmount, { color: colors.expense }]} numberOfLines={1} adjustsFontSizeToFit>{formatWon(stats?.totalExpense ?? 0)}</Text>
            </View>
          </View>
        </View>

        <BudgetCard
          monthLabel={`${monthIndex + 1}월`}
          budget={budget.amount}
          isOverride={budget.isOverride}
          spent={stats?.totalExpense ?? 0}
          daysLeft={isThisMonth ? daysLeftInMonth() : null}
          mood={mood}
          onPress={() => setBudgetSheetVisible(true)}
        />
        <BudgetSheet visible={budgetSheetVisible} onClose={() => setBudgetSheetVisible(false)} month={{ year, monthIndex }} />

        {/* 최근 내역 */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>최근 내역</Text>
          <Pressable onPress={() => router.navigate('/history')} hitSlop={8} style={styles.more}>
            <Text style={styles.moreText}>전체보기</Text>
            <Feather name="chevron-right" size={14} color={colors.textSecondary} />
          </Pressable>
        </View>
        <Card padded={false} style={styles.listCard}>
          {recent.length === 0 ? (
            <Text style={styles.empty}>
              {'아직 내역이 없어요.\n가운데 + 버튼으로 첫 기록을 남겨보세요.'}
            </Text>
          ) : (
            recent.map((t, i) => (
              <View key={t.id}>
                {i > 0 && <View style={styles.divider} />}
                <TransactionRow item={t} onPress={openEdit} onLongPress={openActions} showDay />
              </View>
            ))
          )}
        </Card>
      </>)}
    </MonthPageScroll>
  );
}

// 누르면 그 달 예산 수정 시트
function BudgetCard({ monthLabel, budget, isOverride, spent, daysLeft, mood, onPress }: {
  monthLabel: string;
  budget: number | null;
  isOverride: boolean;
  spent: number;
  daysLeft: number | null;
  mood: PigMood;
  onPress: () => void;
}) {
  const styles = useThemedStyles(makeStyles);
  const { colors } = useTheme();

  if (!budget) {
    return (
      <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={`${monthLabel} 예산 수정`}>
        <Card style={styles.budgetEmpty}>
          <Text style={styles.budgetEmptyText}>🎯 {monthLabel} 예산을 정해 보세요</Text>
          <Feather name="chevron-right" size={18} color={colors.textSecondary} />
        </Card>
      </Pressable>
    );
  }

  const ratio = spent / budget;
  const remaining = budget - spent;
  const over = remaining < 0;
  let pace = '';
  if (daysLeft !== null && !over) {
    pace = daysLeft > 0 ? `${daysLeft}일 남음 · 하루 ${formatWon(Math.floor(remaining / daysLeft / 100) * 100)}` : '오늘이 마지막 날';
  }

  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={`${monthLabel} 예산 수정`}>
      <Card>
        <View style={styles.budgetRow}>
          <Text style={styles.budgetLabel}>
            {monthLabel} 예산 <Text style={styles.budgetAmount}>{formatWon(budget)}</Text>
            {isOverride && <Text style={styles.overrideTag}>  이 달만</Text>}
          </Text>
          <Text style={[styles.budgetPercent, { color: ratio >= 0.7 ? colors.expense : colors.text }]}>{Math.round(ratio * 100)}% 사용</Text>
        </View>
        <View style={{ marginVertical: 10 }}>
          <ProgressBar ratio={ratio} color={over ? colors.expense : colors.primary} marker={<Pig mood={mood} size={28} />} markerSize={28} />
        </View>
        <View style={styles.budgetRow}>
          <Text style={styles.budgetSub}>
            {over ? '예산 초과 ' : '남은 예산 '}
            <Text style={[styles.budgetSubStrong, over && { color: colors.expense }]}>{formatWon(Math.abs(remaining))}</Text>
          </Text>
          {pace !== '' && <Text style={styles.budgetSub}>{pace}</Text>}
        </View>
      </Card>
    </Pressable>
  );
}

function Avatar({ emoji }: { emoji: string }) {
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.avatar}>
      <Text style={{ fontSize: 15 }}>{emoji}</Text>
    </View>
  );
}

// 예산 안이면 부유한 돼지, 넘으면 홀쭉한 돼지, 예산이 없으면 보통 돼지
function pigMood(budget: number | null, spent: number): PigMood {
  if (!budget) return 'normal';
  return spent > budget ? 'skinny' : 'rich';
}

// 오늘을 뺀 이달 남은 날 (KST)
function daysLeftInMonth() {
  const today = toKst();
  return today.daysInMonth() - today.date();
}

const makeStyles = ({ colors, radius, spacing, typography, scheme }: Theme) =>
  StyleSheet.create({
    header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
    headerTitle: { ...typography.heading, fontSize: 20, color: colors.text, flexShrink: 1 },
    monthNav: { marginTop: 2, marginLeft: -4 },
    couple: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: colors.surface,
      borderRadius: radius.pill,
      paddingHorizontal: 6,
      paddingVertical: 4,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
    },
    avatar: { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
    partnerSlot: {
      width: 28,
      height: 28,
      borderRadius: 14,
      borderWidth: 1.5,
      borderStyle: 'dashed',
      borderColor: colors.textTertiary,
      alignItems: 'center',
      justifyContent: 'center',
    },

    summary: {
      backgroundColor: colors.primaryCard,
      borderRadius: radius.xl,
      padding: spacing.xl,
      overflow: 'hidden',
    },
    summaryPig: { position: 'absolute', right: 12, top: 10 },
    summaryLabel: { ...typography.caption, fontSize: 13, color: scheme === 'dark' ? colors.textSecondary : '#5C4A1A' },
    summaryAmount: { ...typography.display, color: scheme === 'dark' ? colors.text : '#221C17', marginTop: spacing.sm, marginRight: 70 },
    tiles: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg },
    tile: { flex: 1, backgroundColor: colors.primaryCardTile, borderRadius: radius.md, padding: spacing.md, gap: 4 },
    tileLabel: { ...typography.caption, fontWeight: '600' },
    tileAmount: { ...typography.bodyBold, fontSize: 16 },

    budgetEmpty: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    budgetEmptyText: { ...typography.bodyBold, color: colors.text },
    budgetRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    budgetLabel: { ...typography.caption, fontSize: 13, color: colors.textSecondary },
    budgetAmount: { color: colors.textSecondary, fontWeight: '600' },
    budgetPercent: { ...typography.captionBold, fontSize: 13 },
    budgetSub: { ...typography.caption, color: colors.textSecondary },
    budgetSubStrong: { color: colors.text, fontWeight: '700' },
    overrideTag: { color: colors.expense, fontWeight: '700', fontSize: 11 },

    sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.sm },
    sectionTitle: { ...typography.heading, color: colors.text },
    more: { flexDirection: 'row', alignItems: 'center' },
    moreText: { ...typography.caption, color: colors.textSecondary },
    listCard: { overflow: 'hidden' },
    divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.divider, marginLeft: 68 },
    empty: { ...typography.body, color: colors.textSecondary, textAlign: 'center', padding: spacing.xl, lineHeight: 22 },
  });
