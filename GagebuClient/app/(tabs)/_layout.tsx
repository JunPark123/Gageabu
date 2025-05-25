import { Tabs } from 'expo-router';
import React from 'react';
import { Platform } from 'react-native';

import { HapticTab } from '@/components/HapticTab';
import { IconSymbol } from '@/components/ui/IconSymbol';
import TabBarBackground from '@/components/ui/TabBarBackground';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { MaterialIcons } from '@expo/vector-icons';
import Constants from 'expo-constants';

export default function TabLayout() {
  const colorScheme = useColorScheme();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#000000', // 선택된 탭 색상 //Colors[colorScheme ?? 'light'].tint,
        tabBarInactiveTintColor: '#bcbbba',  // 선택안된 탭 색상

        headerShown: false,

        tabBarButton: HapticTab,
        //tabBarBackground: TabBarBackground,
        tabBarStyle: {backgroundColor: '#ffffff'}
        /*{
          Platform.select({
            ios: {
              // Use a transparent background on iOS to show the blur effect
              // position: 'absolute',
              backgroundColor: '#ffffff',
            },
            android: {
              backgroundColor: '#f5f5f5',
              elevation: 8,  // Android 그림자
            },
            default: {
              backgroundColor: '#ffffff',
            },
          })
        }*/
      }}>
      <Tabs.Screen
        name='index'
        options={{
          title: ' ',
          headerStyle: { backgroundColor: '#fff', height: 80 }, // 헤더 배경을 흰색

          headerShadowVisible: false, // 그림자 제거
          tabBarLabel: 'Home',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="house.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: 'Explore',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="paperplane.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="add"
        options={{
          title: ' ',               // 헤더 타이틀
          headerStyle: { backgroundColor: '#fff' }, // 헤더 배경을 흰색
          headerShadowVisible: false, // 그림자 제거
          tabBarLabel: 'Add',         // 탭 라벨
          tabBarIcon: ({ color }) => (
            <MaterialIcons
              size={28}
              name="shopping-cart"  // 매핑된 아이콘 이름 (SF Symbols / MaterialIcons)
              color={color}
            />
          ),
        }}
      />
    </Tabs>
  );
}
