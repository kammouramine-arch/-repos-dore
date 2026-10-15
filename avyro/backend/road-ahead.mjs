import { metres, project, atDistance, validPoint } from './road-geometry.mjs';
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
  const alerts = [], segments = [], seen = new Set();
  const result = () => ({ source: 'TomTom map data', alerts, segments, expiresAt: now + 300000 });
  if (!Array.isArray(data?.route) || data.route.length > 200) return result();
  const add = (kind, coordinate, label) => {
    const near = project(coordinate, planned);
    if (!near || near.distance > 15 || near.along < 5) return;
    const id = `${kind}:${coordinate[0].toFixed(5)}:${coordinate[1].toFixed(5)}`;
    if (seen.has(id) || alerts.length >= 50 || alerts.some(alert => alert.kind === kind && metres([alert.coordinate.longitude, alert.coordinate.latitude], coordinate) < 12)) return;
    seen.add(id);
    alerts.push({ id, kind, coordinate: { longitude: coordinate[0], latitude: coordinate[1] }, ...(label ? { label } : {}), source: 'TomTom map data' });
  };
  let previousUse = null, previousNumber = null;
  for (const road of data.route) {
    const props = road?.properties, line = road?.geometry?.coordinates;
    if (props?.elementType !== 'Road' || !Number.isFinite(props.confidence) || props.confidence < .9 || props.confidence > 1 || road.geometry?.type !== 'LineString' || !Array.isArray(line) || line.length < 2 || line.length > 2000 || !line.every(validPoint) || !line.every(point => (project(point, planned)?.distance ?? Infinity) <= 15)) {
      previousUse = null;
      continue;
    }
    // Reject a nearby road element travelling against the selected path.
    if ((project(line.at(-1), planned)?.along ?? 0) <= (project(line[0], planned)?.along ?? 0)) continue;
    // Documented chainage starts at the beginning of travel on this road element.
    const rawLimit = props.speedLimits;
    const mapped = rawLimit?.type === 'Maximum' && Number.isInteger(rawLimit.value) && rawLimit.value > 0 && rawLimit.value <= 300 && ['kmph', 'mph'].includes(rawLimit.unit) ? { value: rawLimit.value, unit: rawLimit.unit === 'kmph' ? 'km/h' : 'mph' } : null;
    const speedLimit = authoritativeLimit(props.address, mapped, now);
    if (speedLimit && segments.length < 100) segments.push({ geometry: line.map(p => ({ longitude: p[0], latitude: p[1] })), speedLimit });
    for (const sign of Array.isArray(props.trafficSigns) ? props.trafficSigns : []) {
      const kind = ({ StopSign: 'stop', YieldSign: 'yield', TrafficLightAheadSign: 'traffic-light-warning' })[sign.signType];
      const factor = ({ cm: .01, ft: .3048 })[sign.unit];
      if (!kind || !factor || !Number.isFinite(sign.chainage)) continue;
      const coordinate = atDistance(line, sign.chainage * factor);
      if (coordinate) add(kind, coordinate);
    }
    // This is a mapped light location, never its current red/green phase.
    if (['Start', 'Both'].includes(props.trafficLight)) add('traffic-light', line[0]);
    if (['End', 'Both'].includes(props.trafficLight)) add('traffic-light', line.at(-1));
    if (props.roadUse !== previousUse && props.roadUse === 'LimitedAccess') add('limited-access', line[0]);
    if (props.roadUse !== previousUse && props.roadUse === 'Ramp') add('ramp', line[0]);
    const number = Array.isArray(props.address?.roadNumbers) ? props.address.roadNumbers.find(n => typeof n === 'string' && /^[A-Z]{0,3} ?[0-9]{1,4}(?:-[A-Z0-9]{1,3})?$/i.test(n)) : null;
    if (number && number !== previousNumber) add('numbered-road', line[0], number.replace(/ /g, '').toUpperCase());
    previousUse = props.roadUse;
    previousNumber = number;
  }
  alerts.sort((a, b) => project([a.coordinate.longitude, a.coordinate.latitude], planned).along - project([b.coordinate.longitude, b.coordinate.latitude], planned).along);
  return result();
}
