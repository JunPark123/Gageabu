import { useEffect } from 'react';
import { router } from 'expo-router';
import type { NotificationResponse } from 'expo-notifications';
import { notificationsModule, pushAvailable, registerForPush } from './push';

// 로그인된 탭 화면에서: 푸시 등록(처음엔 권한을 묻는다) + 알림을 눌러 들어오면 해당 화면으로
export function usePushNotifications() {
  useEffect(() => {
    if (!pushAvailable) return;
    void registerForPush(true);

    const Notifications = notificationsModule();
    const open = (response: NotificationResponse | null) => {
      if (!response) return;
      const kind = response.notification.request.content.data?.kind;
      router.navigate(kind === 'budget' ? '/' : '/history');
    };
    // 앱이 꺼져 있을 때 알림을 눌러 켠 경우
    Notifications.getLastNotificationResponseAsync().then(open).catch(() => {});
    const sub = Notifications.addNotificationResponseReceivedListener(open);
    return () => sub.remove();
  }, []);
}
