// 멤버 관리 — 함께 쓰는 사람 목록(방장은 내보내기)과 혼자 쓰기
import { StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useMe } from '@/src/auth/AuthProvider';
import { Button } from '@/src/components/Button';
import { Screen } from '@/src/components/Screen';
import { LeaveSection, MemberRow, Section, useRefreshMeOnFocus } from '@/src/features/household/HouseholdParts';
import { HouseholdRole } from '@/src/models/Auth';
import { Theme, useThemedStyles } from '@/src/theme/ThemeProvider';

export default function MembersScreen() {
  const styles = useThemedStyles(makeStyles);
  const me = useMe();
  const refreshMe = useRefreshMeOnFocus();
  const household = me.household;
  const isOwner = household.myRole === HouseholdRole.Owner;
  const alone = household.members.length === 1;
  const full = household.members.length >= household.maxMembers;

  return (
    <Screen onRefresh={refreshMe} includeTopInset={false}>
      <Section title={`멤버 ${household.members.length}/${household.maxMembers}명`}>
        {household.members.map((m, i) => (
          <MemberRow key={m.userId} member={m} isMe={m.userId === me.user.id} canRemove={isOwner} last={i === household.members.length - 1} />
        ))}
      </Section>
      {/* 방장이면 자리가 남아 있는 동안 늘 초대할 수 있게 (2명이 된 뒤에도) */}
      {(alone || (isOwner && !full)) && (
        <View style={styles.alone}>
          {alone && <Text style={styles.hint}>아직 혼자 쓰고 있어요. 초대 코드를 보내 함께 써 보세요.</Text>}
          <Button label="초대하기" size="sm" onPress={() => router.push('/invite')} />
        </View>
      )}
      {!alone && <LeaveSection />}
    </Screen>
  );
}

const makeStyles = ({ colors, spacing, typography }: Theme) =>
  StyleSheet.create({
    alone: { alignItems: 'center', gap: spacing.md, paddingVertical: spacing.lg },
    hint: { ...typography.caption, color: colors.textSecondary, textAlign: 'center', lineHeight: 18 },
  });
