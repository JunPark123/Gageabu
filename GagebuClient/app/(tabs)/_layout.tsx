import { Tabs } from 'expo-router';
import { TabBar } from '@/src/components/TabBar';
import { TransactionSheetProvider, useTransactionSheet } from '@/src/features/transactions/TransactionSheetProvider';
import { useAndroidBackExit } from '@/src/hooks/useAndroidBackExit';
import { useMigrateLocalBudget } from '@/src/hooks/useBudget';
import { useRealtime } from '@/src/realtime/useRealtime';
import { MonthProvider } from '@/src/store/month';
import { useTheme } from '@/src/theme/ThemeProvider';

export default function TabLayout() {
  return (
    <MonthProvider>
      <TransactionSheetProvider>
        <TabsWithFab />
      </TransactionSheetProvider>
    </MonthProvider>
  );
}

function TabsWithFab() {
  const { openAddMenu } = useTransactionSheet();
  const { colors } = useTheme();
  useAndroidBackExit();
  useMigrateLocalBudget(); // 옛 버전이 폰에 저장한 예산을 한 번 서버로
  useRealtime(); // 같은 가계부 멤버의 변경을 바로 반영
  return (
    <Tabs
      // 탭 전환: 살짝 밀리며 나타나기, 전환 중 배경이 흰색으로 비치지 않게
      screenOptions={{ headerShown: false, animation: 'shift', sceneStyle: { backgroundColor: colors.background } }}
      tabBar={(props) => <TabBar {...props} onAdd={openAddMenu} />}>
      <Tabs.Screen name="index" options={{ title: '홈' }} />
      <Tabs.Screen name="history" options={{ title: '내역' }} />
      <Tabs.Screen name="stats" options={{ title: '통계' }} />
      <Tabs.Screen name="settings" options={{ title: '설정' }} />
    </Tabs>
  );
}
