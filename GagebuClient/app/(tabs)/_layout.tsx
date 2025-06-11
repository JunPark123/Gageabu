import React from 'react';
import { Tabs } from 'expo-router';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { HapticTab } from '@/components/HapticTab';
import { IconSymbol } from '@/components/ui/IconSymbol';
import TabBarBackground from '@/components/ui/TabBarBackground';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { MaterialIcons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { BottomTabBarButtonProps } from '@react-navigation/bottom-tabs';
import { Dimensions } from 'react-native';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const insets = useSafeAreaInsets();
  return (
    <Tabs
      initialRouteName="index"
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colorScheme === 'dark' ? '#fff' : '#000',
        tabBarInactiveTintColor: colorScheme === 'dark' ? '#888' : '#bcbbba',
        tabBarIconStyle: { width: 28, height: 28 },
        tabBarButton: HapticTab,
        //tabBarBackground: TabBarBackground,
        tabBarStyle: {
          backgroundColor:
            colorScheme === 'dark'
              ? Colors.dark.tabBarBackground  // 예: '#121212'
              : Colors.light.tabBarBackground, // 예: '#ffffff'
          height: 60 + insets.bottom,
          paddingBottom: insets.bottom,
          borderTopWidth: 1,
          borderTopColor: colorScheme === 'dark' ? '#333' : '#e0e0e0',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -1 },
          shadowOpacity: 0.1,
          shadowRadius: 3,
          elevation: 5,
        }
      }}>
      <Tabs.Screen
        name="index"
        options={{
          tabBarLabel: '지출',
          tabBarIcon: ({ color }) => (
            <IconSymbol size={25} name="house.fill" color={color} />
          ),          
        }}
      />
      <Tabs.Screen
        name="add"
        options={{
          tabBarLabel: '',          // 라벨은 원형 버튼으로 대체하니 비워두고
          tabBarIcon: () => null,   // 기본 아이콘 숨기기
          tabBarButton: (props) => <AddFAB {...props} />,
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          tabBarLabel: '프로필',
          tabBarIcon: ({ color }) => (
            <MaterialIcons size={25} name="person" color={color} />
          ),
        }}
      />
    </Tabs>
  );
}

const FAB_SIZE = 65;
const TAB_BAR_HEIGHT = 30;

export function AddFAB({
  onPress,
  accessibilityState,
  accessibilityLabel,
  testID,
}: BottomTabBarButtonProps) {
  const focused = accessibilityState?.selected ?? false;
  const insets = useSafeAreaInsets();

  return (
    <TouchableOpacity
      onPress={onPress}
      accessibilityState={accessibilityState}
      accessibilityLabel={accessibilityLabel}
      testID={testID}
      activeOpacity={0.7}
      style={[
        {
          position: 'absolute',
          // 탭바 높이를 반쯤 덮도록 위로 올려주세요
          bottom: insets.bottom + TAB_BAR_HEIGHT / 2 - FAB_SIZE / 2,
          // alignSelf 로 부모 넓이 중앙에
          alignSelf: 'center',
          width: FAB_SIZE,
          height: FAB_SIZE,
        },
        styles.fab,
        focused && styles.fabFocused,
      ]}
    >
      <MaterialIcons name="add" size={32} color="#fff" />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  fab: {
    borderRadius: FAB_SIZE / 2,
    backgroundColor: '#FFD740',
    justifyContent: 'center',
    alignItems: 'center',
    // iOS 그림자
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    // Android 그림자
    elevation: 5,
  },
  fabFocused: {
    // 선택됐을 때 강조 스타일 있으면 여기에
  },
});
