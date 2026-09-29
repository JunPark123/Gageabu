// 초대 코드 입력 — 받은 코드(또는 메시지 통째)로 다른 가계부에 참여
import { StyleSheet, Text } from 'react-native';
import { router } from 'expo-router';
import { useMe } from '@/src/auth/AuthProvider';
import { Screen } from '@/src/components/Screen';
import { JoinSection } from '@/src/features/household/HouseholdParts';
import { Theme, useThemedStyles } from '@/src/theme/ThemeProvider';

export default function JoinScreen() {
  const styles = useThemedStyles(makeStyles);
  const me = useMe();
  return (
    <Screen includeTopInset={false} avoidKeyboard>
      <Text style={styles.lead}>받은 초대 코드를 입력해 주세요</Text>
      <JoinSection aloneInHousehold={me.household.members.length === 1} onJoined={() => router.back()} />
    </Screen>
  );
}

const makeStyles = ({ colors, typography }: Theme) =>
  StyleSheet.create({
    lead: { ...typography.bodyBold, color: colors.text, marginLeft: 4 },
  });
