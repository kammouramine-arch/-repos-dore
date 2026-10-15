import { metres, project, validPoint } from './road-geometry.mjs';
import { authoritativeLimit } from './authority-limits.mjs';
const fail = message => Object.assign(Error(message), { status: 400 });
export function validateLookahead(input) {
  const line = input?.geometry;
  if (input?.consent !== true || !Array.isArray(line) || line.length < 2 || line.length > 256 || !line.every(validPoint)) throw fail('A bounded planned route and consent are required.');
  let total = 0;
  for (let i = 1; i < line.length; i++) {
    const length = metres(line[i - 1], line[i]);
    if (length > 300) throw fail('Route geometry is discontinuous.');
    total += length;
  }
  if (total < 10 || total > 1500) throw fail('Use a short section of the planned route.');
  return line.map(point => [point[0], point[1]]);
}
export function decodeLookahead(data, planned, now) {
  // Matching confidence is not sign validity. Current upstream metadata cannot
  // establish a sign's applicable approach or observation freshness. Suppress
  // all warning pins until a licensed directional evidence feed is validated.
  const alerts = [], segments = [];
  const result = () => ({ source: 'TomTom map data', alerts, segments, expiresAt: now + 300000 });
  if (!Array.isArray(data?.route) || data.route.length > 200) return result();
  for (const road of data.route) {
    const props = road?.properties, line = road?.geometry?.coordinates;
    if (props?.elementType !== 'Road' || !Number.isFinite(props.confidence) || props.confidence < .9 || props.confidence > 1 || road.geometry?.type !== 'LineString' || !Array.isArray(line) || line.length < 2 || line.length > 2000 || !line.every(validPoint) || !line.every(point => (project(point, planned)?.distance ?? Infinity) <= 15)) {
      continue;
    }
    // Reject a nearby road element travelling against the selected path.
    if ((project(line.at(-1), planned)?.along ?? 0) <= (project(line[0], planned)?.along ?? 0)) continue;
    // Documented chainage starts at the beginning of travel on this road element.
    const rawLimit = props.speedLimits;
    const mapped = rawLimit?.type === 'Maximum' && Number.isInteger(rawLimit.value) && rawLimit.value > 0 && rawLimit.value <= 300 && ['kmph', 'mph'].includes(rawLimit.unit) ? { value: rawLimit.value, unit: rawLimit.unit === 'kmph' ? 'km/h' : 'mph' } : null;
    const speedLimit = authoritativeLimit(props.address, mapped, now);
    if (speedLimit && segments.length < 100) segments.push({ geometry: line.map(p => ({ longitude: p[0], latitude: p[1] })), speedLimit });
  }
  return result();
}
