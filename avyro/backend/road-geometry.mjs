const R = 6371008.8, rad = Math.PI / 180;
export function metres(a, b) {
  const x = (b[0] - a[0]) * rad * Math.cos((a[1] + b[1]) * .5 * rad);
  return Math.hypot(x, (b[1] - a[1]) * rad) * R;
}
export const validPoint = p => Array.isArray(p) && p.length >= 2 && Number.isFinite(p[0]) && Math.abs(p[0]) <= 180 && Number.isFinite(p[1]) && Math.abs(p[1]) <= 90;
export function project(point, line) {
  let best = null, travelled = 0;
  for (let i = 1; i < line.length; i++) {
    const a = line[i - 1], b = line[i], c = Math.cos(point[1] * rad);
    const dx = (b[0] - a[0]) * c, dy = b[1] - a[1];
    const t = Math.max(0, Math.min(1, (((point[0] - a[0]) * c) * dx + (point[1] - a[1]) * dy) / (dx * dx + dy * dy || 1)));
    const coordinate = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
    const distance = metres(point, coordinate), length = metres(a, b);
    if (!best || distance < best.distance) best = { distance, along: travelled + length * t, coordinate };
    travelled += length;
  }
  return best;
}
export function atDistance(line, distance) {
  if (!Number.isFinite(distance) || distance < 0) return null;
  for (let i = 1; i < line.length; i++) {
    const length = metres(line[i - 1], line[i]);
    if (distance <= length + .01) {
      const t = length ? Math.min(1, distance / length) : 0;
      return [line[i - 1][0] + (line[i][0] - line[i - 1][0]) * t, line[i - 1][1] + (line[i][1] - line[i - 1][1]) * t];
    }
    distance -= length;
  }
  return null;
}
export function samplePath(line, count = 12) {
  const length = line.slice(1).reduce((sum, point, i) => sum + metres(line[i], point), 0);
  return Array.from({ length: count }, (_, i) => atDistance(line, length * i / (count - 1)) ?? line.at(-1));
}
