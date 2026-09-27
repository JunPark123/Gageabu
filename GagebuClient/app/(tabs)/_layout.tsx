import { Tabs } from 'expo-router';
import { TabBar } from '@/src/components/TabBar';
import { TransactionSheetProvider, useTransactionSheet } from '@/src/features/transactions/TransactionSheetProvider';
import { useAndroidBackExit } from '@/src/hooks/useAndroidBackExit';
import { useMigrateLocalBudget } from '@/src/hooks/useBudget';
import { useRealtime } from '@/src/realtime/useRealtime';
import { MonthProvider } from '@/src/store/month';

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
  const { openCreate } = useTransactionSheet();
  useAndroidBackExit();
  useMigrateLocalBudget(); // 옛 버전이 폰에 저장한 예산을 한 번 서버로
  useRealtime(); // 같은 가계부 멤버의 변경을 바로 반영
  return (
    <Tabs screenOptions={{ headerShown: false }} tabBar={(props) => <TabBar {...props} onAdd={openCreate} />}>
      <Tabs.Screen name="index" options={{ title: '홈' }} />
      <Tabs.Screen name="history" options={{ title: '내역' }} />
      <Tabs.Screen name="stats" options={{ title: '통계' }} />
      <Tabs.Screen name="settings" options={{ title: '설정' }} />
    </Tabs>
  );
}
