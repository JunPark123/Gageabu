// 프로필 — 아이콘·닉네임 (서버에 저장 → 함께 쓰는 사람 화면에도 보임)
import { useEffect, useState } from 'react';
import { Keyboard, StyleSheet, Text, TextInput, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { updateProfile } from '@/src/api/auth';
import { useAuth, useMe } from '@/src/auth/AuthProvider';
import { Button } from '@/src/components/Button';
import { Card } from '@/src/components/Card';
import { PressableScale } from '@/src/components/IconButton';
import { ProfileAvatar } from '@/src/components/ProfileAvatar';
import { Screen } from '@/src/components/Screen';
import { describeError } from '@/src/lib/apiError';
import { notify } from '@/src/lib/confirm';
import { Theme, useTheme, useThemedStyles } from '@/src/theme/ThemeProvider';
import { noWebOutline } from '@/src/theme/web';

export default function ProfileScreen() {
  const styles = useThemedStyles(makeStyles);
  const { colors } = useTheme();
  const me = useMe();
  const { setMe } = useAuth();
  const [nickname, setNickname] = useState(me.user.nickname);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setNickname(me.user.nickname);
  }, [me.user.nickname]);

  const trimmed = nickname.trim();
  const changed = trimmed.length > 0 && trimmed !== me.user.nickname;

  const save = async () => {
    if (!changed) return;
    Keyboard.dismiss();
    setSaving(true);
    try {
      setMe(await updateProfile({ nickname: trimmed }));
      notify('저장했어요', '닉네임을 바꿨어요.');
    } catch (e) {
      const info = describeError(e);
      notify(info.title, info.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen includeTopInset={false} avoidKeyboard>
      <View style={styles.top}>
        <PressableScale onPress={() => router.push('/profile-icon')} accessibilityRole="button" accessibilityLabel="아이콘 바꾸기" style={styles.avatarWrap}>
          <View style={styles.avatar}><ProfileAvatar value={me.user.avatar} size={76} emojiSize={52} /></View>
          <View style={styles.editBadge}><Feather name="edit-2" size={13} color={colors.textOnPrimary} /></View>
        </PressableScale>
        <Text style={styles.hint}>아이콘을 누르면 바꿀 수 있어요</Text>
      </View>

      <Card style={{ gap: 12 }}>
        <Text style={styles.label}>닉네임</Text>
        <TextInput
          value={nickname}
          onChangeText={setNickname}
          maxLength={20}
          placeholder="닉네임"
          placeholderTextColor={colors.textTertiary}
          returnKeyType="done"
          onSubmitEditing={save}
          editable={!saving}
          style={[styles.input, noWebOutline]}
          accessibilityLabel="닉네임"
        />
        <Button label="저장" onPress={save} loading={saving} disabled={!changed} />
      </Card>
      <Text style={styles.hint}>함께 쓰는 사람에게 이 이름과 아이콘으로 보여요. (최대 20자)</Text>
    </Screen>
  );
}

const makeStyles = ({ colors, radius, spacing, typography }: Theme) =>
  StyleSheet.create({
    top: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.md },
    avatarWrap: { width: 96, height: 96 },
    avatar: { width: 96, height: 96, borderRadius: 48, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
    editBadge: { position: 'absolute', right: 0, bottom: 2, width: 28, height: 28, borderRadius: 14, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: colors.background },
    label: { ...typography.captionBold, color: colors.textSecondary },
    input: {
      ...typography.bodyBold,
      fontSize: 17,
      color: colors.text,
      backgroundColor: colors.surfaceMuted,
      borderRadius: radius.sm,
      paddingHorizontal: spacing.md,
      height: 48,
    },
    hint: { ...typography.caption, color: colors.textSecondary, textAlign: 'center', lineHeight: 18 },
  });
