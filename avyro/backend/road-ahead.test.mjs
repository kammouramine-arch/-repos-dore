import { test } from 'node:test';
import assert from 'node:assert/strict';
import { decodeLookahead, validateLookahead } from './road-ahead.mjs';
import { authoritativeLimit, WATTIGNIES_ORDER } from './authority-limits.mjs';
const line = [[3, 50], [3.001, 50], [3.002, 50]];
const road = properties => ({ geometry: { type: 'LineString', coordinates: line }, properties: { elementType: 'Road', confidence: .95, ...properties } });
test('locates actual stop and light metadata without inventing a light colour', () => {
  const result = decodeLookahead({ route: [road({ trafficSigns: [{ signType: 'StopSign', chainage: 3000, unit: 'cm' }], trafficLight: 'End' })] }, line, 1000);
  assert.deepEqual(result.alerts.map(a => a.kind), ['stop', 'traffic-light']);
  assert.ok(result.alerts[0].coordinate.longitude > 3);
  assert.equal(JSON.stringify(result).includes('green'), false);
});
test('invalid chainage, missing position, low confidence and a different road produce no pins', () => {
  for (const item of [road({ confidence: .5, trafficLight: 'End' }), road({ trafficSigns: [{ signType: 'StopSign', chainage: 99999999, unit: 'cm' }] }), { ...road({ trafficLight: 'End' }), geometry: { type: 'LineString', coordinates: [[4, 51], [4.001, 51]] } }]) assert.deepEqual(decodeLookahead({ route: [item] }, line, 1000).alerts, []);
});
test('a road transition is generic and never a fast-lane instruction', () => {
  const later = { ...road({ roadUse: 'LimitedAccess' }), geometry: { type: 'LineString', coordinates: [line[1], line[2]] } };
  const result = decodeLookahead({ route: [later] }, line, 1000);
  assert.equal(result.alerts[0].kind, 'limited-access');
  assert.equal('lane' in result.alerts[0], false);
});
test('route requests require consent, finite coordinates and a short continuous geometry', () => {
  assert.deepEqual(validateLookahead({ consent: true, geometry: line }), line);
  for (const input of [{ consent: false, geometry: line }, { consent: true, geometry: [[3, 50], [4, 51]] }, { consent: true, geometry: [[3, 50], [NaN, 50]] }]) assert.throws(() => validateLookahead(input), { status: 400 });
});

test('international road-number separators normalize without accepting prose', () => {
  for (const [input, expected] of [['US-101', 'US101'], ['NH-44', 'NH44'], ['A 1', 'A1']]) {
    const result = decodeLookahead({ route: [{ ...road({ address: { roadNumbers: [input] } }), geometry: { type: 'LineString', coordinates: [line[1], line[2]] } }] }, line, 1000);
    assert.equal(result.alerts.find(a => a.kind === 'numbered-road')?.label, expected);
  }
  assert.equal(decodeLookahead({ route: [road({ address: { roadNumbers: ['take the fast lane'] } })] }, line, 1000).alerts.length, 0);
});
test('documented municipal facts correct only exact French town/roads and never raise a lower limit', () => {
  const address = { countryCode: 'FRA', municipality: 'Wattignies', roadName: 'Avenue Denis Cordonnier' };
  const mapped = { value: 50, unit: 'km/h' }, now = Date.parse('2026-10-15T12:00:00Z');
  assert.deepEqual(authoritativeLimit(address, mapped, now), { value: 30, unit: 'km/h', source: 'municipal-order', authority: WATTIGNIES_ORDER.id });
  const lower = { value: 20, unit: 'km/h' };
  assert.equal(authoritativeLimit(address, lower, now), lower);
  assert.equal(authoritativeLimit({ ...address, roadName: 'Rue Lindbergh' }, mapped, now).value, 30);
  assert.equal(authoritativeLimit({ ...address, roadName: 'Rue Blériot' }, mapped, now).value, 30);
  for (const change of [{ municipality: 'Lille' }, { countryCode: 'IND' }, { roadName: 'Unlisted Road' }]) assert.equal(authoritativeLimit({ ...address, ...change }, mapped, now), mapped);
  assert.equal(authoritativeLimit(address, mapped, Date.parse('2027-01-14T00:00:00Z')), null);
});
test('a segment limit retains sourced geometry and rejects the opposite approach', () => {
  const properties = { speedLimits: { value: 30, unit: 'kmph', type: 'Maximum' }, trafficLight: 'End' };
  const result = decodeLookahead({ route: [road(properties)] }, line, 1000);
  assert.equal(result.segments[0].speedLimit.value, 30);
  const reverse = { ...road(properties), geometry: { type: 'LineString', coordinates: [...line].reverse() } };
  assert.deepEqual(decodeLookahead({ route: [reverse] }, line, 1000).segments, []);
  assert.deepEqual(decodeLookahead({ route: [reverse] }, line, 1000).alerts, []);
});
