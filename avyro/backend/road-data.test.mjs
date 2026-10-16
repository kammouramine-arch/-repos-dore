import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createTomTomRoadProvider, decodeRoadEvidence, validateRoadTrace } from './road-data.mjs';
const now = 1791892800000;
const fixes = [{ longitude: 2, latitude: 48, accuracy: 10, timestamp: now - 3000 }, { longitude: 2.0002, latitude: 48, accuracy: 10, timestamp: now }];
const evidence = () => ({
  projectedPoints: fixes.map((p) => ({ geometry: { type: 'Point', coordinates: [p.longitude, p.latitude] }, properties: { routeIndex: 0, snapResult: 'Matched' } })),
  route: [{ geometry: { type: 'LineString', coordinates: fixes.map(p => [p.longitude, p.latitude]) }, properties: { elementType: 'Road', confidence: 0.95, speedLimits: { value: 50, unit: 'kmph', type: 'Maximum' }, trafficSigns: [{ signType: 'StopSign' }] } }],
});
test('rejects inaccurate, stale, stationary and discontinuous traces before spending quota', async () => {
  let reserved = 0;
  const provider = createTomTomRoadProvider({ key: 'server-test-key', enabled: true, now: () => now, reserveRequest: () => reserved++, fetcher: () => { throw Error('must not fetch'); } });
  const invalid = [
    { fixes, consent: false },
    { fixes: fixes.map((p) => ({ ...p, accuracy: 80 })), consent: true },
    { fixes: fixes.map((p) => ({ ...p, timestamp: p.timestamp - 60000 })), consent: true },
    { fixes: [fixes[0], { ...fixes[0], timestamp: now }], consent: true },
    { fixes: [fixes[0], { ...fixes[1], longitude: 20 }], consent: true },
    { fixes: [fixes[0], { ...fixes[1], timestamp: now + 1 }], consent: true },
  ];
  for (const input of invalid) await assert.rejects(provider.lookup(input), { status: 400 });
  assert.equal(reserved, 0);
});
test('uses the newest matched road, preserves units and does not invent upcoming warnings', () => {
  const data = evidence();
  data.route.unshift({ properties: { elementType: 'Road', confidence: 1, speedLimits: { value: 130, unit: 'kmph', type: 'Maximum' } } });
  data.projectedPoints.at(-1).properties.routeIndex = 1;
  const result = decodeRoadEvidence(data, fixes, now);
  assert.deepEqual(result.speedLimit, { value: 50, unit: 'km/h' });
  assert.deepEqual(result.recentSegmentSigns, []);
  assert.equal('warningsAhead' in result, false);
  data.route[1].properties.speedLimits = { value: 30, unit: 'mph', type: 'Maximum' };
  assert.deepEqual(decodeRoadEvidence(data, fixes, now).speedLimit, { value: 30, unit: 'mph' });
});
test('ambiguous, off-road, distant and expired evidence clears speed and signs', () => {
  for (const change of [
    (d) => { d.route[0].properties.confidence = 0.6; },
    (d) => { d.projectedPoints.at(-1).properties.snapResult = 'OffRoad'; },
    (d) => { d.projectedPoints.at(-1).properties.routeIndex = -1; },
    (d) => { d.projectedPoints.at(-1).geometry.coordinates = [2.01, 48]; },
    (d) => { d.route[0].properties.elementType = 'Ferry'; },
  ]) {
    const data = evidence(); change(data);
    const result = decodeRoadEvidence(data, fixes, now);
    assert.equal(result.status, 'unavailable'); assert.equal(result.speedLimit, null); assert.deepEqual(result.recentSegmentSigns, []);
  }
  assert.equal(decodeRoadEvidence(evidence(), fixes, now + 5001).speedLimit, null);
});
test('advisory, malformed and unsupported speed units never become maximum limits', () => {
  for (const limit of [{ value: 50, unit: 'kmph', type: 'Recommended' }, { value: -1, unit: 'kmph', type: 'Maximum' }, { value: '50', unit: 'kmph', type: 'Maximum' }, { value: 50, unit: 'm/s', type: 'Maximum' }]) {
    const data = evidence(); data.route[0].properties.speedLimits = limit;
    assert.equal(decodeRoadEvidence(data, fixes, now).speedLimit, null);
  }
});
test('upstream is fixed, request fields are allowlisted, key and prose stay server-side', async () => {
  let sent; let reserved = 0;
  const provider = createTomTomRoadProvider({ key: 'private-key', enabled: true, now: () => now, reserveRequest: () => reserved++, fetcher: async (url) => { sent = new URL(url); return Response.json({ ...evidence(), speech: 'Safe to change lanes', apiKey: 'private-key' }); } });
  const result = await provider.lookup({ fixes, consent: true, url: 'https://attacker.example', fields: 'laneInfo', key: 'attacker-key' });
  assert.equal(sent.origin, 'https://api.tomtom.com'); assert.equal(sent.searchParams.get('key'), 'private-key');
  assert.equal(sent.searchParams.get('fields').includes('laneInfo'), false);
  assert.equal(JSON.stringify(result).includes('private-key'), false); assert.equal('speech' in result, false); assert.equal(reserved, 1);
  assert.equal(validateRoadTrace({ fixes, consent: true }, now)[0].accuracy, undefined);
});
test('disabled provider, exhausted budget and oversized response fail safely', async () => {
  let called = false;
  const options = { key: 'private-key', now: () => now, reserveRequest: () => {}, fetcher: async () => { called = true; return new Response('x'.repeat(262145)); } };
  await assert.rejects(createTomTomRoadProvider(options).lookup({ fixes, consent: true }), { status: 503 });
  assert.equal(called, false);
  await assert.rejects(createTomTomRoadProvider({ ...options, enabled: true, reserveRequest: () => { throw Object.assign(Error('cap'), { status: 429 }); } }).lookup({ fixes, consent: true }), { status: 429 });
  assert.equal(called, false);
  await assert.rejects(createTomTomRoadProvider({ ...options, enabled: true }).lookup({ fixes, consent: true }), { status: 502 });
});

test('a projected point cannot claim a different nearby road geometry', () => {
  const data = evidence();
  data.route[0].geometry.coordinates = [[2.001, 48], [2.002, 48]];
  assert.equal(decodeRoadEvidence(data, fixes, now).speedLimit, null);
});


test('rejects an opposite or crossing matched carriageway despite high confidence', () => {
  const reverse = evidence();
  reverse.route[0].geometry.coordinates.reverse();
  assert.equal(decodeRoadEvidence(reverse, fixes, now).speedLimit, null);
  const crossing = evidence();
  crossing.route[0].geometry.coordinates = [[2.0002, 47.9999], [2.0002, 48.0001]];
  assert.equal(decodeRoadEvidence(crossing, fixes, now).speedLimit, null);
  const contradictingHeading = fixes.map(fix => ({ ...fix, heading: 270 }));
  assert.equal(decodeRoadEvidence(evidence(), contradictingHeading, now).speedLimit, null);
});

test('returns the matched element geometry, oriented with travel, so the app can hold the limit along it', () => {
  const result = decodeRoadEvidence(evidence(), fixes, now);
  assert.equal(result.status, 'matched');
  assert.deepEqual(result.segment.geometry, fixes.map(p => ({ latitude: p.latitude, longitude: p.longitude })));
  const data = evidence(); data.route[0].properties.confidence = 0.6;
  assert.equal('segment' in decodeRoadEvidence(data, fixes, now), false);
});
