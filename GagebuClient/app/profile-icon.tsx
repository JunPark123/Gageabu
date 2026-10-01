// 프로필 아이콘 고르기 (서버에 저장 → 함께 쓰는 사람 화면에도 보임)
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { updateProfile } from '@/src/api/auth';
import { useAuth, useMe } from '@/src/auth/AuthProvider';
import { Card } from '@/src/components/Card';
import { PROFILE_AVATARS, ProfileAvatar } from '@/src/components/ProfileAvatar';
import { Screen } from '@/src/components/Screen';
import { describeError } from '@/src/lib/apiError';
import { notify } from '@/src/lib/confirm';
import { Theme, useTheme, useThemedStyles } from '@/src/theme/ThemeProvider';

export default function ProfileIconScreen() {
  const styles = useThemedStyles(makeStyles);
  const { colors } = useTheme();
  const me = useMe();
  const { setMe } = useAuth();
  const [saving, setSaving] = useState<string | null>(null);
  const illustrations = PROFILE_AVATARS.filter(({ value }) => value.startsWith('icon:'));
  const emojis = PROFILE_AVATARS.filter(({ value }) => !value.startsWith('icon:'));

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
        <View style={styles.previewAvatar}><ProfileAvatar value={me.user.avatar} size={86} emojiSize={62} /></View>
        <View style={styles.previewCopy}>
          <Text style={styles.previewCaption}>내 프로필 미리보기</Text>
          <Text style={styles.previewName} numberOfLines={1}>{me.user.nickname}</Text>
          <Text style={styles.hint}>함께 쓰는 사람에게 이렇게 보여요</Text>
        </View>
      </View>

      <View style={styles.sectionHeading}>
        <Text style={styles.sectionTitle}>캐릭터 아이콘</Text>
        <Text style={styles.sectionHint}>마음에 드는 친구를 골라요</Text>
      </View>
      <View style={styles.characterGrid}>
        {illustrations.map(({ value, label }) => {
          const selected = me.user.avatar === value;
          return (
            <Pressable
              key={value}
              onPress={() => choose(value)}
              disabled={saving !== null}
              style={({ pressed }) => [styles.characterOption, selected && styles.characterSelected, (pressed || saving === value) && styles.pressed]}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              accessibilityLabel={`아이콘 ${label}`}
            >
              {selected && <View style={styles.check}><Feather name="check" size={13} color={colors.textOnPrimary} /></View>}
              <View style={styles.characterArt}><ProfileAvatar value={value} size={72} /></View>
              <Text style={styles.characterName}>{label}</Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.sectionHeading}>
        <Text style={styles.sectionTitle}>기본 이모지</Text>
      </View>
      <Card>
        <View style={styles.emojiGrid}>
          {emojis.map(({ value, label }) => {
            const selected = me.user.avatar === value;
            return (
              <Pressable
                key={value}
                onPress={() => choose(value)}
                disabled={saving !== null}
                style={({ pressed }) => [styles.emojiOption, selected && styles.emojiSelected, (pressed || saving === value) && styles.pressed]}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                accessibilityLabel={`아이콘 ${label}`}
              >
                <ProfileAvatar value={value} size={40} emojiSize={28} />
              </Pressable>
            );
          })}
        </View>
      </Card>
    </Screen>
  );
}

const makeStyles = ({ colors, radius, spacing, typography, scheme }: Theme) =>
  StyleSheet.create({
    current: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg, padding: spacing.lg, borderRadius: radius.xl, backgroundColor: colors.primaryCardTile },
    previewAvatar: { width: 98, height: 98, borderRadius: 49, borderWidth: 3, borderColor: colors.surface, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
    previewCopy: { flex: 1, gap: 3 },
    previewCaption: { ...typography.captionBold, color: colors.primary },
    previewName: { ...typography.heading, color: colors.text },
    hint: { ...typography.caption, color: colors.textSecondary, lineHeight: 17 },
    sectionHeading: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.sm, marginTop: spacing.sm },
    sectionTitle: { ...typography.heading, color: colors.text },
    sectionHint: { ...typography.caption, color: colors.textSecondary },
    characterGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: spacing.sm },
    characterOption: { width: '48%', minHeight: 126, alignItems: 'center', justifyContent: 'center', gap: 4, borderRadius: radius.lg, backgroundColor: colors.surface, borderWidth: 2, borderColor: colors.border },
    characterSelected: { borderColor: colors.primary, backgroundColor: colors.primaryCardTile },
    characterArt: { width: 78, height: 78, alignItems: 'center', justifyContent: 'center', borderRadius: 39, backgroundColor: colors.primarySoft },
    characterName: { ...typography.captionBold, color: colors.text },
    check: { position: 'absolute', top: 8, right: 8, width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary, zIndex: 1 },
    emojiGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: spacing.sm },
    emojiOption: { width: 58, height: 58, borderRadius: 29, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'transparent', backgroundColor: scheme === 'dark' ? colors.surfaceMuted : colors.background },
    emojiSelected: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
    pressed: { opacity: 0.6, transform: [{ scale: 0.95 }] },
  });
