import { Tabs } from 'expo-router';
import { TabBar } from '@/src/components/TabBar';
import { TransactionSheetProvider, useTransactionSheet } from '@/src/features/transactions/TransactionSheetProvider';
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
  return (
    <Tabs screenOptions={{ headerShown: false }} tabBar={(props) => <TabBar {...props} onAdd={openCreate} />}>
      <Tabs.Screen name="index" options={{ title: '홈' }} />
      <Tabs.Screen name="history" options={{ title: '내역' }} />
      <Tabs.Screen name="stats" options={{ title: '통계' }} />
      <Tabs.Screen name="settings" options={{ title: '설정' }} />
    </Tabs>
  );
}
