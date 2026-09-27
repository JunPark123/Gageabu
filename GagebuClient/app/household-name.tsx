// 가계부 이름 (DB Households.Name). 방장만 바꿀 수 있고, 바꾸면 실시간으로 멤버 화면에도 반영된다
import { useEffect, useState } from 'react';
import { Keyboard, StyleSheet, Text, TextInput, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as authApi from '@/src/api/auth';
import { useAuth, useMe } from '@/src/auth/AuthProvider';
import { Button } from '@/src/components/Button';
import { Card } from '@/src/components/Card';
import { Screen } from '@/src/components/Screen';
import { describeError } from '@/src/lib/apiError';
import { notify } from '@/src/lib/confirm';
import { HouseholdRole } from '@/src/models/Auth';
import { Theme, useTheme, useThemedStyles } from '@/src/theme/ThemeProvider';
import { noWebOutline } from '@/src/theme/web';

export default function HouseholdNameScreen() {
  const styles = useThemedStyles(makeStyles);
  const { colors } = useTheme();
  const me = useMe();
  const { setMe } = useAuth();
  const name = me.household.name;
  const editable = me.household.myRole === HouseholdRole.Owner;
  const [value, setValue] = useState(name);
  const [saving, setSaving] = useState(false);

  // 다른 기기에서 바뀐 이름이 들어오면 칸도 맞춘다
  useEffect(() => {
    setValue(name);
  }, [name]);

  const trimmed = value.trim();
  const changed = trimmed.length > 0 && trimmed !== name;

  const save = async () => {
    if (!changed) return;
    Keyboard.dismiss();
    setSaving(true);
    try {
      const household = await authApi.renameHousehold(trimmed);
      setMe({ ...me, household });
      router.back();
    } catch (e) {
      const info = describeError(e);
      notify(info.title, info.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen includeTopInset={false} avoidKeyboard>
      <Card style={{ gap: 12 }}>
        <TextInput
          value={value}
          onChangeText={setValue}
          editable={editable && !saving}
          maxLength={30}
          autoFocus={editable}
          placeholder="예: 우리집 가계부"
          placeholderTextColor={colors.textTertiary}
          returnKeyType="done"
          onSubmitEditing={save}
          style={[styles.input, !editable && { color: colors.textSecondary }, noWebOutline]}
          accessibilityLabel="가계부 이름"
        />
        {editable ? (
          <Button label="저장" onPress={save} loading={saving} disabled={!changed} />
        ) : (
          <View style={styles.notice}>
            <Feather name="lock" size={13} color={colors.textSecondary} />
            <Text style={styles.hint}>이름은 방장만 바꿀 수 있어요</Text>
          </View>
        )}
      </Card>
      <Text style={styles.hint}>함께 쓰는 사람 모두에게 이 이름으로 보여요. (최대 30자)</Text>
    </Screen>
  );
}

const makeStyles = ({ colors, radius, spacing, typography }: Theme) =>
  StyleSheet.create({
    input: {
      ...typography.bodyBold,
      fontSize: 17,
      color: colors.text,
      backgroundColor: colors.surfaceMuted,
      borderRadius: radius.sm,
      paddingHorizontal: spacing.md,
      height: 48,
    },
    notice: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs },
    hint: { ...typography.caption, color: colors.textSecondary, lineHeight: 18, marginLeft: 4 },
  });
