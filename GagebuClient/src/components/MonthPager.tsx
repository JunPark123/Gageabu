import { ReactNode, useEffect, useMemo, useRef } from 'react';
import { FlatList, NativeScrollEvent, NativeSyntheticEvent, useWindowDimensions, View } from 'react-native';
import { toKst } from '../lib/date';
import { useSelectedMonth } from '../store/month';

// 넘길 수 있는 범위: 2000년 1월 ~ 이번 달 + 5년
const FIRST = 2000 * 12;
const MONTHS_AHEAD = 60;

interface MonthPagerProps {
  // 한 달 페이지. isCurrent: 지금 화면 가운데 있는 달인지 (포커스 시 새로고침 등은 이 달만)
  renderPage: (year: number, monthIndex: number, isCurrent: boolean) => ReactNode;
}

// 달별 페이지를 가로로 이어 붙인 목록. 손가락으로 넘기면 옆 달이 같이 보이며 들어온다
// (폰 기본 가로 페이지 스크롤을 써서 부드럽고, 이전·다음 달 페이지는 미리 그려 둠)
// 선택한 달은 홈·내역·통계가 공유 — 화살표·월 선택·다른 탭에서 바꿔도 이 목록이 그 달로 이동
export function MonthPager({ renderPage }: MonthPagerProps) {
  const { year, monthIndex, setMonth } = useSelectedMonth();
  const { width } = useWindowDimensions();
  const listRef = useRef<FlatList<number>>(null);

  const last = useMemo(() => {
    const now = toKst();
    return now.year() * 12 + now.month() + MONTHS_AHEAD;
  }, []);
  const months = useMemo(() => Array.from({ length: last - FIRST + 1 }, (_, i) => FIRST + i), [last]);

  const selected = year * 12 + monthIndex;
  const targetIndex = Math.min(Math.max(selected - FIRST, 0), months.length - 1);
  const shownIndex = useRef(targetIndex); // 지금 화면에 멈춰 있는 페이지
  const settleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 바깥(화살표·월 선택·다른 탭)에서 달이 바뀌면 그 페이지로. 한 달 차이면 넘기는 모습을 보여줌
  useEffect(() => {
    if (shownIndex.current === targetIndex) return;
    const animated = Math.abs(shownIndex.current - targetIndex) === 1;
    shownIndex.current = targetIndex;
    listRef.current?.scrollToIndex({ index: targetIndex, animated });
  }, [targetIndex]);

  // 가로 스크롤이 멈추면 그 페이지의 달로 (웹은 momentum 이벤트가 없어서 스크롤이 잠시 멈춘 걸로 판단)
  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const x = e.nativeEvent.contentOffset.x;
    if (settleTimer.current) clearTimeout(settleTimer.current);
    settleTimer.current = setTimeout(() => {
      const index = Math.round(x / width);
      if (index === shownIndex.current || index < 0 || index >= months.length) return;
      shownIndex.current = index;
      const m = months[index];
      setMonth(Math.floor(m / 12), m % 12);
    }, 90);
  };

  return (
    <FlatList
      ref={listRef}
      style={{ flex: 1 }}
      data={months}
      keyExtractor={String}
      horizontal
      pagingEnabled
      showsHorizontalScrollIndicator={false}
      getItemLayout={(_, index) => ({ length: width, offset: width * index, index })}
      initialScrollIndex={targetIndex}
      initialNumToRender={1}
      maxToRenderPerBatch={2}
      windowSize={3} // 지금 달 + 앞뒤 한 달씩만 그려 둠
      onScroll={onScroll}
      scrollEventThrottle={32}
      extraData={selected}
      renderItem={({ item }) => (
        <View style={{ width, flex: 1 }}>{renderPage(Math.floor(item / 12), item % 12, item === selected)}</View>
      )}
    />
  );
}
