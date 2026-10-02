import { useEffect, useRef } from 'react';
import { NativeScrollEvent, NativeSyntheticEvent, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Theme, useThemedStyles } from '../theme/ThemeProvider';

export const WHEEL_ITEM_HEIGHT = 40;
const VISIBLE = 5; // 위아래 두 줄씩 + 가운데 선택 줄

export interface WheelItem<T> {
  value: T;
  label: string;
}

// 아이폰 스타일 휠: 위아래로 굴려 가운데 줄에 멈춘 값이 선택된다 (줄을 눌러도 선택)
export function WheelPicker<T extends string | number>({ items, value, onChange, width, accessibilityLabel }: {
  items: WheelItem<T>[];
  value: T;
  onChange: (value: T) => void;
  width?: number;
  accessibilityLabel: string;
}) {
  const styles = useThemedStyles(makeStyles);
  const ref = useRef<ScrollView>(null);
  const index = Math.max(0, items.findIndex((i) => i.value === value));
  const shownIndex = useRef(index);
  const settleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const ready = useRef(false);

  // 바깥에서 값이 바뀌면(지금 버튼, 달력 선택, 말일 보정) 그 줄로
  useEffect(() => {
    if (shownIndex.current === index && ready.current) return;
    shownIndex.current = index;
    ref.current?.scrollTo({ y: index * WHEEL_ITEM_HEIGHT, animated: ready.current });
    ready.current = true;
  }, [index]);

  const settle = (y: number) => {
    const next = Math.min(items.length - 1, Math.max(0, Math.round(y / WHEEL_ITEM_HEIGHT)));
    if (next !== shownIndex.current) {
      shownIndex.current = next;
      onChange(items[next].value);
    }
    // 줄 사이에 멈췄으면 가운데로 맞춤 (웹은 snap이 약함)
    if (Math.abs(y - next * WHEEL_ITEM_HEIGHT) > 1) ref.current?.scrollTo({ y: next * WHEEL_ITEM_HEIGHT, animated: true });
  };

  // 폰은 관성이 끝날 때, 웹은 스크롤이 잠시 멈췄을 때
  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (Platform.OS !== 'web') return;
    const y = e.nativeEvent.contentOffset.y;
    if (settleTimer.current) clearTimeout(settleTimer.current);
    settleTimer.current = setTimeout(() => settle(y), 120);
  };

  return (
    <View style={[styles.wheel, width ? { width } : { flex: 1 }]} accessibilityLabel={`${accessibilityLabel} ${items[index]?.label ?? ''}`}>
      {/* 가운데 선택 줄 표시 */}
      <View pointerEvents="none" style={styles.band} />
      <ScrollView
        ref={ref}
        showsVerticalScrollIndicator={false}
        snapToInterval={WHEEL_ITEM_HEIGHT}
        decelerationRate="fast"
        nestedScrollEnabled
        contentContainerStyle={{ paddingVertical: WHEEL_ITEM_HEIGHT * ((VISIBLE - 1) / 2) }}
        onMomentumScrollEnd={(e) => settle(e.nativeEvent.contentOffset.y)}
        onScrollEndDrag={(e) => { if (Platform.OS !== 'web' && !e.nativeEvent.velocity?.y) settle(e.nativeEvent.contentOffset.y); }}
        onScroll={onScroll}
        scrollEventThrottle={32}
      >
        {items.map((item, i) => {
          const selected = i === index;
          return (
            <Pressable key={String(item.value)} onPress={() => { shownIndex.current = -1; settle(i * WHEEL_ITEM_HEIGHT); ref.current?.scrollTo({ y: i * WHEEL_ITEM_HEIGHT, animated: true }); }} style={styles.item} accessibilityRole="button" accessibilityState={{ selected }}>
              <Text style={[styles.text, selected ? styles.textSelected : Math.abs(i - index) > 1 && styles.textFar]}>{item.label}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const makeStyles = ({ colors, radius, typography }: Theme) =>
  StyleSheet.create({
    wheel: { height: WHEEL_ITEM_HEIGHT * VISIBLE, overflow: 'hidden' },
    band: {
      position: 'absolute',
      left: 2,
      right: 2,
      top: WHEEL_ITEM_HEIGHT * ((VISIBLE - 1) / 2),
      height: WHEEL_ITEM_HEIGHT,
      borderRadius: radius.md,
      backgroundColor: colors.primarySoft,
    },
    item: { height: WHEEL_ITEM_HEIGHT, alignItems: 'center', justifyContent: 'center' },
    text: { ...typography.body, fontSize: 17, color: colors.textSecondary, fontVariant: ['tabular-nums'] },
    textSelected: { fontWeight: '800', fontSize: 19, color: colors.text },
    textFar: { opacity: 0.45 },
  });
