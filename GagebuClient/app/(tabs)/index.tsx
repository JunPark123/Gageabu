// 홈: 이번 달 요약 · 예산 · 최근 내역
import { useState } from 'react';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Card } from '@/src/components/Card';
import { ErrorState } from '@/src/components/ErrorState';
import { LoadingState } from '@/src/components/LoadingState';
import { MonthNavigator } from '@/src/components/MonthNavigator';
import { MonthPager } from '@/src/components/MonthPager';
import { PigFace, pigFaceLabel, PigMain } from '@/src/components/Pig';
import { ProfileAvatar } from '@/src/components/ProfileAvatar';
import { ProgressBar } from '@/src/components/ProgressBar';
import { MonthPageScroll, PagedScreen, ScreenHeader } from '@/src/components/Screen';
import { TransactionRow } from '@/src/components/TransactionRow';
import { BudgetSheet } from '@/src/features/budget/BudgetSheet';
import { useTransactionSheet } from '@/src/features/transactions/TransactionSheetProvider';
import { useMonthSummary, useRefreshOnFocus } from '@/src/hooks/useTransactions';
import { toKst } from '@/src/lib/date';
import { formatWon, formatWonText } from '@/src/lib/format';
import { displayPercent, PigBudgetState, PigStatus, pigStatus } from '@/src/lib/pigState';
import { useMe } from '@/src/auth/AuthProvider';
import { useMonthBudget } from '@/src/hooks/useBudget';
import { Theme, useTheme, useThemedStyles } from '@/src/theme/ThemeProvider';
import { CUTE_FONT } from '@/src/theme/tokens';

const RECENT_COUNT = 5;

export default function HomeScreen() {
  const styles = useThemedStyles(makeStyles);
  const { colors } = useTheme();
  const me = useMe();
  const members = me.household.members;
  // 나를 맨 앞에, 최대 3명까지 보이고 나머지는 +N
  const shown = [...members].sort((a, b) => Number(b.userId === me.user.id) - Number(a.userId === me.user.id)).slice(0, 3);
  const extra = members.length - shown.length;

  return (
    <PagedScreen>
      <ScreenHeader>
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            {/* 제목 줄에 공유 버튼 — 아래 월 표시 줄은 "이번 달" 버튼까지 넓게 쓰도록 */}
            <View style={styles.titleRow}>
              <Text style={styles.headerTitle} numberOfLines={1}>{me.household.name}</Text>
              <Pressable onPress={() => router.push('/household')} style={styles.couple} accessibilityLabel={`가계부 공유 (멤버 ${members.length}명)`}>
                {members.length === 2 ? (
                  <>
                    <Avatar emoji={shown[0].avatar} />
                    <Text style={{ color: colors.heart, fontSize: 12 }}>♥</Text>
                    <Avatar emoji={shown[1].avatar} />
                  </>
                ) : (
                  <View style={{ flexDirection: 'row' }}>
                    {shown.map((m, i) => (
                      <View key={m.userId} style={{ marginLeft: i === 0 ? 0 : -8 }}>
                        <Avatar emoji={m.avatar} />
                      </View>
                    ))}
                  </View>
                )}
                {extra > 0 && <Text style={styles.extra}>+{extra}</Text>}
                {/* 혼자면 초대 자리 */}
                {members.length === 1 && (
                  <View style={styles.partnerSlot}>
                    <Feather name="plus" size={14} color={colors.textTertiary} />
                  </View>
                )}
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
  const budget = useMonthBudget(year, monthIndex);
  const [budgetSheetVisible, setBudgetSheetVisible] = useState(false);
  const { openEdit, openActions } = useTransactionSheet();

  const { data, error, isError, isFetching, refetch } = useMonthSummary(year, monthIndex);
  useRefreshOnFocus(refetch, isCurrent);

  const now = toKst();
  const isThisMonth = now.year() === year && now.month() === monthIndex;
  const stats = data?.statistics;
  const recent = (data?.transactions ?? []).slice(-RECENT_COUNT).reverse();
  const net = stats?.netAmount ?? 0;
  const pig = pigStatus(budget.amount, stats?.totalExpense ?? 0); // 예산이 없으면 null (상태 미정)
  // 메인 돼지 80~96px: 좁은 화면이면 조금 작게. 금액은 돼지 자리만큼 비켜 둠
  const pigSize = useWindowDimensions().width < 360 ? 80 : 96;

  return (
    <MonthPageScroll onRefresh={refetch}>
      {isError && <ErrorState error={error} onRetry={() => refetch()} retrying={isFetching} compact={!!data} />}
            {/* 처음 불러오는 중이면 로딩, 못 불러왔으면 위 안내만 — 모르는 값을 ₩0으로 보여주지 않음 */}
      {!data && !isError && <LoadingState />}
      {data && (<>

        {/* 요약 카드 */}
        <View style={styles.summary}>
          <View style={styles.summaryTop}>
            {/* 돼지 — 예산 상태에 따라 부유 / 보통 / 배고픔. 예산이 없으면 보통 돼지만 (상태 문구 없음)
                금액·상태 문구 영역의 세로 가운데 */}
            <View style={styles.summaryPig} pointerEvents="none">
              <PigMain state={pig?.main ?? 'normal'} size={pigSize} />
            </View>
            <Text style={[styles.summaryLabel, { marginRight: pigSize * 0.8 }]}>{isThisMonth ? '이번 달' : `${monthIndex + 1}월에`} 함께 모은 돈</Text>
            {/* 남으면 파란 +, 모자라면 빨간 - */}
            <Text style={[styles.summaryAmount, { marginRight: pigSize * 0.8, color: net > 0 ? colors.income : net < 0 ? colors.expense : styles.summaryAmount.color }]} numberOfLines={1} adjustsFontSizeToFit>
              {formatWon(net, { sign: true })}
            </Text>
            {pig && (
              <View style={styles.statusChip}>
                <Text style={styles.statusText}>{STATUS_TEXT[pig.status]}</Text>
              </View>
            )}
          </View>
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

        {budget.loaded && <BudgetCard
          monthLabel={`${monthIndex + 1}월`}
          budget={budget.amount}
          isOverride={budget.isOverride}
          spent={stats?.totalExpense ?? 0}
          daysLeft={isThisMonth ? daysLeftInMonth() : null}
          pig={pig}
          onPress={() => setBudgetSheetVisible(true)}
        />}
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
function BudgetCard({ monthLabel, budget, isOverride, spent, daysLeft, pig, onPress }: {
  monthLabel: string;
  budget: number | null;
  isOverride: boolean;
  spent: number;
  daysLeft: number | null;
  pig: PigStatus | null;
  onPress: () => void;
}) {
  const styles = useThemedStyles(makeStyles);
  const { colors } = useTheme();

  if (!budget || !pig) {
    return (
      <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={`${monthLabel} 예산 수정`}>
        <Card style={styles.budgetEmpty}>
          <Text style={styles.budgetEmptyText}>🎯 {monthLabel} 예산을 정해 보세요</Text>
          <Feather name="chevron-right" size={18} color={colors.textSecondary} />
        </Card>
      </Pressable>
    );
  }

  const remaining = budget - spent;
  const over = remaining < 0;
  // 이번 달이고 아직 예산 안이면: 남은 날짜와 하루에 써도 되는 금액 (100원 단위 내림)
  const showPace = daysLeft !== null && !over;
  const perDay = daysLeft ? Math.floor(remaining / daysLeft / 100) * 100 : 0;
  // 숫자는 실제 비율(120%도 그대로), 바와 얼굴은 끝에 고정
  const percentText = `${displayPercent(pig.percent)}% 사용`;
  const valueText = `${percentText}, ${pigFaceLabel(pig.face)}`;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${monthLabel} 예산 ${formatWonText(budget)}, ${valueText}`}
      accessibilityHint="눌러서 예산 수정"
    >
      <Card>
        <View style={styles.budgetRow}>
          <Text style={styles.budgetLabel}>
            {monthLabel} 예산 <Text style={styles.budgetAmount}>{formatWon(budget)}</Text>
            {isOverride && <Text style={styles.overrideTag}>  이 달만</Text>}
          </Text>
          <Text style={[styles.budgetPercent, { color: pig.face !== 'happy' ? colors.expense : colors.text }]}>{percentText}</Text>
        </View>
        <View style={{ marginVertical: 10 }}>
          <ProgressBar
            position={pig.position}
            color={over ? colors.expense : colors.primary}
            marker={<PigFace state={pig.face} size={28} />}
            markerSize={28}
            label={`${monthLabel} 예산`}
            valueText={valueText}
          />
        </View>
        <View style={styles.budgetRow}>
          <Text style={styles.budgetSub}>
            {over ? '예산 초과 ' : '남은 예산 '}
            <Text style={[styles.budgetSubStrong, over && { color: colors.expense }]}>{formatWon(Math.abs(remaining))}</Text>
          </Text>
        </View>
        {showPace && (
          <View style={styles.paceRow}>
            {daysLeft! > 0 ? (
              <>
                <View style={styles.paceBox}>
                  <Text style={styles.paceLabel}>남은 날짜 :</Text>
                  <Text style={styles.paceValue}>{daysLeft}일</Text>
                </View>
                <View style={styles.paceBox}>
                  <Text style={styles.paceLabel}>일 권장 금액 :</Text>
                  <Text style={styles.paceValue}>{formatWonText(perDay)}</Text>
                </View>
              </>
            ) : (
              <View style={styles.paceBox}>
                <Text style={styles.paceValue}>오늘이 이달 마지막 날이에요</Text>
              </View>
            )}
          </View>
        )}
      </Card>
    </Pressable>
  );
}

function Avatar({ emoji }: { emoji: string }) {
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.avatar}>
      <ProfileAvatar value={emoji} size={24} emojiSize={15} />
    </View>
  );
}

// 그림은 90% 초과부터 배고픈 돼지, 문구는 100% 이상부터 예산 초과
const STATUS_TEXT: Record<PigBudgetState, string> = {
  wealthy: '부자 돼지예요! 아직 넉넉해요',
  normal: '보통 돼지예요. 딱 계획대로예요',
  hungry: '배고픈 돼지예요. 예산 초과에 주의해주세요!',
  overBudget: '배고픈 돼지예요. 예산을 초과했어요',
};

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
    avatar: { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: colors.surface },
    extra: { ...typography.captionBold, color: colors.textSecondary, marginLeft: 2 },
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
    // 윗부분(라벨·금액·상태 문구) 높이에 맞춰 세로 가운데. PNG 둘레에 투명 여백이 있어 오른쪽은 카드 안쪽 여백보다 바깥에 둠
    summaryTop: { zIndex: 1 }, // 돼지가 아래 타일 위로 살짝 걸쳐도 가려지지 않게
    summaryPig: { position: 'absolute', top: 0, bottom: 0, right: -12, justifyContent: 'center' },
    summaryLabel: { ...typography.caption, fontSize: 13, color: scheme === 'dark' ? colors.textSecondary : '#5C4A1A' },
    // 귀여운 글꼴(주아체): 굵기가 하나뿐이라 fontWeight는 normal
    summaryAmount: { fontFamily: CUTE_FONT, fontWeight: 'normal', fontSize: 38, color: scheme === 'dark' ? colors.text : '#221C17', marginTop: spacing.sm },
    statusChip: { alignSelf: 'flex-start', marginTop: spacing.sm, paddingHorizontal: spacing.md, paddingVertical: 5, borderRadius: radius.pill, backgroundColor: scheme === 'dark' ? colors.primaryCardTile : 'rgba(255,255,255,0.7)' },
    statusText: { ...typography.captionBold, color: scheme === 'dark' ? colors.text : '#5C4A1A' },
    tiles: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg },
    tile: { flex: 1, backgroundColor: colors.primaryCardTile, borderRadius: radius.md, padding: spacing.md, gap: 4 },
    tileLabel: { ...typography.caption, fontWeight: '600' },
    tileAmount: { fontFamily: CUTE_FONT, fontSize: 19 },

    budgetEmpty: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    budgetEmptyText: { ...typography.bodyBold, color: colors.text },
    budgetRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    budgetLabel: { ...typography.caption, fontSize: 13, color: colors.textSecondary },
    budgetAmount: { color: colors.textSecondary, fontWeight: '600' },
    budgetPercent: { ...typography.captionBold, fontSize: 13 },
    budgetSub: { ...typography.caption, color: colors.textSecondary },
    budgetSubStrong: { color: colors.text, fontWeight: '700' },
    paceRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.md },
    paceBox: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: spacing.md, paddingVertical: 6, borderRadius: radius.md, backgroundColor: colors.primarySoft },
    paceLabel: { ...typography.caption, color: colors.textSecondary },
    paceValue: { fontFamily: CUTE_FONT, fontSize: 15, color: colors.text },
    overrideTag: { color: colors.expense, fontWeight: '700', fontSize: 11 },

    sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.sm },
    sectionTitle: { ...typography.heading, color: colors.text },
    more: { flexDirection: 'row', alignItems: 'center' },
    moreText: { ...typography.caption, color: colors.textSecondary },
    listCard: { overflow: 'hidden' },
    divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.divider, marginLeft: 68 },
    empty: { ...typography.body, color: colors.textSecondary, textAlign: 'center', padding: spacing.xl, lineHeight: 22 },
  });
