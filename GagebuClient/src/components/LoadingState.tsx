import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';

// 처음 불러오는 동안 (아직 모르는 값을 ₩0처럼 보여주지 않도록)
export function LoadingState() {
  const { colors, typography } = useTheme();
  return (
    <View style={styles.box} accessibilityLabel="불러오는 중">
      <ActivityIndicator color={colors.textSecondary} />
      <Text style={[typography.body, { color: colors.textSecondary }]}>불러오는 중…</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { alignItems: 'center', gap: 10, paddingVertical: 60 },
});
