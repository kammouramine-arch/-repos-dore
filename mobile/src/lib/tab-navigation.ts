const paths = ['/', '/prospects', '/clients', '/plus'];
const destinations = ['/(app)', '/(app)/prospects', '/(app)/clients', '/(app)/plus'] as const;

/** Small thumb movement is a tap, not an instruction to cancel the + button. */
export function shouldCaptureTabDrag(dx: number, dy: number) {
  return Number.isFinite(dx) && Number.isFinite(dy) && Math.abs(dx) >= 20 && Math.abs(dx) > Math.abs(dy) * 2;
}

export function tabSwipeDestination(pathname: string, dx: number) {
  if (!Number.isFinite(dx) || Math.abs(dx) < 38) return null;
  const current = paths.indexOf(pathname);
  if (current < 0) return null;
  const next = current + (dx < 0 ? 1 : -1);
  return next >= 0 && next < destinations.length ? destinations[next] : null;
}

export function isTabBarSwipe(input: { startY: number; currentY: number; height: number; barHeight: number; dx: number; dy: number }) {
  return input.startY >= input.height - input.barHeight && input.currentY >= input.height - input.barHeight && Math.abs(input.dx) > 22 && Math.abs(input.dx) > Math.abs(input.dy) * 2;
}
/** Nearest content slot. The central create action must never fire on a drag. */
export function scrubSlot(x: number, width: number): number | null {
  if (!Number.isFinite(x) || !Number.isFinite(width) || width <= 0) return null;
  const slot = Math.max(0, Math.min(4, Math.floor(x / (width / 5))));
  return slot === 2 ? (x < width / 2 ? 1 : 3) : slot;
}
