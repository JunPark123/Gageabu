// 가계부 공유 — 멤버·초대·코드 입력·나가기 (docs/PLAN.md 4장)
import { ReactNode, useCallback, useState } from 'react';
import { Platform, Pressable, Share, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router/react-navigation';
import { useQueryClient } from '@tanstack/react-query';
import * as authApi from '@/src/api/auth';
import { useAuth, useMe } from '@/src/auth/AuthProvider';
import { Button } from '@/src/components/Button';
import { Card } from '@/src/components/Card';
import { Screen } from '@/src/components/Screen';
import { describeError } from '@/src/lib/apiError';
import { confirm, notify } from '@/src/lib/confirm';
import { formatKst } from '@/src/lib/date';
import { HouseholdRole, Invite, InvitePreview, Member } from '@/src/models/Auth';
import { Theme, useTheme, useThemedStyles } from '@/src/theme/ThemeProvider';
import { CUTE_FONT } from '@/src/theme/tokens';
import { noWebOutline } from '@/src/theme/web';

// 8자리 코드를 읽기 쉽게: ABCD-EFGH
const formatInviteCode = (code: string) => (code.length === 8 ? `${code.slice(0, 4)}-${code.slice(4)}` : code);

export default function HouseholdScreen() {
  const styles = useThemedStyles(makeStyles);
  const me = useMe();
  const { refreshMe } = useAuth();
  const household = me.household;
  const isOwner = household.myRole === HouseholdRole.Owner;

  // 다른 사람이 들어오거나 나갔을 수 있으니 화면에 올 때마다 새로
  useFocusEffect(
    useCallback(() => {
      refreshMe().catch(() => {});
    }, [refreshMe]),
  );

  return (
    <Screen onRefresh={refreshMe}>
      <HouseholdName name={household.name} editable={isOwner} />

      <Section title={`멤버 ${household.members.length}/${household.maxMembers}명`}>
        {household.members.map((m, i) => (
          <MemberRow key={m.userId} member={m} isMe={m.userId === me.user.id} canRemove={isOwner} last={i === household.members.length - 1} />
        ))}
      </Section>

      {isOwner && <InviteSection full={household.members.length >= household.maxMembers} />}
      <JoinSection aloneInHousehold={household.members.length === 1} />
      {household.members.length > 1 && <LeaveSection />}
    </Screen>
  );
}

// 멤버가 바뀌면 보이는 내역·예산도 바뀌므로 조회를 전부 새로
function useResetData() {
  const queryClient = useQueryClient();
  return () => queryClient.resetQueries();
}

function HouseholdName({ name, editable }: { name: string; editable: boolean }) {
  const styles = useThemedStyles(makeStyles);
  const { colors } = useTheme();
  const { setMe, me } = useAuth();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(name);

  const save = async () => {
    const next = value.trim();
    setEditing(false);
    if (!next || next === name) {
      setValue(name);
      return;
    }
    try {
      const household = await authApi.renameHousehold(next);
      if (me) setMe({ ...me, household });
    } catch (e) {
      setValue(name);
      const info = describeError(e);
      notify(info.title, info.message);
    }
  };

  if (editing) {
    return (
      <TextInput
        value={value}
        onChangeText={setValue}
        onBlur={save}
        onSubmitEditing={save}
        autoFocus
        maxLength={30}
        style={[styles.nameInput, noWebOutline]}
        returnKeyType="done"
      />
    );
  }
  return (
    <Pressable onPress={editable ? () => setEditing(true) : undefined} style={styles.nameRow} accessibilityRole={editable ? 'button' : undefined} accessibilityLabel={editable ? '가계부 이름 바꾸기' : undefined}>
      <Text style={styles.name} numberOfLines={1}>{name}</Text>
      {editable && <Feather name="edit-2" size={16} color={colors.textTertiary} />}
    </Pressable>
  );
}

function MemberRow({ member, isMe, canRemove, last }: { member: Member; isMe: boolean; canRemove: boolean; last: boolean }) {
  const styles = useThemedStyles(makeStyles);
  const { refreshMe } = useAuth();
  const resetData = useResetData();

  const onRemove = async () => {
    if (!(await confirm('내보내기', `${member.nickname}님을 이 가계부에서 내보낼까요? 그동안 쓴 내역은 남아요.`, '내보내기', true))) return;
    try {
      await authApi.removeMember(member.userId);
      await refreshMe();
      void resetData();
    } catch (e) {
      const info = describeError(e);
      notify(info.title, info.message);
    }
  };

  return (
    <View style={[styles.row, !last && styles.rowBorder]}>
      <View style={styles.avatar}>
        <Text style={{ fontSize: 20 }}>{member.avatar}</Text>
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Text style={styles.memberName} numberOfLines={1}>{member.nickname}</Text>
          {isMe && <Text style={styles.badge}>나</Text>}
          {member.role === HouseholdRole.Owner && <Text style={styles.badge}>방장</Text>}
        </View>
        <Text style={styles.sub}>{formatKst(member.joinedAt, 'YYYY.MM.DD')} 부터</Text>
      </View>
      {canRemove && !isMe && (
        <Pressable onPress={onRemove} hitSlop={8} accessibilityRole="button" accessibilityLabel={`${member.nickname} 내보내기`}>
          <Text style={styles.danger}>내보내기</Text>
        </Pressable>
      )}
    </View>
  );
}

function InviteSection({ full }: { full: boolean }) {
  const styles = useThemedStyles(makeStyles);
  const [invite, setInvite] = useState<Invite | null>(null);
  const [loading, setLoading] = useState(false);

  const create = async () => {
    setLoading(true);
    try {
      setInvite(await authApi.createInvite());
    } catch (e) {
      const info = describeError(e);
      notify(info.title, info.message);
    } finally {
      setLoading(false);
    }
  };

  const share = async () => {
    if (!invite) return;
    const code = formatInviteCode(invite.code);
    // 앱이 없어도 코드만 보고 입력할 수 있게 코드를 글자로 넣는다
    const message = `우리 가계부에 초대해요! 🐷\n앱 설정 > 가계부 공유 > 초대코드 입력에서\n${code}\n를 입력하세요. (${formatKst(invite.expiresAt, 'M월 D일 HH:mm')}까지, 한 번만 쓸 수 있어요)`;
    try {
      await Share.share({ message });
    } catch {
      notify('초대 코드', message);
    }
  };

  return (
    <Section title="초대하기">
      <View style={styles.box}>
        {full ? (
          <Text style={styles.sub}>최대 인원이 다 찼어요.</Text>
        ) : invite ? (
          <>
            <Text style={styles.code} selectable>{formatInviteCode(invite.code)}</Text>
            <Text style={styles.sub}>{formatKst(invite.expiresAt, 'M월 D일 HH:mm')}까지 · 한 사람만 쓸 수 있어요</Text>
            <View style={styles.buttons}>
              {Platform.OS !== 'web' && <Button label="공유하기" onPress={share} style={{ flex: 1 }} />}
              <Button label="새 코드" variant="secondary" onPress={create} loading={loading} style={{ flex: 1 }} />
            </View>
          </>
        ) : (
          <>
            <Text style={styles.sub}>초대 코드를 만들어 카카오톡 등으로 보내세요. 받은 사람이 코드를 입력하면 이 가계부를 같이 써요.</Text>
            <Button label="초대 코드 만들기" onPress={create} loading={loading} />
          </>
        )}
      </View>
    </Section>
  );
}

function JoinSection({ aloneInHousehold }: { aloneInHousehold: boolean }) {
  const styles = useThemedStyles(makeStyles);
  const { colors } = useTheme();
  const { setMe } = useAuth();
  const resetData = useResetData();
  const [code, setCode] = useState('');
  const [preview, setPreview] = useState<InvitePreview | null>(null);
  const [merge, setMerge] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const check = async () => {
    setLoading(true);
    setError(null);
    try {
      setPreview(await authApi.previewInvite(code));
    } catch (e) {
      setError(describeError(e).message);
    } finally {
      setLoading(false);
    }
  };

  const join = async () => {
    if (!preview) return;
    const warning = aloneInHousehold
      ? merge ? '지금 내 가계부의 내역을 가져가요.' : '지금 내 가계부의 내역은 가져가지 않아요.'
      : '지금 같이 쓰는 가계부에서는 나가게 돼요.';
    if (!(await confirm('가계부 참여', `"${preview.householdName}"에 참여할까요? ${warning}`, '참여'))) return;
    setLoading(true);
    setError(null);
    try {
      setMe(await authApi.acceptInvite(code, aloneInHousehold && merge));
      setCode('');
      setPreview(null);
      void resetData();
      notify("참여 완료", `"${preview.householdName}"에 참여했어요. 이제 같이 써요.`);
    } catch (e) {
      setError(describeError(e).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Section title="초대코드 입력">
      <View style={styles.box}>
        <TextInput
          value={code}
          onChangeText={(v) => {
            setCode(v.toUpperCase());
            setPreview(null);
            setError(null);
          }}
          placeholder="ABCD-EFGH"
          placeholderTextColor={colors.textTertiary}
          autoCapitalize="characters"
          autoCorrect={false}
          maxLength={12}
          style={[styles.codeInput, noWebOutline]}
          accessibilityLabel="초대 코드"
        />
        {error && <Text style={styles.error}>{error}</Text>}
        {preview ? (
          <>
            <Text style={styles.previewText}>
              {preview.inviterNickname}님의 <Text style={{ fontWeight: '700' }}>{preview.householdName}</Text> (멤버 {preview.memberCount}명)
            </Text>
            {aloneInHousehold && (
              <View style={styles.mergeRow}>
                <Text style={[styles.sub, { flex: 1 }]}>지금 내 가계부의 내역도 가져가기</Text>
                <Switch value={merge} onValueChange={setMerge} />
              </View>
            )}
            <Button label="참여하기" onPress={join} loading={loading} />
          </>
        ) : (
          <Button label="확인" variant="secondary" onPress={check} loading={loading} disabled={code.replace(/[^A-Za-z0-9]/g, '').length < 8} />
        )}
      </View>
    </Section>
  );
}

function LeaveSection() {
  const styles = useThemedStyles(makeStyles);
  const { setMe } = useAuth();
  const resetData = useResetData();

  const leave = async () => {
    if (!(await confirm('가계부 나가기', '이 가계부에서 나갈까요? 내가 쓴 내역은 이 가계부에 남고, 나는 새 개인 가계부를 받아요.', '나가기', true))) return;
    try {
      setMe(await authApi.leaveHousehold());
      void resetData();
    } catch (e) {
      const info = describeError(e);
      notify(info.title, info.message);
    }
  };

  return (
    <Pressable onPress={leave} style={styles.leave} accessibilityRole="button">
      <Text style={styles.danger}>가계부 나가기</Text>
    </Pressable>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={{ gap: 8 }}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Card padded={false} style={{ overflow: 'hidden' }}>{children}</Card>
    </View>
  );
}

const makeStyles = ({ colors, radius, spacing, typography }: Theme) =>
  StyleSheet.create({
    nameRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    name: { ...typography.title, color: colors.text, flexShrink: 1 },
    nameInput: { ...typography.title, color: colors.text, backgroundColor: colors.surfaceMuted, borderRadius: radius.sm, paddingHorizontal: spacing.md, paddingVertical: spacing.xs },
    sectionTitle: { ...typography.captionBold, fontSize: 13, color: colors.textSecondary, marginLeft: 4 },
    row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, minHeight: 60 },
    rowBorder: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.divider },
    avatar: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
    memberName: { ...typography.bodyBold, color: colors.text, flexShrink: 1 },
    sub: { ...typography.caption, color: colors.textSecondary, lineHeight: 18 },
    badge: {
      ...typography.caption,
      fontSize: 11,
      color: colors.text,
      backgroundColor: colors.primarySoft,
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: radius.pill,
      overflow: 'hidden',
    },
    danger: { ...typography.captionBold, color: colors.expense },
    box: { padding: spacing.lg, gap: spacing.md },
    code: { fontFamily: CUTE_FONT, fontSize: 36, letterSpacing: 2, color: colors.text, textAlign: 'center' },
    buttons: { flexDirection: 'row', gap: spacing.sm },
    codeInput: {
      fontFamily: CUTE_FONT,
      fontSize: 24,
      letterSpacing: 2,
      textAlign: 'center',
      color: colors.text,
      backgroundColor: colors.surfaceMuted,
      borderRadius: radius.sm,
      paddingVertical: spacing.sm,
    },
    error: { ...typography.caption, color: colors.expense, textAlign: 'center' },
    previewText: { ...typography.body, color: colors.text, textAlign: 'center' },
    mergeRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
    leave: { alignItems: 'center', paddingVertical: spacing.lg },
  });
