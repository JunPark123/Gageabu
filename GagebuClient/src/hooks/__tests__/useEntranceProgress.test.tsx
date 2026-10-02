import React from 'react';
import { Animated } from 'react-native';
import { useEntranceProgress } from '../useEntranceProgress';
import { useReducedMotion } from '../useReducedMotion';

const { act, create } = require('react-test-renderer');
jest.mock('../useReducedMotion', () => ({ useReducedMotion: jest.fn(() => false) }));

describe('month page entrance', () => {
  let listener: (frame: { value: number }) => void;
  let renderer: ReturnType<typeof create>;
  let frames: number[];

  function Probe({ active, amount }: { active: boolean; amount: number }) {
    frames.push(useEntranceProgress(active, amount));
    return null;
  }

  beforeEach(() => {
    frames = [];
    (useReducedMotion as jest.Mock).mockReturnValue(false);
    jest.spyOn(Animated.Value.prototype, 'addListener').mockImplementation((callback) => {
      listener = callback;
      return 'test-listener';
    });
    jest.spyOn(Animated.Value.prototype, 'removeListener').mockImplementation(() => {});
    jest.spyOn(Animated, 'timing').mockReturnValue({ start: jest.fn(), stop: jest.fn(), reset: jest.fn() });
  });

  afterEach(() => {
    act(() => renderer?.unmount());
    jest.restoreAllMocks();
  });

  it('keeps a prefetched page at zero, then plays only when selected', () => {
    act(() => { renderer = create(<Probe active={false} amount={500} />); });
    expect(frames.every((value) => value === 0)).toBe(true);
    expect(Animated.timing).not.toHaveBeenCalled();
    act(() => renderer.update(<Probe active amount={500} />));
    expect(frames.at(-1)).toBe(0);
    act(() => listener({ value: 1 }));
    expect(frames.at(-1)).toBe(1);
    frames = [];
    act(() => renderer.update(<Probe active={false} amount={500} />));
    act(() => renderer.update(<Probe active amount={500} />));
    expect(frames.every((value) => value === 0)).toBe(true);
  });

  it('never paints the previous progress with newly arrived data', () => {
    act(() => { renderer = create(<Probe active amount={500} />); });
    act(() => listener({ value: 1 }));
    frames = [];
    act(() => renderer.update(<Probe active amount={900} />));
    expect(frames.every((value) => value === 0)).toBe(true);
  });

  it('shows the final value immediately when reduced motion is enabled', () => {
    (useReducedMotion as jest.Mock).mockReturnValue(true);
    act(() => { renderer = create(<Probe active={false} amount={500} />); });
    act(() => renderer.update(<Probe active amount={500} />));
    expect(frames.every((value) => value === 1)).toBe(true);
    expect(Animated.timing).not.toHaveBeenCalled();
  });
});
