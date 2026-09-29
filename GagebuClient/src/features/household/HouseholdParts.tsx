// 가계부 공유 부품 — 멤버 관리(app/members)·초대하기(app/invite)·초대 코드 입력(app/join) 화면이 나눠 쓴다 (docs/PLAN.md 4장)
import { ReactNode, useCallback, useEffect, useState } from 'react';
import { Keyboard, Platform, Pressable, Share, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { useQueryClient } from '@tanstack/react-query';
import { useFocusEffect } from 'expo-router/react-navigation';
import * as authApi from '@/src/api/auth';
import { useAuth, useMe } from '@/src/auth/AuthProvider';
import { Button } from '@/src/components/Button';
import { Card } from '@/src/components/Card';
import { PigFace } from '@/src/components/Pig';
import { ProfileAvatar } from '@/src/components/ProfileAvatar';
import { describeError } from '@/src/lib/apiError';
import { confirm, notify } from '@/src/lib/confirm';
import { formatKst } from '@/src/lib/date';
import { HouseholdRole, Invite, InvitePreview, Member } from '@/src/models/Auth';
import { Theme, useTheme, useThemedStyles } from '@/src/theme/ThemeProvider';
import { CUTE_FONT } from '@/src/theme/tokens';
import { noWebOutline } from '@/src/theme/web';

// 입력 중에도 4자리씩 구분한다. 하이픈은 표시용이며 실제 코드는 영문·숫자 8자리다.
// 초대 메시지를 통째로 붙여넣어도 코드만 가져온다:
//   ① "초대코드 : ABCD-EFGH"  ② 글 속의 ABCD-EFGH 모양  ③ 그 외(직접 타이핑)는 영문·숫자만
export const formatInviteCode = (text: string) => {
  const found =
    text.match(/초대\s*코드\s*[:：]?\s*([A-Za-z0-9]{4}-?[A-Za-z0-9]{4})(?![A-Za-z0-9])/)?.[1] ??
    text.match(/(?<![A-Za-z0-9])([A-Za-z0-9]{4}-[A-Za-z0-9]{4})(?![A-Za-z0-9])/)?.[1];
  const normalized = (found ?? text).replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 8);
  return normalized.length > 4 ? `${normalized.slice(0, 4)}-${normalized.slice(4)}` : normalized;
};

// 다른 사람이 들어오거나 나갔을 수 있으니 화면에 올 때마다 내 정보를 새로
export function useRefreshMeOnFocus() {
  const { refreshMe } = useAuth();
  useFocusEffect(
    useCallback(() => {
      refreshMe().catch(() => {});
    }, [refreshMe]),
  );
  return refreshMe;
}

// 멤버가 바뀌면 보이는 내역·예산도 바뀌므로 조회를 전부 새로
function useResetData() {
  const queryClient = useQueryClient();
  return () => queryClient.resetQueries();
}

export function MemberRow({ member, isMe, canRemove, last }: { member: Member; isMe: boolean; canRemove: boolean; last: boolean }) {
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
        <ProfileAvatar value={member.avatar} size={32} emojiSize={20} />
      </View>
      <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Text style={styles.memberName} numberOfLines={1}>{member.nickname}</Text>
          {isMe && <Text style={styles.badge}>나</Text>}
          {member.role === HouseholdRole.Owner && <Text style={styles.badge}>방장</Text>}
        </View>
        <Text style={styles.sub}>초대일 : {formatKst(member.joinedAt, 'YYYY.MM.DD')}</Text>
      </View>
      {canRemove && !isMe && (
        <Pressable
          onPress={onRemove}
          hitSlop={6}
          style={({ pressed }) => [styles.removeButton, pressed && styles.pressedSquish]}
          accessibilityRole="button"
          accessibilityLabel={`${member.nickname} 내보내기`}
        >
          <Text style={styles.removeEmoji}>👋</Text>
          <Text style={styles.removeLabel}>내보내기</Text>
        </Pressable>
      )}
    </View>
  );
}

export function InviteSection({ full }: { full: boolean }) {
  const styles = useThemedStyles(makeStyles);
  const { colors } = useTheme();
  const me = useMe();
  const [invite, setInvite] = useState<Invite | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 2500);
    return () => clearTimeout(timer);
  }, [copied]);

  const create = async () => {
    setLoading(true);
    try {
      setInvite(await authApi.createInvite());
      setCopied(false);
    } catch (e) {
      const info = describeError(e);
      notify(info.title, info.message);
    } finally {
      setLoading(false);
    }
  };

  const copy = async () => {
    if (!invite) return;
    try {
      const success = await Clipboard.setStringAsync(formatInviteCode(invite.code));
      if (!success) throw new Error('Clipboard unavailable');
      setCopied(true);
    } catch {
      notify('복사하지 못했어요', '초대 코드를 길게 눌러 복사해주세요.');
    }
  };

  // 코드 공유: 메시지 하나에 안내 + 코드. 받은 사람은 말풍선을 통째로 복사해 붙여넣어도 코드만 들어간다
  // (공유 메뉴는 한 번에 메시지 하나만 보낼 수 있다)
  const shareCode = async () => {
    if (!invite) return;
    const message = `「${me.household.name}」에 초대해요! 🐷\n\n사용 방법 : 이 메시지를 길게 눌러 복사한 뒤, 가계부 앱의 설정 → 초대 코드 입력에 붙여넣어 주세요.\n\n초대코드 : ${formatInviteCode(invite.code)} (${formatKst(invite.expiresAt, 'M월 D일 HH:mm')}까지)`;
    try {
      await Share.share({ message });
    } catch {
      notify('초대 코드', message);
    }
  };

  // 링크 공유: 카카오톡 링크 메시지(SDK)를 붙일 자리 — 아직 준비 중
  const shareLink = () => notify('준비 중이에요', '카카오톡으로 초대 링크를 보내는 기능은 곧 연결할게요.');


  return (
    <Card padded={false}>
      <View style={styles.box}>
        {full ? (
          <Text style={styles.sub}>최대 인원이 다 찼어요.</Text>
        ) : invite ? (
          <>
            <View style={styles.inviteCodeBox}>
              <Text style={styles.code} selectable>{formatInviteCode(invite.code)}</Text>
              <Text style={styles.expiry}>만료일 : {formatKst(invite.expiresAt, 'M월 D일 HH:mm')}까지</Text>
            </View>
            <View style={styles.buttons}>
              <Button label={copied ? '복사 완료' : '코드 복사'} variant="secondary" onPress={copy} disabled={loading} icon={<Feather name={copied ? "check" : "copy"} size={14} color={colors.text} />} size="sm" style={styles.inviteButton} />
              {Platform.OS !== 'web' && (
                <Button label="코드 공유" onPress={shareCode} disabled={loading} icon={<Feather name="share-2" size={14} color={colors.textOnPrimary} />} size="sm" style={styles.inviteButton} />
              )}
              {Platform.OS !== 'web' && (
                <Button label="링크 공유" variant="info" onPress={shareLink} disabled={loading} icon={<Feather name="link" size={14} color={colors.income} />} size="sm" style={styles.inviteButton} />
              )}
            </View>
            {Platform.OS !== 'web' && <Text style={styles.sub}>받은 사람은 메시지를 통째로 복사해 붙여넣으면 돼요.</Text>}
            <Button label="새 코드 생성" variant="ghost" onPress={create} loading={loading} />
            <Text style={styles.sub}>새 코드를 생성하면 이전 코드는 사용할 수 없어요.</Text>
          </>
        ) : (
          <>
            <Text style={styles.sub}>초대 코드를 만들어 카카오톡 등으로 보내세요. 받은 사람이 코드를 입력하면 이 가계부를 같이 써요.</Text>
            <Button label="초대코드 생성" onPress={create} loading={loading} />
          </>
        )}
      </View>
    </Card>
  );
}

export function JoinSection({ aloneInHousehold, onJoined }: { aloneInHousehold: boolean; onJoined?: () => void }) {
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
    Keyboard.dismiss();
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
      onJoined?.();
    } catch (e) {
      setError(describeError(e).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card padded={false}>
      <View style={styles.box}>
        <TextInput
          value={code}
          onChangeText={(v) => {
            setCode(formatInviteCode(v));
            setPreview(null);
            setError(null);
          }}
          placeholder="ABCD-EFGH"
          placeholderTextColor={colors.textTertiary}
          // 여러 줄 메시지를 붙여넣어도 한 줄·같은 높이 (붙여넣는 순간 칸이 커지지 않게)
          multiline={false}
          numberOfLines={1}
          autoCapitalize="characters"
          autoCorrect={false}
          spellCheck={false}
          returnKeyType="done"
          onSubmitEditing={() => {
            if (!loading && code.replace(/-/g, '').length === 8) void check();
            else Keyboard.dismiss();
          }}
          style={[styles.codeInput, noWebOutline]}
          accessibilityLabel="초대 코드"
        />
        <Text style={styles.sub}>받은 초대 메시지를 통째로 붙여넣어도 돼요.</Text>
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
          <Button label="확인" variant="secondary" onPress={check} loading={loading} disabled={code.replace(/-/g, '').length !== 8} />
        )}
      </View>
    </Card>
  );
}

export function LeaveSection() {
  const styles = useThemedStyles(makeStyles);
  const { setMe } = useAuth();
  const resetData = useResetData();

  const leave = async () => {
    if (!(await confirm('혼자 쓸래요?', '함께 쓰던 가계부에서 나와 새 개인 가계부를 만들어요. 내가 쓴 내역은 기존 가계부에 남아요.', '혼자 쓰기', true))) return;
    try {
      setMe(await authApi.leaveHousehold());
      void resetData();
    } catch (e) {
      const info = describeError(e);
      notify(info.title, info.message);
    }
  };

  return (
    <View style={styles.leave}>
      <Pressable onPress={leave} style={({ pressed }) => [styles.soloButton, pressed && styles.pressed]} accessibilityRole="button" accessibilityLabel="혼자 쓸래요" accessibilityHint="함께 쓰는 가계부에서 나와 개인 가계부를 만듭니다">
        <PigFace state="happy" size={28} />
        <Text style={styles.soloLabel}>혼자 쓸래요</Text>
      </Pressable>
      <Text style={styles.leaveHint}>함께 쓴 기록은 여기에 남겨둘게요.</Text>
    </View>
  );
}

export function Section({ title, children }: { title: string; children: ReactNode }) {
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
    removeButton: { minHeight: 36, flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: spacing.md, borderRadius: radius.pill, backgroundColor: colors.expenseSoft, borderWidth: 1, borderColor: colors.expense + '33', flexShrink: 0 },
    removeEmoji: { fontSize: 14 },
    removeLabel: { fontFamily: CUTE_FONT, fontSize: 14, color: colors.expense },
    soloButton: { minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, paddingLeft: spacing.md, paddingRight: spacing.xl, paddingVertical: spacing.sm, borderRadius: radius.pill, backgroundColor: colors.primarySoft, borderWidth: 1, borderColor: colors.primary, },
    soloLabel: { fontFamily: CUTE_FONT, fontSize: 17, color: colors.text },
    pressed: { opacity: 0.65 },
    pressedSquish: { opacity: 0.8, transform: [{ scale: 0.97 }] },
    box: { padding: spacing.lg, gap: spacing.md },
    code: { fontFamily: CUTE_FONT, fontSize: 36, letterSpacing: 2, color: colors.text, textAlign: 'center' },
    inviteNotice: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs },
    inviteCodeBox: { backgroundColor: colors.surfaceMuted, borderRadius: radius.md, paddingVertical: spacing.md, paddingHorizontal: spacing.sm, gap: spacing.sm },
    expiry: { ...typography.caption, color: colors.textSecondary, textAlign: 'center', lineHeight: 18 },
    buttons: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
    inviteButton: { flexGrow: 1, flexBasis: 100 },
    codeInput: {
      fontFamily: CUTE_FONT,
      fontSize: 24,
      letterSpacing: 2,
      textAlign: 'center',
      color: colors.text,
      backgroundColor: colors.surfaceMuted,
      borderRadius: radius.sm,
      height: 56,
      paddingVertical: 0,
    },
    error: { ...typography.caption, color: colors.expense, textAlign: 'center' },
    previewText: { ...typography.body, color: colors.text, textAlign: 'center' },
    mergeRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
    leave: { alignItems: 'center', gap: spacing.sm, paddingTop: spacing.sm, paddingBottom: spacing.lg },
    leaveHint: { ...typography.caption, color: colors.textSecondary, textAlign: 'center', lineHeight: 18 },
  });
