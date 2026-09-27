// 프로필 아이콘 고르기 (서버에 저장 → 함께 쓰는 사람 화면에도 보임)
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { updateProfile } from '@/src/api/auth';
import { useAuth, useMe } from '@/src/auth/AuthProvider';
import { Card } from '@/src/components/Card';
import { PROFILE_AVATARS, ProfileAvatar } from '@/src/components/ProfileAvatar';
import { Screen } from '@/src/components/Screen';
import { describeError } from '@/src/lib/apiError';
import { notify } from '@/src/lib/confirm';
import { Theme, useThemedStyles } from '@/src/theme/ThemeProvider';

export default function ProfileIconScreen() {
  const styles = useThemedStyles(makeStyles);
  const me = useMe();
  const { setMe } = useAuth();
  const [saving, setSaving] = useState<string | null>(null);

  const choose = async (avatar: string) => {
    if (avatar === me.user.avatar) {
      router.back();
      return;
    }
    setSaving(avatar);
    try {
      setMe(await updateProfile({ avatar }));
      router.back();
    } catch (e) {
      const info = describeError(e);
      notify(info.title, info.message);
    } finally {
      setSaving(null);
    }
  };

  return (
    <Screen includeTopInset={false}>
      <View style={styles.current}>
        <ProfileAvatar value={me.user.avatar} size={72} emojiSize={48} />
        <Text style={styles.hint}>함께 쓰는 사람에게 이 아이콘으로 보여요</Text>
      </View>
      <Card>
        <View style={styles.grid}>
          {PROFILE_AVATARS.map(({ value, label }) => {
            const selected = me.user.avatar === value;
            return (
              <Pressable
                key={value}
                onPress={() => choose(value)}
                disabled={saving !== null}
                style={({ pressed }) => [styles.option, selected && styles.selected, (pressed || saving === value) && styles.pressed]}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                accessibilityLabel={`아이콘 ${label}`}
              >
                <ProfileAvatar value={value} size={44} emojiSize={28} />
              </Pressable>
            );
          })}
        </View>
      </Card>
    </Screen>
  );
}

const makeStyles = ({ colors, spacing, typography }: Theme) =>
  StyleSheet.create({
    current: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.md },
    hint: { ...typography.caption, color: colors.textSecondary },
    grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: spacing.md },
    option: { width: 60, height: 60, borderRadius: 30, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'transparent' },
    selected: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
    pressed: { opacity: 0.6, transform: [{ scale: 0.95 }] },
  });
