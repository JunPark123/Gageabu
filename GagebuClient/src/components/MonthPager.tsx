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
// 웹은 좌우로 넘기는 목록 없이 선택한 달 한 페이지만 보여준다.
// 아이폰 사파리가 가로 스크롤 위치를 스스로 바꿔 달이 계속 넘어가는 문제가 있어서, 웹에서는 화살표·월 선택으로만 달을 바꾼다
export function MonthPager(props: MonthPagerProps) {
  return Platform.OS === 'web' ? <SingleMonthPage {...props} /> : <SwipeMonthPager {...props} />;
}

function SingleMonthPage({ renderPage }: MonthPagerProps) {
  const { year, monthIndex } = useSelectedMonth();
  // 달이 바뀌면 새 페이지로 (스크롤 위치·애니메이션도 처음부터)
  return <View key={`${year}-${monthIndex}`} style={{ flex: 1 }}>{renderPage(year, monthIndex, true)}</View>;
}

function SwipeMonthPager({ renderPage }: MonthPagerProps) {
  const { year, monthIndex, setMonth } = useSelectedMonth();
  const { width } = useWindowDimensions();
  const listRef = useRef<FlatList<number>>(null);
  // 페이지 높이를 목록 높이로 직접 지정: 웹은 가로 목록 안의 페이지가 내용 길이만큼 늘어나 세로 스크롤이 생기지 않았다
  const [pageHeight, setPageHeight] = useState(0);
  // 페이지 폭은 창 폭이 아니라 목록의 실제 폭 (아이폰 사파리는 둘이 소수점만큼 달라, 먼 달에서 위치→달 계산이 한 칸 어긋났다)
  const [pageWidth, setPageWidth] = useState(width);
  // 웹: 사용자가 손가락·마우스로 직접 넘긴 직후의 스크롤만 '달 바꾸기'로 인정한다.
  // 아이폰 사파리는 스냅 보정·화면 크기 변화로 스스로 스크롤 이벤트를 내는데, 그걸 따르면 달이 계속 -1씩 바뀌었다
  const lastUserScroll = useRef(0);
  const markUserScroll = () => { lastUserScroll.current = Date.now(); };
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
  }, [focused, pageWidth, targetIndex]);

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

  // 실제 폭을 잰 뒤(또는 화면 회전 등으로 폭이 바뀌면) 선택한 달 위치로 다시 맞춘다
  useEffect(() => {
    if (!focused) return;
    listRef.current?.scrollToIndex({ index: shownIndex.current, animated: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 폭이 바뀔 때만
  }, [pageWidth]);

  // 탭으로 돌아오면 숨어 있던 동안 바뀐 달로 위치를 맞춘다
  useEffect(() => {
    if (!focused) return;
    shownIndex.current = targetIndex;
    listRef.current?.scrollToIndex({ index: targetIndex, animated: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 포커스가 바뀔 때만
  }, [focused]);

  // 가로 스크롤이 멈추면 그 페이지의 달로 (웹은 momentum 이벤트가 없어서 스크롤이 잠시 멈춘 걸로 판단)
  const settle = (x: number) => {
    if (!focused || pageWidth <= 0) return;
    const index = Math.round(x / pageWidth);
    if (Platform.OS === 'web' && Date.now() - lastUserScroll.current > 1500) {
      // 사용자가 넘긴 게 아닌데 위치가 다른 달로 어긋났으면 선택한 달로 되돌린다 (달은 바꾸지 않음)
      if (index !== shownIndex.current) listRef.current?.scrollToIndex({ index: shownIndex.current, animated: false });
      return;
    }
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
      onLayout={(e) => {
        setPageHeight(e.nativeEvent.layout.height);
        if (e.nativeEvent.layout.width > 0) setPageWidth(e.nativeEvent.layout.width);
      }}
      onTouchStart={markUserScroll}
      onTouchMove={markUserScroll}
      onTouchEnd={markUserScroll}
      {...(Platform.OS === 'web' ? { onMouseDown: markUserScroll, onWheel: markUserScroll } : {})}
      data={months}
      keyExtractor={String}
      horizontal
      pagingEnabled
      showsHorizontalScrollIndicator={false}
      getItemLayout={(_, index) => ({ length: pageWidth, offset: pageWidth * index, index })}
      initialScrollIndex={targetIndex}
      initialNumToRender={1}
      maxToRenderPerBatch={2}
      windowSize={3} // 지금 달 + 앞뒤 한 달씩만 그려 둠
      onScroll={Platform.OS === 'web' ? onScroll : undefined}
      onMomentumScrollEnd={(e) => settle(e.nativeEvent.contentOffset.x)}
      scrollEventThrottle={32}
      extraData={`${selected}:${pageHeight}:${pageWidth}`}
      renderItem={({ item }) => (
        <View style={pageHeight > 0 ? { width: pageWidth, height: pageHeight } : { width: pageWidth, flex: 1 }} aria-hidden={item !== selected} accessibilityElementsHidden={item !== selected} importantForAccessibility={item === selected ? 'auto' : 'no-hide-descendants'}>{renderPage(Math.floor(item / 12), item % 12, item === selected)}</View>
      )}
    />
  );
}
