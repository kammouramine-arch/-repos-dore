import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateRoutes, decodeRoutes, validateRouteRequest } from './routing.mjs';
const a = { latitude: 50, longitude: 3 }, b = { latitude: 50, longitude: 3.001 };
const raw = () => ({ routes: [{ summary: { lengthInMeters: 100, travelTimeInSeconds: 20 }, legs: [{ points: [a,b] }], guidance: { instructions: [{ maneuver: 'DEPART', point: a, routeOffsetInMeters: 0, travelTimeInSeconds: 0, street: 'Road A' }, { maneuver: 'ARRIVE', point: b, routeOffsetInMeters: 100, travelTimeInSeconds: 20, message: 'You have arrived.' }] } }] });
test('provider instructions close measured legs and retain the actual arrival coordinate', () => {
  const [route] = decodeRoutes(raw()); assert.equal(route.steps[0].maneuver, 'arrive'); assert.equal(route.steps[0].distanceMeters, 100); assert.deepEqual(route.steps[0].location, b);
  const malformed = raw(); malformed.routes[0].guidance.instructions[1].routeOffsetInMeters = -1;
  assert.throws(() => decodeRoutes(malformed), { status: 502 });
});
test('invalid waypoints and disabled routing never consume the free allowance', async () => {
  assert.throws(() => validateRouteRequest({ origin: a, destination: b, waypoints: Array(4).fill(a) }), { status: 400 });
  let reserved = 0; await assert.rejects(calculateRoutes({ origin:a,destination:b }, { enabled:false,key:'test',reserveRequest:()=>reserved++ }), { status:503 }); assert.equal(reserved,0);
});
test('routing pins provider, car profile and output bounds without client URLs or provider prose errors', async () => {
  let called; const routes = await calculateRoutes({ origin:a,destination:b, url:'https://untrusted.invalid' }, { enabled:true,key:'not-real',reserveRequest:async()=>{},fetcher:async(url)=>{called=new URL(url);return Response.json(raw());} });
  assert.equal(called.hostname,'api.tomtom.com');assert.equal(called.searchParams.get('travelMode'),'car');assert.equal(routes.length,1);
});
