import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { BottomSheet } from '../../components/BottomSheet';
import { Button } from '../../components/Button';
import { formatWon, koreanWon } from '../../lib/format';
import { budgetFor, monthKey, useSettings } from '../../store/settings';
import { Theme, useTheme, useThemedStyles } from '../../theme/ThemeProvider';
import { noWebOutline } from '../../theme/web';

interface BudgetSheetProps {
  visible: boolean;
  onClose: () => void;
  // 주면 그 달 예산 수정 (홈 예산 카드), 없으면 기본 예산 수정 (설정)
  month?: { year: number; monthIndex: number };
}

export function BudgetSheet({ visible, onClose, month }: BudgetSheetProps) {
  const styles = useThemedStyles(makeStyles);
  const { colors } = useTheme();
  const { settings, updateSettings } = useSettings();
  const [text, setText] = useState('');

  const current = month ? budgetFor(settings, month.year, month.monthIndex) : { amount: settings.monthlyBudget, isOverride: false };
  const monthLabel = month ? `${month.monthIndex + 1}월` : '';

  useEffect(() => {
    if (visible) setText(current.amount ? String(current.amount) : '');
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 열릴 때만 채움
  }, [visible]);

  const amount = Number(text.replace(/[^0-9]/g, '')) || 0;

  const withoutThisMonth = () => {
    if (!month) return settings.budgetOverrides;
    const { [monthKey(month.year, month.monthIndex)]: _, ...rest } = settings.budgetOverrides;
    return rest;
  };

  // 이 달만 따로
  const saveThisMonth = () => {
    if (!month) return;
    updateSettings({ budgetOverrides: { ...settings.budgetOverrides, [monthKey(month.year, month.monthIndex)]: amount } });
    onClose();
  };
  // 매달 적용 (= 기본 예산). 이 달에 따로 정한 게 있으면 없애서 기본을 따르게
  const saveDefault = () => {
    updateSettings({ monthlyBudget: amount, budgetOverrides: withoutThisMonth() });
    onClose();
  };
  const followDefault = () => {
    updateSettings({ budgetOverrides: withoutThisMonth() });
    onClose();
  };

  let hint = '한 달에 쓸 돈을 정해 두면 홈에서 남은 예산을 보여줘요';
  if (month && current.isOverride) hint = `${monthLabel}만 따로 정한 예산이에요`;
  else if (month && settings.monthlyBudget) hint = `매달 기본 예산(${formatWon(settings.monthlyBudget)})을 따르고 있어요`;
  else if (!month) hint = '매달 적용돼요. 달마다 다르게 하려면 홈의 예산 카드를 눌러 주세요';

  return (
    <BottomSheet visible={visible} onClose={onClose} title={month ? `${monthLabel} 예산` : '기본 월 예산'}>
      <TextInput
        value={amount ? formatWon(amount) : ''}
        onChangeText={(t) => setText(t.replace(/[^0-9]/g, '').slice(0, 9))}
        keyboardType="number-pad"
        placeholder="₩3,000,000"
        placeholderTextColor={colors.textTertiary}
        style={[styles.input, noWebOutline]}
        autoFocus
      />
      <Text style={styles.reading}>{amount ? koreanWon(amount) : ' '}</Text>
      <Text style={styles.hint}>{hint}</Text>

      {month ? (
        <View style={{ gap: 10 }}>
          <View style={styles.actions}>
            <Button label={`${monthLabel}만`} variant="secondary" onPress={saveThisMonth} disabled={!amount} style={{ flex: 1 }} />
            <Button label="매달 적용" onPress={saveDefault} disabled={!amount} style={{ flex: 1 }} />
          </View>
          {current.isOverride && (
            <Pressable onPress={followDefault} style={styles.link} accessibilityRole="button">
              <Text style={styles.linkText}>
                {monthLabel}도 기본 예산 따르기 ({settings.monthlyBudget ? formatWon(settings.monthlyBudget) : '없음'})
              </Text>
            </Pressable>
          )}
        </View>
      ) : (
        <View style={styles.actions}>
          {settings.monthlyBudget !== null && (
            <Button label="예산 끄기" variant="secondary" onPress={() => { updateSettings({ monthlyBudget: null }); onClose(); }} style={{ flex: 1 }} />
          )}
          <Button label="저장" onPress={saveDefault} disabled={!amount} style={{ flex: 2 }} />
        </View>
      )}
    </BottomSheet>
  );
}

const makeStyles = ({ colors, spacing, typography }: Theme) =>
  StyleSheet.create({
    input: { ...typography.display, color: colors.text, textAlign: 'center', marginTop: spacing.md },
    reading: { ...typography.caption, color: colors.textSecondary, textAlign: 'center', marginTop: spacing.xs },
    hint: { ...typography.body, fontSize: 14, color: colors.textSecondary, textAlign: 'center', marginVertical: spacing.lg },
    actions: { flexDirection: 'row', gap: spacing.sm },
    link: { alignItems: 'center', paddingVertical: spacing.sm },
    linkText: { ...typography.body, fontSize: 14, color: colors.textSecondary, textDecorationLine: 'underline' },
  });
