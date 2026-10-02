import { ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, NativeScrollEvent, NativeSyntheticEvent, Platform, useWindowDimensions, View } from 'react-native';
import { useIsFocused } from 'expo-router';
import { FIRST_MONTH, lastSelectableMonth } from '../lib/monthRange';
import { useSelectedMonth } from '../store/month';

// 넘길 수 있는 범위: 2000년 1월 ~ 이번 달 + 5년
const FIRST = FIRST_MONTH;

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
  // 페이지 높이를 목록 높이로 직접 지정: 웹은 가로 목록 안의 페이지가 내용 길이만큼 늘어나 세로 스크롤이 생기지 않았다
  const [pageHeight, setPageHeight] = useState(0);
  // 숨겨진 탭(웹은 display:none)의 목록은 스크롤 위치를 0으로 알려 와 2000년 1월로 바뀌던 문제 → 보이는 탭만 달을 바꾼다
  const focused = useIsFocused();

  const last = lastSelectableMonth();
  const months = useMemo(() => Array.from({ length: last - FIRST + 1 }, (_, i) => FIRST + i), [last]);

  const selected = year * 12 + monthIndex;
  const targetIndex = Math.min(Math.max(selected - FIRST, 0), months.length - 1);
  const shownIndex = useRef(targetIndex); // 지금 화면에 멈춰 있는 페이지
  const settleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (settleTimer.current) clearTimeout(settleTimer.current);
  }, [focused, width, targetIndex]);

  // 바깥(화살표·월 선택·다른 탭)에서 달이 바뀌면 그 페이지로. 한 달 차이면 넘기는 모습을 보여줌
  useEffect(() => {
    // 숨겨진 탭까지 스크롤하면 그 탭의 옆 페이지 마운트·조회도 동시에 발생한다.
    // 복귀 시 아래 포커스 효과가 선택한 달로 한 번에 맞춘다.
    if (!focused) return;
    if (shownIndex.current === targetIndex) return;
    const animated = Math.abs(shownIndex.current - targetIndex) === 1;
    shownIndex.current = targetIndex;
    listRef.current?.scrollToIndex({ index: targetIndex, animated });
  }, [targetIndex]);

  // 탭으로 돌아오면 숨어 있던 동안 바뀐 달로 위치를 맞춘다
  useEffect(() => {
    if (!focused) return;
    shownIndex.current = targetIndex;
    listRef.current?.scrollToIndex({ index: targetIndex, animated: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 포커스가 바뀔 때만
  }, [focused]);

  // 가로 스크롤이 멈추면 그 페이지의 달로 (웹은 momentum 이벤트가 없어서 스크롤이 잠시 멈춘 걸로 판단)
  const settle = (x: number) => {
    if (!focused || width <= 0) return;
    const index = Math.round(x / width);
    if (index === shownIndex.current || index < 0 || index >= months.length) return;
    shownIndex.current = index;
    const m = months[index];
    setMonth(Math.floor(m / 12), m % 12);
  };

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const x = e.nativeEvent.contentOffset.x;
    if (settleTimer.current) clearTimeout(settleTimer.current);
    settleTimer.current = setTimeout(() => settle(x), 90);
  };

  return (
    <FlatList
      ref={listRef}
      style={{ flex: 1 }}
      onLayout={(e) => setPageHeight(e.nativeEvent.layout.height)}
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
      onScroll={Platform.OS === 'web' ? onScroll : undefined}
      onMomentumScrollEnd={(e) => settle(e.nativeEvent.contentOffset.x)}
      scrollEventThrottle={32}
      extraData={`${selected}:${pageHeight}`}
      renderItem={({ item }) => (
        <View style={pageHeight > 0 ? { width, height: pageHeight } : { width, flex: 1 }} aria-hidden={item !== selected} accessibilityElementsHidden={item !== selected} importantForAccessibility={item === selected ? 'auto' : 'no-hide-descendants'}>{renderPage(Math.floor(item / 12), item % 12, item === selected)}</View>
      )}
    />
  );
}
