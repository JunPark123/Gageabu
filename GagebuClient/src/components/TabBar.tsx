import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import type { BottomTabBarProps } from 'expo-router/js-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Theme, useTheme, useThemedStyles } from '../theme/ThemeProvider';

const ICONS: Record<string, keyof typeof Feather.glyphMap> = {
  index: 'home',
  history: 'list',
  stats: 'bar-chart-2',
  settings: 'settings',
};

const FAB_SIZE = 58;

// 홈 · 내역 · [+] · 통계 · 설정 — 가운데 노란 버튼은 탭이 아니라 추가 시트를 연다
export function TabBar({ state, descriptors, navigation, onAdd }: BottomTabBarProps & { onAdd: () => void }) {
  const styles = useThemedStyles(makeStyles);
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const tabs = state.routes.map((route, index) => {
    const focused = state.index === index;
    const label = descriptors[route.key].options.title ?? route.name;
    const color = focused ? colors.text : colors.textTertiary;
    const onPress = () => {
      const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
      if (!focused && !event.defaultPrevented) navigation.navigate(route.name, route.params);
    };
    return (
      <Pressable key={route.key} onPress={onPress} style={styles.tab} accessibilityRole="tab" accessibilityState={{ selected: focused }} accessibilityLabel={label}>
        <Feather name={ICONS[route.name] ?? 'circle'} size={22} color={color} />
        <Text style={[styles.label, { color }, focused && styles.labelFocused]}>{label}</Text>
        <View style={[styles.dot, focused && { backgroundColor: colors.primary }]} />
      </Pressable>
    );
  });

  const middle = Math.ceil(tabs.length / 2);
  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 8) }]}>
      {tabs.slice(0, middle)}
      <View style={styles.fabSlot}>
        <Pressable onPress={onAdd} style={({ pressed }) => [styles.fab, pressed && { transform: [{ scale: 0.95 }] }]} accessibilityRole="button" accessibilityLabel="내역 추가">
          <Feather name="plus" size={30} color={colors.textOnPrimary} />
        </Pressable>
      </View>
      {tabs.slice(middle)}
    </View>
  );
}

const makeStyles = ({ colors, typography }: Theme) =>
  StyleSheet.create({
    bar: {
      flexDirection: 'row',
      backgroundColor: colors.surface,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.border,
      paddingTop: 8,
    },
    tab: { flex: 1, alignItems: 'center', gap: 2 },
    label: { ...typography.caption, fontSize: 11 },
    labelFocused: { fontWeight: '700' },
    dot: { width: 4, height: 4, borderRadius: 2, marginTop: 1 },
    fabSlot: { flex: 1, alignItems: 'center' },
    fab: {
      width: FAB_SIZE,
      height: FAB_SIZE,
      borderRadius: FAB_SIZE / 2,
      marginTop: -FAB_SIZE / 2,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: '#B38B00',
      shadowOpacity: 0.35,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 4 },
      elevation: 6,
    },
  });
