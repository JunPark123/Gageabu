import { PropsWithChildren, useEffect, useRef, useState } from 'react';
import { Animated, Easing, KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Theme, useTheme, useThemedStyles } from '../theme/ThemeProvider';

interface BottomSheetProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
}

// 아래에서 올라오는 시트. 바깥(어두운 영역)을 누르거나, X를 누르거나, 손잡이를 아래로 끌면 닫힌다
export function BottomSheet({ visible, onClose, title, children }: PropsWithChildren<BottomSheetProps>) {
  const styles = useThemedStyles(makeStyles);
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const progress = useRef(new Animated.Value(0)).current;
  const drag = useRef(new Animated.Value(0)).current; // 손잡이를 끌어내린 거리
  const [mounted, setMounted] = useState(visible);

  useEffect(() => {
    if (visible) {
      drag.setValue(0);
      setMounted(true);
      Animated.timing(progress, { toValue: 1, duration: 260, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
    } else {
      Animated.timing(progress, { toValue: 0, duration: 200, easing: Easing.in(Easing.cubic), useNativeDriver: true })
        .start(() => setMounted(false));
    }
  }, [visible, progress, drag]);

  // 손잡이·제목 영역을 아래로 끌기: 충분히 내리거나 빠르게 튕기면 닫고, 아니면 제자리로
  const dragToClose = Gesture.Pan()
    .runOnJS(true)
    .activeOffsetY(8)
    .onUpdate((e) => drag.setValue(Math.max(0, e.translationY)))
    .onEnd((e) => {
      if (e.translationY > 120 || e.velocityY > 900) {
        onClose();
      } else {
        Animated.spring(drag, { toValue: 0, useNativeDriver: true, bounciness: 4 }).start();
      }
    });

  if (!mounted) return null;

  const translateY = Animated.add(progress.interpolate({ inputRange: [0, 1], outputRange: [800, 0] }), drag);

  return (
    <Modal transparent visible animationType="none" onRequestClose={onClose} statusBarTranslucent>
      {/* Android는 Modal 안에서 제스처를 쓰려면 루트가 따로 필요 */}
      <GestureHandlerRootView style={{ flex: 1 }}>
        <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <Animated.View style={[styles.overlay, { opacity: progress }]}>
            <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="닫기" />
          </Animated.View>
          <Animated.View style={[styles.sheet, { paddingBottom: insets.bottom + 12, transform: [{ translateY }] }]}>
            <GestureDetector gesture={dragToClose}>
              <View accessibilityHint="아래로 끌면 닫혀요">
                <View style={styles.handleArea}>
                  <View style={styles.handle} />
                </View>
                {title !== undefined && (
                  <View style={styles.header}>
                    <Text style={styles.title}>{title}</Text>
                    <Pressable onPress={onClose} hitSlop={12} accessibilityLabel="닫기">
                      <MaterialCommunityIcons name="close" size={24} color={colors.text} />
                    </Pressable>
                  </View>
                )}
              </View>
            </GestureDetector>
            {children}
          </Animated.View>
        </KeyboardAvoidingView>
      </GestureHandlerRootView>
    </Modal>
  );
}

const makeStyles = ({ colors, radius, spacing, typography }: Theme) =>
  StyleSheet.create({
    container: { flex: 1, justifyContent: 'flex-end' },
    overlay: { ...StyleSheet.absoluteFill, backgroundColor: colors.overlay },
    sheet: {
      maxHeight: '94%',
      backgroundColor: colors.surface,
      borderTopLeftRadius: radius.xl,
      borderTopRightRadius: radius.xl,
      paddingHorizontal: spacing.lg,
    },
    handleArea: { alignItems: 'center', paddingTop: spacing.sm, paddingBottom: spacing.md }, // 잡기 쉽게 넓은 영역
    handle: {
      width: 40,
      height: 5,
      borderRadius: 3,
      backgroundColor: colors.textTertiary,
      opacity: 0.6,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: spacing.md,
    },
    title: { ...typography.heading, color: colors.text },
  });
