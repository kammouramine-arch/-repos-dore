import { describe, expect, it } from 'vitest';
import { isTabBarSwipe, tabSwipeDestination, scrubSlot } from '../../mobile/src/lib/tab-navigation';

describe('finger-following tab selection', () => {
  it('selects the tab under the finger, including non-adjacent tabs', () => {
    expect(scrubSlot(20, 400)).toBe(0);
    expect(scrubSlot(100, 400)).toBe(1);
    expect(scrubSlot(290, 400)).toBe(3);
    expect(scrubSlot(399, 400)).toBe(4);
  });
  it('never invokes the central quote action while scrubbing', () => {
    expect(scrubSlot(180, 400)).toBe(1);
    expect(scrubSlot(220, 400)).toBe(3);
  });
  it('clamps edges and rejects invalid layout values', () => {
    expect(scrubSlot(-20, 400)).toBe(0);
    expect(scrubSlot(500, 400)).toBe(4);
    expect(scrubSlot(NaN, 400)).toBeNull();
    expect(scrubSlot(20, 0)).toBeNull();
  });
});

describe('bottom navigation gestures', () => {
  it('moves through content tabs without opening the quote action', () => {
    expect(tabSwipeDestination('/', -60)).toBe('/(app)/prospects');
    expect(tabSwipeDestination('/prospects', -60)).toBe('/(app)/clients');
    expect(tabSwipeDestination('/clients', 60)).toBe('/(app)/prospects');
  });
  it('does not wrap at either edge or redirect hidden screens', () => {
    expect(tabSwipeDestination('/', 60)).toBeNull();
    expect(tabSwipeDestination('/plus', -60)).toBeNull();
    expect(tabSwipeDestination('/devis', -60)).toBeNull();
  });
  it('ignores small movements and invalid values', () => {
    expect(tabSwipeDestination('/', -30)).toBeNull();
    expect(tabSwipeDestination('/', NaN)).toBeNull();
  });
  const gesture = { startY: 755, currentY: 755, height: 844, barHeight: 98, dx: 50, dy: 4 };
  it('accepts a horizontal drag inside the actual safe-area-aware bar', () => {
    expect(isTabBarSwipe(gesture)).toBe(true);
  });
  it('leaves content, taps and vertical scrolling alone', () => {
    expect(isTabBarSwipe({ ...gesture, startY: 700 })).toBe(false);
    expect(isTabBarSwipe({ ...gesture, currentY: 700 })).toBe(false);
    expect(isTabBarSwipe({ ...gesture, dx: 10 })).toBe(false);
    expect(isTabBarSwipe({ ...gesture, dy: 40 })).toBe(false);
  });
});
