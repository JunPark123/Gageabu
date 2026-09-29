// 초대하기 — 방장이 초대 코드를 만들어 보낸다
import { StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useMe } from '@/src/auth/AuthProvider';
import { Card } from '@/src/components/Card';
import { Screen } from '@/src/components/Screen';
import { InviteSection, useRefreshMeOnFocus } from '@/src/features/household/HouseholdParts';
import { HouseholdRole } from '@/src/models/Auth';
import { Theme, useTheme, useThemedStyles } from '@/src/theme/ThemeProvider';

export default function InviteScreen() {
  const styles = useThemedStyles(makeStyles);
  const { colors } = useTheme();
  const me = useMe();
  useRefreshMeOnFocus();
  const household = me.household;

  return (
    <Screen includeTopInset={false}>
      <Text style={styles.lead}>「{household.name}」에 함께 쓸 사람을 초대해요</Text>
      {household.myRole === HouseholdRole.Owner ? (
        <InviteSection full={household.members.length >= household.maxMembers} />
      ) : (
        <Card>
          <View style={styles.notice}>
            <Feather name="lock" size={14} color={colors.textSecondary} />
            <Text style={styles.hint}>초대 코드는 방장만 만들 수 있어요</Text>
          </View>
        </Card>
      )}
    </Screen>
  );
}

const makeStyles = ({ colors, spacing, typography }: Theme) =>
  StyleSheet.create({
    lead: { ...typography.bodyBold, color: colors.text, marginLeft: 4 },
    notice: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs },
    hint: { ...typography.caption, color: colors.textSecondary, lineHeight: 18 },
  });
