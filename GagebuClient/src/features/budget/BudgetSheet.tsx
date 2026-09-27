import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { BottomSheet } from '../../components/BottomSheet';
import { Button } from '../../components/Button';
import { applyKey, Keypad } from '../../components/Keypad';
import { useBudget, useUpdateBudget } from '../../hooks/useBudget';
import { describeError } from '../../lib/apiError';
import { budgetFor, EMPTY_BUDGET, monthKey } from '../../lib/budget';
import { notify } from '../../lib/confirm';
import { formatWon, koreanWon } from '../../lib/format';
import { Theme, useTheme, useThemedStyles } from '../../theme/ThemeProvider';

interface BudgetSheetProps {
  visible: boolean;
  onClose: () => void;
  // 주면 그 달 예산 수정 (홈 예산 카드), 없으면 기본 예산 수정 (설정)
  month?: { year: number; monthIndex: number };
}

// 예산은 가계부 것이라 서버에 저장한다 (함께 쓰는 사람도 같은 예산을 본다)
export function BudgetSheet({ visible, onClose, month }: BudgetSheetProps) {
  const styles = useThemedStyles(makeStyles);
  const { colors } = useTheme();
  const config = useBudget().data ?? EMPTY_BUDGET;
  const update = useUpdateBudget();
  // 금액은 앱 안 숫자 키패드로 입력 (시스템 키보드는 시트·버튼을 가리고, 내려갈 때 버튼이 안 눌리는 문제가 있었음)
  const [digits, setDigits] = useState('');

  const current = month ? budgetFor(config, month.year, month.monthIndex) : { amount: config.monthlyBudget, isOverride: false };
  const monthLabel = month ? `${month.monthIndex + 1}월` : '';
  const thisMonth = month ? monthKey(month.year, month.monthIndex) : undefined;

  useEffect(() => {
    if (visible) setDigits(current.amount ? String(current.amount) : '');
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 열릴 때만 채움
  }, [visible]);

  const amount = Number(digits || '0');

  // 화면에는 바로 반영하고 시트를 닫는다. 서버 저장이 실패하면 되돌리고 알린다
  const save = (change: Parameters<typeof update.mutate>[0]) => {
    update.mutate(change, {
      onError: (e) => {
        const info = describeError(e);
        notify('예산을 저장하지 못했어요', info.message);
      },
    });
    onClose();
  };

  // 이 달만 따로
  const saveThisMonth = () => thisMonth && save({ kind: 'month', month: thisMonth, amount });
  // 매달 적용 (= 기본 예산). 이 달에 따로 정한 게 있으면 없애서 기본을 따르게
  const saveDefault = () => save({ kind: 'default', amount, clearMonth: current.isOverride ? thisMonth : undefined });
  const followDefault = () => thisMonth && save({ kind: 'clearMonth', month: thisMonth });

  let hint = '한 달에 쓸 돈을 정해 두면 홈에서 남은 예산을 보여줘요';
  if (month && current.isOverride) hint = `${monthLabel}만 따로 정한 예산이에요`;
  else if (month && config.monthlyBudget) hint = `매달 기본 예산(${formatWon(config.monthlyBudget)})을 따르고 있어요`;
  else if (!month) hint = '매달 적용돼요. 달마다 다르게 하려면 홈 예산 카드를 눌러요';

  return (
    <BottomSheet visible={visible} onClose={onClose} title={month ? `${monthLabel} 예산` : '기본 월 예산'}>
      <Text style={[styles.amount, { color: amount ? colors.text : colors.textTertiary }]} numberOfLines={1} adjustsFontSizeToFit>
        {formatWon(amount)}
        <Text style={{ color: colors.primary, fontWeight: '300' }}>|</Text>
      </Text>
      <Text style={styles.reading}>{amount ? koreanWon(amount) : ' '}</Text>
      <Text style={styles.hint}>{hint}</Text>
      <Keypad onPress={(k) => setDigits((d) => applyKey(d, k))} />

      {month ? (
        <View style={{ gap: 10 }}>
          <View style={styles.actions}>
            <Button label={`${monthLabel}만`} variant="secondary" onPress={saveThisMonth} disabled={!amount} style={{ flex: 1 }} />
            <Button label="매달 적용" onPress={saveDefault} disabled={!amount} style={{ flex: 1 }} />
          </View>
          {current.isOverride && (
            <Pressable onPress={followDefault} style={styles.link} accessibilityRole="button">
              <Text style={styles.linkText}>
                {monthLabel}도 기본 예산 따르기 ({config.monthlyBudget ? formatWon(config.monthlyBudget) : '없음'})
              </Text>
            </Pressable>
          )}
        </View>
      ) : (
        <View style={styles.actions}>
          {config.monthlyBudget !== null && (
            <Button label="예산 끄기" variant="secondary" onPress={() => save({ kind: 'default', amount: null })} style={{ flex: 1 }} />
          )}
          <Button label="저장" onPress={saveDefault} disabled={!amount} style={{ flex: 2 }} />
        </View>
      )}
    </BottomSheet>
  );
}

const makeStyles = ({ colors, spacing, typography }: Theme) =>
  StyleSheet.create({
    amount: { ...typography.display, textAlign: 'center', marginTop: spacing.md },
    reading: { ...typography.caption, color: colors.textSecondary, textAlign: 'center', marginTop: spacing.xs },
    hint: { ...typography.body, fontSize: 14, color: colors.textSecondary, textAlign: 'center', marginTop: spacing.md },
    actions: { flexDirection: 'row', gap: spacing.sm },
    link: { alignItems: 'center', paddingVertical: spacing.sm },
    linkText: { ...typography.body, fontSize: 14, color: colors.textSecondary, textDecorationLine: 'underline' },
  });
