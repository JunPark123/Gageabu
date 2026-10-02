import React from 'react';
import { useRefreshOnFocus } from '../useTransactions';

const { act, create } = require('react-test-renderer');
let mockFocused = true;
jest.mock('expo-router/react-navigation', () => ({
  useFocusEffect: (callback: () => void) => {
    const { useEffect } = require('react');
    useEffect(() => { if (mockFocused) return callback(); }, [callback, mockFocused]);
  },
}));
jest.mock('../../api/transactions', () => ({}));

describe('refreshing paged screens on focus', () => {
  it('does not refetch on month swipes, but refreshes the selected page on tab return', () => {
    const refetch = jest.fn();
    function Page({ selected }: { selected: boolean }) {
      useRefreshOnFocus(refetch, selected);
      return null;
    }
    let renderer: ReturnType<typeof create>;
    act(() => { renderer = create(<Page selected={false} />); });
    act(() => renderer.update(<Page selected />));
    act(() => renderer.update(<Page selected={false} />));
    act(() => renderer.update(<Page selected />));
    expect(refetch).not.toHaveBeenCalled();
    mockFocused = false;
    act(() => renderer.update(<Page selected />));
    mockFocused = true;
    act(() => renderer.update(<Page selected />));
    expect(refetch).toHaveBeenCalledTimes(1);
    mockFocused = false;
    act(() => renderer.update(<Page selected={false} />));
    mockFocused = true;
    act(() => renderer.update(<Page selected={false} />));
    expect(refetch).toHaveBeenCalledTimes(1);
    act(() => renderer.unmount());
  });
});
