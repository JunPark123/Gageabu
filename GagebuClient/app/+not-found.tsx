import { Link, Stack } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '@/src/theme/ThemeProvider';

export default function NotFoundScreen() {
  const { colors, typography } = useTheme();
  return (
    <>
      <Stack.Screen options={{ title: '없는 화면' }} />
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Text style={{ fontSize: 48 }}>🐷</Text>
        <Text style={[typography.heading, { color: colors.text }]}>없는 화면이에요</Text>
        <Link href="/" style={[typography.bodyBold, { color: colors.income }]}>
          홈으로 가기
        </Link>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 20 },
});
