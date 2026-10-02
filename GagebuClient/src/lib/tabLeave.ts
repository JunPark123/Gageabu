import { RefObject, useEffect } from 'react';
import type { ScrollView } from 'react-native';
import { useRoute } from 'expo-router/react-navigation';

// 하단 탭으로 다른 메뉴로 옮길 때, 떠나는 탭의 화면을 맨 위로 되돌린다 (돌아오면 처음 상태).
// 탭 위에 열린 화면(설정 → 프로필 등)에서 돌아올 때는 그대로 둔다 — 그래서 '가려짐'이 아니라 탭 이동만 신호로 씀
type Listener = () => void;
const listeners = new Map<string, Set<Listener>>();

export function emitTabLeave(routeName: string) {
  listeners.get(routeName)?.forEach((l) => l());
}

export function useScrollTopOnTabLeave(ref: RefObject<ScrollView | null>) {
  const routeName = useRoute().name;
  useEffect(() => {
    const listener = () => ref.current?.scrollTo({ y: 0, animated: false });
    const set = listeners.get(routeName) ?? new Set<Listener>();
    set.add(listener);
    listeners.set(routeName, set);
    return () => { set.delete(listener); };
  }, [routeName, ref]);
}
