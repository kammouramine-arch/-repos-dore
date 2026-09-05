const paths = ['/', '/prospects', '/clients', '/plus'];
const destinations = ['/(app)', '/(app)/prospects', '/(app)/clients', '/(app)/plus'] as const;

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
