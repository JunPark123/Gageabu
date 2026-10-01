// 홈: 이번 달 요약 · 예산 · 최근 내역
import { useState } from 'react';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { router, useIsFocused } from 'expo-router';
import { AppIcon, AppIconName } from '@/src/components/AppIcon';
import { Wordmark } from '@/src/components/Brand';
import { Card } from '@/src/components/Card';
import { IconButton, PressableScale } from '@/src/components/IconButton';
import { CategoryIcon } from '@/src/components/CategoryIcon';
import { CountUpText } from '@/src/components/CountUpText';
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
import { useEntranceProgress } from '@/src/hooks/useEntranceProgress';
import { categoriesFor, findCategory } from '@/src/lib/categories';
import { PayType } from '@/src/models/Transaction';
import { Theme, useTheme, useThemedStyles } from '@/src/theme/ThemeProvider';
import { CUTE_FONT } from '@/src/theme/tokens';

const RECENT_COUNT = 5;

export default function HomeScreen() {
  const styles = useThemedStyles(makeStyles);
  const { colors } = useTheme();
  const focused = useIsFocused();
  const me = useMe();
  const members = me.household.members;
  // 나를 맨 앞에, 최대 3명까지 보이고 나머지는 +N
  const shown = [...members].sort((a, b) => Number(b.userId === me.user.id) - Number(a.userId === me.user.id)).slice(0, 3);
  const extra = members.length - shown.length;

  return (
    <PagedScreen>
      <ScreenHeader>
        <View style={styles.titleRow}>
          <View style={{ flexShrink: 1 }}>
            <Wordmark height={44} />
            {/* 가계부 이름 배지 — 누르면 이름 바꾸기 */}
            <PressableScale onPress={() => router.push('/household-name')} accessibilityRole="button" accessibilityLabel={`${me.household.name}, 가계부 이름`} style={styles.householdBadge}>
              <Text style={styles.householdHeart}>♥</Text>
              {/* 등록한 이름 그대로 (배지 모양이 '가계부'라는 표시 역할 — "○○의 가계부"처럼 덧붙이지 않음) */}
              <Text style={styles.householdName} numberOfLines={1}>{me.household.name}</Text>
            </PressableScale>
          </View>
          <View style={styles.headerActions}>
            {/* 멤버 묶음 = 멤버 관리 버튼 (혼자면 초대하기) */}
            <PressableScale
              onPress={() => router.push(members.length === 1 ? '/invite' : '/members')}
              style={styles.couple}
              accessibilityRole="button"
              accessibilityLabel={members.length === 1 ? '함께 쓸 사람 초대하기' : `멤버 관리 (${members.length}명)`}
            >
              {members.length === 2 ? (
                <>
                  <Avatar emoji={shown[0].avatar} />
                  <Text style={{ color: colors.heart, fontSize: 13 }}>♥</Text>
                  <Avatar emoji={shown[1].avatar} />
                </>
              ) : (
                <View style={{ flexDirection: 'row' }}>
                  {shown.map((m, i) => (
                    <View key={m.userId} style={{ marginLeft: i === 0 ? 0 : -10 }}>
                      <Avatar emoji={m.avatar} />
                    </View>
                  ))}
                </View>
              )}
              {extra > 0 && <Text style={styles.extra}>+{extra}</Text>}
              {members.length === 1 && (
                <View style={styles.partnerSlot}>
                  <Feather name="plus" size={16} color={colors.textSecondary} />
                </View>
              )}
            </PressableScale>
            <IconButton icon="settings" label="설정" onPress={() => router.navigate('/settings')} size={44} iconSize={20} />
          </View>
        </View>
      </ScreenHeader>
      <MonthPager renderPage={(year, monthIndex, isCurrent) => <HomeMonthPage year={year} monthIndex={monthIndex} isCurrent={isCurrent} animate={focused && isCurrent} />} />
    </PagedScreen>
  );
}

// 한 달 페이지: 요약 · 예산 · 최근 내역
function HomeMonthPage({ year, monthIndex, isCurrent, animate }: { year: number; monthIndex: number; isCurrent: boolean; animate: boolean }) {
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
  const expense = stats?.totalExpense ?? 0;
  const income = stats?.totalIncome ?? 0;
  const budgetAmount = budget.amount ?? 0;
  const budgetPercent = budgetAmount > 0 ? Math.round((expense / budgetAmount) * 100) : null;
  const pig = pigStatus(budget.amount, stats?.totalExpense ?? 0); // 예산이 없으면 null (상태 미정)
  const pigSize = useWindowDimensions().width < 360 ? 112 : 136;
  const categoryTotals = categoriesFor(PayType.Expense).map((category) => ({
    category,
    amount: (data?.transactions ?? []).reduce((sum, t) =>
      t.paytype === PayType.Expense && findCategory(t.category, PayType.Expense).name === category.name ? sum + t.cost : sum, 0),
  })).filter((entry) => entry.amount > 0).sort((a, b) => b.amount - a.amount).slice(0, 4);

  return (
    <MonthPageScroll onRefresh={refetch}>
      {isError && <ErrorState error={error} onRetry={() => refetch()} retrying={isFetching} compact={!!data} />}
            {/* 처음 불러오는 중이면 로딩, 못 불러왔으면 위 안내만 — 모르는 값을 ₩0으로 보여주지 않음 */}
      {!data && !isError && <LoadingState />}
      {data && (<>

        <View style={styles.monthNav}><MonthNavigator showThisMonth /></View>

        {/* 이달 지출과 예산 */}
        <View style={styles.summary}>
          <View style={styles.summaryTop}>
            <View style={styles.summaryPig} pointerEvents="none">
              <PigMain state={pig?.main ?? 'normal'} size={pigSize} />
            </View>
            <Text style={[styles.summaryLabel, { marginRight: pigSize * 0.6 }]}>{year}년 {monthIndex + 1}월 지출</Text>
            <CountUpText value={expense} active={animate} format={formatWon} style={[styles.summaryAmount, { marginRight: pigSize * 0.55 }]} numberOfLines={1} adjustsFontSizeToFit />
            <Text style={styles.summaryBudget}>예산 {budgetAmount > 0 ? formatWon(budgetAmount) : '설정 전'}</Text>
            {budgetPercent !== null && (
              <View style={styles.trackRow}>
                <SummaryTrack percent={budgetPercent} active={animate} />
                <CountUpText value={budgetPercent} active={animate} format={(v) => `${v}%`} style={styles.summaryPercent} />
              </View>
            )}
          </View>
          <View style={styles.statusChip}>
            <View style={styles.statusHeart}><Feather name="heart" size={12} color={colors.heart} /></View>
            <Text style={styles.statusText} numberOfLines={2}>{pig ? STATUS_TEXT[pig.status] : '이번 달도 잘 관리하고 있어요!'} 💕</Text>
          </View>
        </View>

        {/* 2×2 요약: 지출 · 수입 · 남은 돈(수입 − 지출) · 남은 예산 */}
        <View style={styles.tiles}>
          <SummaryTile icon="expense" label="지출" value={expense} animate={animate} tint={colors.expenseSoft}
            sub={budgetPercent !== null ? `예산의 ${budgetPercent}%` : '이번 달 쓴 돈'} subColor={budgetPercent !== null && budgetPercent >= 100 ? colors.expense : undefined} />
          <SummaryTile icon="income" label="수입" value={income} animate={animate} tint={colors.incomeSoft} sub="이번 달 들어온 돈" />
          <SummaryTile icon="coin" label="남은 돈" value={income - expense} animate={animate} tint={colors.savingSoft}
            sub="수입 − 지출" subColor={income - expense < 0 ? colors.expense : undefined} />
          <SummaryTile icon="goal" label="남은 예산" value={budgetAmount > 0 ? budgetAmount - expense : null} animate={animate} tint={colors.infoSoft}
            sub={budgetAmount <= 0 ? '눌러서 예산 정하기' : budgetAmount - expense < 0 ? '예산을 넘었어요' : `예산 ${formatWon(budgetAmount)}`}
            subColor={budgetAmount > 0 && budgetAmount - expense < 0 ? colors.expense : undefined}
            onPress={() => setBudgetSheetVisible(true)} />
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

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>카테고리별 지출 미리보기</Text>
          <Pressable onPress={() => router.navigate('/stats')} hitSlop={8} style={styles.more}><Text style={styles.moreText}>더보기</Text><Feather name="chevron-right" size={14} color={colors.textSecondary} /></Pressable>
        </View>
        <Card style={styles.categoryCard}>
          {categoryTotals.length === 0 ? <Text style={styles.categoryEmpty}>아직 지출 내역이 없어요</Text> : categoryTotals.map(({ category, amount }) => (
            <View key={category.name} style={styles.categoryRow}>
              <CategoryIcon category={category} size={30} />
              <Text style={styles.categoryName}>{category.name}</Text>
              <Text style={styles.categoryValue}>{formatWon(amount)}</Text>
              <View style={styles.categoryBar}><View style={[styles.categoryFill, { width: `${Math.min(100, amount / Math.max(expense, 1) * 100)}%`, backgroundColor: category.color }]} /></View>
            </View>
          ))}
        </Card>

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

function SummaryTile({ icon, label, value, sub, subColor, tint, animate, onPress }: {
  icon: AppIconName;
  label: string;
  value: number | null;   // null이면 '-' (예산 없음 등)
  sub: string;
  subColor?: string;
  tint: string;
  animate: boolean;
  onPress?: () => void;
}) {
  const styles = useThemedStyles(makeStyles);
  return (
    <Pressable onPress={onPress} disabled={!onPress} accessibilityRole={onPress ? 'button' : undefined}
      style={({ pressed }) => [styles.tile, { backgroundColor: tint }, pressed && { opacity: 0.75 }]}>
      <AppIcon name={icon} size={38} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={styles.tileLabel}>{label}</Text>
        {value === null
          ? <Text style={styles.tileAmount}>-</Text>
          : <CountUpText value={value} active={animate} format={formatWon} style={styles.tileAmount} numberOfLines={1} adjustsFontSizeToFit />}
        <Text style={[styles.tileSub, subColor ? { color: subColor } : null]} numberOfLines={1}>{sub}</Text>
      </View>
    </Pressable>
  );
}

function SummaryTrack({ percent, active }: { percent: number; active: boolean }) {
  const styles = useThemedStyles(makeStyles);
  const progress = useEntranceProgress(active, percent);
  return (
    <View style={styles.summaryTrack} accessible accessibilityRole="progressbar" accessibilityLabel="이번 달 예산 사용률" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.min(percent, 100)} aria-valuetext={`${percent}% 사용`}>
      <View style={[styles.summaryFill, { width: `${Math.min(percent, 100) * progress}%` }]} />
    </View>
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
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}><AppIcon name="budget" size={28} /><Text style={styles.budgetEmptyText}>{monthLabel} 예산을 정해 보세요</Text></View>
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
      <ProfileAvatar value={emoji} size={30} emojiSize={19} />
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
    titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
    headerActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    householdBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'flex-start',
      gap: 5,
      marginTop: 2,
      marginLeft: 4,
      paddingLeft: 9,
      paddingRight: 12,
      paddingVertical: 4,
      borderRadius: radius.pill,
      backgroundColor: colors.primarySoft,
      borderWidth: StyleSheet.hairlineWidth * 2,
      borderColor: scheme === 'dark' ? colors.primarySoft : '#FFD0DC',
    },
    householdHeart: { fontSize: 11, color: colors.heart },
    householdName: { fontFamily: CUTE_FONT, fontSize: 14, color: scheme === 'dark' ? colors.text : '#D9436A', flexShrink: 1 },
    monthNav: { alignItems: 'center', marginTop: 2 },
    // 멤버 묶음: 설정 버튼과 같은 높이·카드색 (다크 모드에서도 테두리만 살짝)
    couple: {
      height: 44,
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderRadius: radius.pill,
      paddingHorizontal: 5,
      gap: 4,
      borderWidth: StyleSheet.hairlineWidth * 2,
      borderColor: colors.border,
    },
    avatar: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: colors.surface },
    extra: { ...typography.captionBold, fontSize: 13, color: colors.textSecondary, marginHorizontal: 3 },
    partnerSlot: {
      width: 32,
      height: 32,
      borderRadius: 16,
      borderWidth: 1.5,
      borderStyle: 'dashed',
      borderColor: colors.textTertiary,
      alignItems: 'center',
      justifyContent: 'center',
    },

    summary: {
      backgroundColor: colors.surface,
      borderRadius: radius.xl,
      padding: spacing.lg,
      overflow: 'hidden',
      shadowColor: colors.shadow,
      shadowOpacity: scheme === 'dark' ? 0 : 0.09,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: 5 },
      elevation: 2,
    },
    // 윗부분(라벨·금액·상태 문구) 높이에 맞춰 세로 가운데. PNG 둘레에 투명 여백이 있어 오른쪽은 카드 안쪽 여백보다 바깥에 둠
    summaryTop: { zIndex: 1, minHeight: 120 },
    summaryPig: { position: 'absolute', top: -14, right: -10, justifyContent: 'center' },
    summaryLabel: { ...typography.captionBold, fontSize: 13, color: colors.text },
    // 귀여운 글꼴(주아체): 굵기가 하나뿐이라 fontWeight는 normal
    summaryAmount: { fontFamily: CUTE_FONT, fontWeight: 'normal', fontSize: 35, color: colors.text, marginTop: 4 },
    summaryBudget: { ...typography.caption, color: colors.textSecondary, marginTop: 1 },
    trackRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: 14 },
    summaryTrack: { flex: 1, height: 10, borderRadius: 6, backgroundColor: colors.primarySoft, overflow: 'hidden' },
    summaryFill: { height: '100%', borderRadius: 6, backgroundColor: colors.primary },
    summaryPercent: { fontFamily: CUTE_FONT, fontSize: 16, color: colors.expense, minWidth: 42, textAlign: 'right' },
    statusChip: { marginTop: 12, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: spacing.md, paddingVertical: 10, borderRadius: radius.lg, backgroundColor: colors.primaryCardTile },
    statusHeart: { width: 24, height: 24, borderRadius: 12, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
    statusText: { ...typography.caption, color: colors.text, flex: 1, lineHeight: 17 },
    tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
    // 두 칸씩: (전체 − 간격) / 2
    tile: { flexBasis: '47%', flexGrow: 1, flexDirection: 'row', alignItems: 'center', borderRadius: radius.lg, paddingVertical: spacing.md, paddingHorizontal: 10, gap: 8, minWidth: 0 },
    tileLabel: { ...typography.captionBold, color: colors.text },
    tileAmount: { fontFamily: CUTE_FONT, color: colors.text, fontSize: 17, marginTop: 1 },
    tileSub: { ...typography.caption, fontSize: 10, color: colors.textSecondary, marginTop: 1 },

    budgetEmpty: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    budgetEmptyText: { ...typography.bodyBold, color: colors.text },
    budgetRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    budgetLabel: { ...typography.captionBold, fontSize: 13, color: colors.text },
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
    sectionTitle: { ...typography.heading, fontSize: 16, color: colors.text },
    more: { flexDirection: 'row', alignItems: 'center' },
    moreText: { ...typography.caption, color: colors.textSecondary },
    listCard: { overflow: 'hidden' },
    categoryCard: { gap: 10 },
    categoryRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    categoryName: { ...typography.caption, color: colors.text, width: 44 },
    categoryValue: { ...typography.caption, color: colors.textSecondary, width: 92, textAlign: 'right', fontVariant: ['tabular-nums'] },
    categoryBar: { flex: 1, height: 8, borderRadius: 8, backgroundColor: colors.surfaceMuted, overflow: 'hidden' },
    categoryFill: { height: '100%', borderRadius: 8 },
    categoryEmpty: { ...typography.caption, color: colors.textSecondary },
    divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.divider, marginLeft: 68 },
    empty: { ...typography.body, color: colors.textSecondary, textAlign: 'center', padding: spacing.xl, lineHeight: 22 },
  });
