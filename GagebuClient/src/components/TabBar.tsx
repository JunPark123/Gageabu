import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import type { BottomTabBarProps } from 'expo-router/js-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Theme, useTheme, useThemedStyles } from '../theme/ThemeProvider';

const ICONS: Record<string, keyof typeof Feather.glyphMap> = {
  index: 'home',
  history: 'file-text',
  stats: 'pie-chart',
  settings: 'settings',
};

const FAB_SIZE = 56;

// 홈 · 내역 · [+] · 통계 · 설정 — 가운데 노란 버튼은 탭이 아니라 추가 시트를 연다
export function TabBar({ state, descriptors, navigation, onAdd }: BottomTabBarProps & { onAdd: () => void }) {
  const styles = useThemedStyles(makeStyles);
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const tabs = state.routes.map((route, index) => {
    const focused = state.index === index;
    const label = descriptors[route.key].options.title ?? route.name;
    const color = focused ? colors.primary : colors.textSecondary;
    const onPress = () => {
      const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
      if (!focused && !event.defaultPrevented) navigation.navigate(route.name, route.params);
    };
    return (
      <Pressable key={route.key} onPress={onPress} style={styles.tab} accessibilityRole="tab" accessibilityState={{ selected: focused }} accessibilityLabel={label}>
        <Feather name={ICONS[route.name] ?? 'circle'} size={21} color={color} fill={focused && route.name === 'index' ? color : 'none'} />
        <Text style={[styles.label, { color }, focused && styles.labelFocused]}>{label}</Text>
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
      borderTopWidth: 0,
      borderTopLeftRadius: 22,
      borderTopRightRadius: 22,
      paddingTop: 12,
      shadowColor: colors.shadow,
      shadowOpacity: 0.1,
      shadowRadius: 15,
      shadowOffset: { width: 0, height: -5 },
      elevation: 7,
    },
    tab: { flex: 1, alignItems: 'center', gap: 3, minHeight: 48 },
    label: { ...typography.caption, fontSize: 11 },
    labelFocused: { fontWeight: '700' },
    fabSlot: { flex: 1, alignItems: 'center' },
    fab: {
      width: FAB_SIZE,
      height: FAB_SIZE,
      borderRadius: FAB_SIZE / 2,
      marginTop: -FAB_SIZE / 3,
      backgroundColor: colors.primary,
      borderWidth: 3,
      borderColor: colors.surface,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: colors.primary,
      shadowOpacity: 0.35,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 4 },
      elevation: 6,
    },
  });
