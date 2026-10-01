import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import { HubConnection, HubConnectionBuilder, HubConnectionState, LogLevel } from '@microsoft/signalr';
import { useQueryClient } from '@tanstack/react-query';
import { API_URL, getFreshAccessToken } from '../api/client';
import { useAuth } from '../auth/AuthProvider';
import { budgetKeys } from '../hooks/useBudget';
import { transactionKeys } from '../hooks/useTransactions';
import { showToast } from '../components/Toast';

// 실시간 반영: 같은 가계부 멤버가 기록·수정하면 서버가 "changed" 신호를 보내고, 해당 조회만 다시 가져온다.
// 신호에는 데이터가 없다 (보는 권한은 매번 API가 확인). 앱이 꺼져 있을 때는 푸시 알림(src/notifications).
// 다른 멤버가 내역을 바꾸면 화면 위에 작은 안내 (연속 변경은 한 번으로 묶음, 내 변경은 안내 안 함)
type ChangedKind = 'transactions' | 'budget' | 'household' | 'receipts';

export function useRealtime() {
  const queryClient = useQueryClient();
  const { status, me, refreshMe } = useAuth();
  const householdId = me?.household.id;
  const connectionRef = useRef<HubConnection | null>(null);
  // 신호 처리에서 최신 함수를 쓰도록 (연결을 다시 만들지 않게)
  const refreshMeRef = useRef(refreshMe);
  refreshMeRef.current = refreshMe;
  const meRef = useRef(me);
  meRef.current = me;
  const burst = useRef<{ by: number; count: number; at: number } | null>(null);

  useEffect(() => {
    if (status !== 'signedIn' || householdId === undefined || !API_URL) return;

    const connection = new HubConnectionBuilder()
      .withUrl(`${API_URL}/hubs/household`, {
        accessTokenFactory: async () => (await getFreshAccessToken()) ?? '',
        // 쿠키가 아니라 토큰으로 인증한다. 기본값(true)이면 브라우저(웹 미리보기)에서 CORS로 막힌다
        withCredentials: false,
      })
      .withAutomaticReconnect()
      .configureLogging(LogLevel.Warning)
      .build();
    connectionRef.current = connection;

    const refetchAll = () => {
      void queryClient.invalidateQueries({ queryKey: transactionKeys.all });
      void queryClient.invalidateQueries({ queryKey: budgetKeys.all });
    };

    const announce = (by: number) => {
      const current = meRef.current;
      if (!current || by === current.user.id) return;
      const name = current.household.members.find((m) => m.userId === by)?.nickname ?? '함께 쓰는 사람';
      const now = Date.now();
      const b = burst.current && burst.current.by === by && now - burst.current.at < 4000
        ? { by, count: burst.current.count + 1, at: now } : { by, count: 1, at: now };
      burst.current = b;
      showToast(b.count > 1 ? `${name}님이 내역 ${b.count}건을 바꿨어요` : `${name}님이 내역을 바꿨어요 🐷`);
    };

    connection.on('changed', (message: { kind: ChangedKind; by?: number | null }) => {
      switch (message.kind) {
        case 'transactions':
          void queryClient.invalidateQueries({ queryKey: transactionKeys.all });
          if (message.by) announce(message.by);
          break;
        case 'budget':
          void queryClient.invalidateQueries({ queryKey: budgetKeys.all });
          break;
        case 'household':
          // 멤버·이름·닉네임이 바뀜. 내가 내보내졌으면 가계부가 바뀌어 이 연결은 다시 만들어진다
          refreshMeRef.current().catch(() => {});
          break;
        case 'receipts':
          void queryClient.invalidateQueries({ queryKey: ['receipts'] });
          break;
      }
    });

    // 연결(재연결)된 직후: 끊겨 있던 동안의 변경을 놓쳤을 수 있으니 한 번 다시 조회.
    // Ping 응답 = 서버가 이 연결을 가계부 그룹에 넣은 뒤 → 그때부터 신호를 놓치지 않는다
    const afterConnected = async () => {
      try {
        await connection.invoke('Ping');
      } catch {
        // 무시: 다음 신호나 화면 복귀 때 갱신됨
      }
      refetchAll();
    };
    connection.onreconnected(() => void afterConnected());

    let stopped = false;
    const start = async () => {
      if (stopped || connection.state !== HubConnectionState.Disconnected) return;
      try {
        await connection.start();
        await afterConnected();
      } catch {
        // 서버에 못 붙음: 앱 복귀 때 다시 시도 (화면 조회는 따로 연결 안내를 보여준다)
      }
    };

    // 백그라운드에서는 끊고(배터리), 돌아오면 다시 연결
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') void start();
      else if (state === 'background') void connection.stop();
    });
    void start();

    return () => {
      stopped = true;
      sub.remove();
      connection.off('changed');
      void connection.stop();
      connectionRef.current = null;
    };
  }, [status, householdId, queryClient]);
}
