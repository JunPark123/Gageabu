import React from 'react';
import { MonthPageScroll } from '../Screen';

const { act, create } = require('react-test-renderer');
const mockScrollTo = jest.fn();
jest.mock('react-native', () => {
  const React = require('react');
  return {
    ScrollView: React.forwardRef((props: object, ref: unknown) => {
      React.useImperativeHandle(ref, () => ({ scrollTo: mockScrollTo }));
      return React.createElement('scroll-view', props);
    }),
    StyleSheet: { create: (styles: object) => styles },
    Platform: { OS: 'web' },
  };
});
// 탭 이동 감지는 내비게이션이 필요해 이 단위 테스트에서는 빼 둔다
jest.mock('../../lib/tabLeave', () => ({ useScrollTopOnTabLeave: () => {} }));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0 }) }));
jest.mock('../../theme/ThemeProvider', () => ({ useTheme: () => ({ colors: {}, spacing: { xs: 4, xl: 20, xxl: 28 } }) }));

it('resets an offscreen month and its return, without resetting on ordinary updates', () => {
  let renderer: ReturnType<typeof create>;
  act(() => { renderer = create(<MonthPageScroll isCurrent>First</MonthPageScroll>); });
  mockScrollTo.mockClear();
  act(() => renderer.update(<MonthPageScroll isCurrent>Updated data</MonthPageScroll>));
  expect(mockScrollTo).not.toHaveBeenCalled();
  act(() => renderer.update(<MonthPageScroll isCurrent={false}>Updated data</MonthPageScroll>));
  expect(mockScrollTo).toHaveBeenLastCalledWith({ y: 0, animated: false });
  mockScrollTo.mockClear();
  act(() => renderer.update(<MonthPageScroll isCurrent>Updated data</MonthPageScroll>));
  expect(mockScrollTo).toHaveBeenCalledTimes(1);
  expect(mockScrollTo).toHaveBeenCalledWith({ y: 0, animated: false });
  act(() => renderer.unmount());
});
