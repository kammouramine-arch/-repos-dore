import { authoritativeLimit } from './authority-limits.mjs';
import { decodeLookahead, validateLookahead } from './road-ahead.mjs';
import { samplePath, project, validPoint } from './road-geometry.mjs';
/** TomTom map evidence, never a driving-safety decision or an official incident. */
const failure = (status, message) => Object.assign(new Error(message), { status });
const finite = Number.isFinite;
export const ROAD_MONTHLY_CAP = 1000;
const EARTH_METERS = 6371000;
function distance(a, b) {
  const rad = Math.PI / 180;
  const dLat = (b.latitude - a.latitude) * rad;
  const dLon = (b.longitude - a.longitude) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.latitude * rad) * Math.cos(b.latitude * rad) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_METERS * Math.asin(Math.sqrt(Math.min(1, h)));
}

export function validateRoadTrace(input, now) {
  const fixes = input?.fixes;
  if (!Array.isArray(fixes) || fixes.length < 2 || fixes.length > 12 || input.consent !== true) throw failure(400, 'A recent GPS trace and road-data consent are required.');
  for (let i = 0; i < fixes.length; i++) {
    const p = fixes[i];
    if (!p || !finite(p.latitude) || Math.abs(p.latitude) > 90 || !finite(p.longitude) || Math.abs(p.longitude) > 180 || !finite(p.timestamp) || p.timestamp > now || now - p.timestamp > 60000 || !finite(p.accuracy) || p.accuracy < 0 || p.accuracy > 12) throw failure(400, 'Accurate, recent GPS fixes are required.');
    if (i && (p.timestamp <= fixes[i - 1].timestamp || distance(fixes[i - 1], p) > 2000)) throw failure(400, 'GPS trace is discontinuous.');
  }
  if (now - fixes.at(-1).timestamp > 5000 || distance(fixes[0], fixes.at(-1)) < 5) throw failure(400, 'A fresh moving trace is required.');
  // Copy a strict allowlist. Never forward arbitrary request fields upstream.
  return fixes.map(({ latitude, longitude, timestamp, heading }) => ({ latitude, longitude, timestamp, ...(finite(heading) && heading >= 0 && heading < 360 ? { heading } : {}) }));
}

export function decodeRoadEvidence(data, fixes, receivedAt) {
  const unavailable = { source: 'TomTom map data', status: 'unavailable', speedLimit: null, recentSegmentSigns: [], capturedAt: fixes.at(-1).timestamp, receivedAt, expiresAt: fixes.at(-1).timestamp + 5000 };
  if (!Array.isArray(data?.projectedPoints) || data.projectedPoints.length !== fixes.length || !Array.isArray(data.route)) return unavailable;
  const point = data.projectedPoints.at(-1);
  const index = point?.properties?.routeIndex;
  const coords = point?.geometry?.coordinates;
  if (point?.properties?.snapResult !== 'Matched' || !Number.isInteger(index) || index < 0 || index >= data.route.length || point?.geometry?.type !== 'Point' || !Array.isArray(coords) || !finite(coords[0]) || Math.abs(coords[0]) > 180 || !finite(coords[1]) || Math.abs(coords[1]) > 90) return unavailable;
  const road = data.route[index]?.properties;
  const shape = data.route[index]?.geometry;
  if (road?.elementType !== 'Road' || !finite(road.confidence) || road.confidence < 0.9 || road.confidence > 1 || distance(fixes.at(-1), { longitude: coords[0], latitude: coords[1] }) > 12 || receivedAt > unavailable.expiresAt || shape?.type !== 'LineString' || !Array.isArray(shape.coordinates) || shape.coordinates.length < 2 || shape.coordinates.length > 2000 || !shape.coordinates.every(validPoint) || (project(coords, shape.coordinates)?.distance ?? Infinity) > 3) return unavailable;
  // The documented response is a single SpeedLimit object, not an array.
  // Advisory speeds, malformed values and unknown units remain unavailable.
  const limit = road.speedLimits?.type === 'Maximum' ? road.speedLimits : null;
  const mappedLimit = limit && Number.isInteger(limit.value) && limit.value > 0 && limit.value <= 300 && ['kmph', 'mph'].includes(limit.unit) ? { value: limit.value, unit: limit.unit === 'kmph' ? 'km/h' : 'mph' } : null;
  const speedLimit = authoritativeLimit(road.address, mappedLimit, receivedAt);
  const signs = Array.isArray(road.trafficSigns) ? road.trafficSigns.filter((s) => typeof s?.signType === 'string' && /^[A-Za-z]{1,70}Sign$/.test(s.signType)).slice(0, 20).map((s) => ({ type: s.signType })) : [];
  // Signs describe the traveled segment, not signs ahead; do not invent distance.
  return { ...unavailable, status: 'matched', speedLimit, recentSegmentSigns: signs, confidence: road.confidence };
}

export function createTomTomRoadProvider({ key, enabled = false, fetcher = fetch, now = Date.now, reserveRequest }) {
  return {
    isConfigured: () => enabled && typeof key === 'string' && key.length > 0,
    async lookupAhead(input) {
      if (!this.isConfigured()) throw failure(503, 'Licensed road data is not connected.');
      const line = validateLookahead(input);
      await reserveRequest();
      const url = new URL('https://api.tomtom.com/snapToRoads/1');
      url.searchParams.set('key', key);
      url.searchParams.set('points', samplePath(line).map(point => point.join(',')).join(';'));
      url.searchParams.set('vehicleType', 'PassengerCar');
      url.searchParams.set('measurementSystem', 'metric');
      url.searchParams.set('fields', '{route{geometry{type,coordinates},properties{elementType,confidence,roadUse,address{roadName,municipality,roadNumbers,countryCode},speedLimits{value,unit,type},trafficSigns{signType,chainage,unit},trafficLight}}}');
      return decodeLookahead(await readProviderJson(fetcher, url), line, now());
    },
    async lookup(input) {
      if (!this.isConfigured()) throw failure(503, 'Licensed road data is not connected.');
      const fixes = validateRoadTrace(input, now());
      // Reservation is persisted before fetch, so failures and restarts cannot
      // bypass the evaluation cap. Other consumers of this key need their own cap.
      await reserveRequest();
      const url = new URL('https://api.tomtom.com/snapToRoads/1');
      url.searchParams.set('key', key);
      url.searchParams.set('points', fixes.map((p) => `${p.longitude},${p.latitude}`).join(';'));
      url.searchParams.set('timestamps', fixes.map((p) => new Date(p.timestamp).toISOString()).join(';'));
      url.searchParams.set('headings', fixes.map(p => p.heading ?? '').join(';'));
      url.searchParams.set('vehicleType', 'PassengerCar');
      url.searchParams.set('measurementSystem', 'auto');
      url.searchParams.set('fields', '{projectedPoints{geometry{type,coordinates},properties{routeIndex,snapResult}},route{geometry{type,coordinates},properties{elementType,confidence,address{roadName,municipality,countryCode},speedLimits{value,unit,type},trafficSigns{signType}}}}');
      try {
        const response = await fetcher(url.toString(), { signal: AbortSignal.timeout(3000), headers: { Accept: 'application/json' } });
        if (!response.ok) throw failure(503, 'Road data is unavailable.');
        // Bound response memory without including provider body or key in errors.
        const reader = response.body?.getReader();
        if (!reader) throw failure(502, 'Road data response rejected.');
        let bytes = 0; const chunks = [];
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          bytes += value.length;
          if (bytes > 262144) { await reader.cancel(); throw failure(502, 'Road data response rejected.'); }
          chunks.push(Buffer.from(value));
        }
        return decodeRoadEvidence(JSON.parse(Buffer.concat(chunks).toString('utf8')), fixes, now());
      } catch (cause) {
        if (cause.status) throw cause;
        throw failure(503, 'Road data is unavailable.');
      }
    },
  };
}

async function readProviderJson(fetcher, url) {
  try {
    const response = await fetcher(url.toString(), { signal: AbortSignal.timeout(3000), headers: { Accept: 'application/json' } });
    if (!response.ok) throw failure(503, 'Road information unavailable.');
    const reader = response.body?.getReader();
    if (!reader) throw failure(502, 'Road information rejected.');
    const chunks = []; let bytes = 0;
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      bytes += value.length;
      if (bytes > 262144) { await reader.cancel(); throw failure(502, 'Road information rejected.'); }
      chunks.push(Buffer.from(value));
    }
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch (error) {
    throw failure(error.status ?? 503, 'Road information unavailable.');
  }
}
