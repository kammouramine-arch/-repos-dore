const fail = (status, message) => Object.assign(Error(message), { status });
const finite = Number.isFinite;
const point = p => p && finite(p.latitude) && Math.abs(p.latitude) <= 90 && finite(p.longitude) && Math.abs(p.longitude) <= 180;
const clean = text => typeof text === 'string' ? text.replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, 300) : '';
const maneuvers = { STRAIGHT: 'straight', KEEP_RIGHT: 'slight-right', BEAR_RIGHT: 'slight-right', TURN_RIGHT: 'turn-right', SHARP_RIGHT: 'sharp-right', KEEP_LEFT: 'slight-left', BEAR_LEFT: 'slight-left', TURN_LEFT: 'turn-left', SHARP_LEFT: 'sharp-left', MAKE_UTURN: 'uturn', ENTER_MOTORWAY: 'ramp', TAKE_EXIT: 'ramp', MERGE: 'merge', ROUNDABOUT_CROSS: 'roundabout', ROUNDABOUT_LEFT: 'roundabout', ROUNDABOUT_RIGHT: 'roundabout', ROUNDABOUT_BACK: 'roundabout', ARRIVE: 'arrive', ARRIVE_LEFT: 'arrive', ARRIVE_RIGHT: 'arrive' };
Object.assign(maneuvers, { ENTER_FREEWAY: 'ramp', ENTER_HIGHWAY: 'ramp', MOTORWAY_EXIT_LEFT: 'ramp', MOTORWAY_EXIT_RIGHT: 'ramp', ENTRANCE_RAMP: 'ramp', TRY_MAKE_UTURN: 'uturn', SWITCH_PARALLEL_ROAD: 'merge', SWITCH_MAIN_ROAD: 'merge' });
const french = { straight: 'Continuez', 'slight-right': 'Serrez à droite', 'turn-right': 'Tournez à droite', 'sharp-right': 'Tournez fortement à droite', 'slight-left': 'Serrez à gauche', 'turn-left': 'Tournez à gauche', 'sharp-left': 'Tournez fortement à gauche', uturn: 'Faites demi-tour', ramp: 'Prenez la bretelle', merge: 'Rejoignez la route', roundabout: 'Au rond-point', arrive: 'Arrivée à destination' };
export function validateRouteRequest(input) {
  const stops = input?.waypoints ?? [];
  if (!point(input?.origin) || !point(input?.destination) || !Array.isArray(stops) || stops.length > 3 || !stops.every(point)) throw fail(400, 'Valid origin, destination and at most three stops are required.');
  return [input.origin, ...stops, input.destination].map(p => ({ latitude: p.latitude, longitude: p.longitude }));
}
export function decodeRoutes(data) {
  if (!Array.isArray(data?.routes) || !data.routes.length || data.routes.length > 3) throw fail(502, 'No usable driving route returned.');
  return data.routes.map(raw => {
    const summary = raw.summary;
    const geometry = raw.legs?.flatMap(leg => leg.points ?? []);
    const instructions = raw.guidance?.instructions;
    if (!finite(summary?.lengthInMeters) || summary.lengthInMeters <= 0 || !finite(summary.travelTimeInSeconds) || summary.travelTimeInSeconds < 0 || !Array.isArray(geometry) || geometry.length < 2 || geometry.length > 30000 || !geometry.every(point) || !Array.isArray(instructions) || instructions.length < 2 || instructions.length > 2000) throw fail(502, 'Route geometry or guidance rejected.');
    const steps = [];
    let offset = 0, time = 0, roadName = '';
    for (const item of instructions) {
      if (!point(item.point) || !finite(item.routeOffsetInMeters) || item.routeOffsetInMeters < offset || item.routeOffsetInMeters > summary.lengthInMeters + 20 || !finite(item.travelTimeInSeconds) || item.travelTimeInSeconds < time) throw fail(502, 'Route instruction rejected.');
      if (item.maneuver === 'DEPART') { roadName = clean(item.street); continue; }
      const maneuver = maneuvers[item.maneuver] ?? (typeof item.maneuver === 'string' && item.maneuver.startsWith('ROUNDABOUT') ? 'roundabout' : 'straight');
      const street = clean(item.street);
      const exit = Number.isInteger(item.roundaboutExitNumber) && item.roundaboutExitNumber > 0 && item.roundaboutExitNumber < 30 ? item.roundaboutExitNumber : null;
      steps.push({ id: crypto.randomUUID(), instruction: clean(item.message) || (maneuver === 'arrive' ? 'Arrive at your destination' : 'Continue along the route'), instructionFr: `${french[maneuver]}${maneuver === 'roundabout' && exit ? `, prenez la sortie ${exit}` : ''}${street && maneuver !== 'arrive' ? ` sur ${street}` : ''}`, maneuver, distanceMeters: item.routeOffsetInMeters - offset, durationSeconds: item.travelTimeInSeconds - time, location: { latitude: item.point.latitude, longitude: item.point.longitude }, ...(roadName ? { roadName } : {}) });
      if (Number.isInteger(item.pointIndex) && item.pointIndex >= 0 && item.pointIndex < geometry.length) steps.at(-1).geometryIndex = item.pointIndex;
      offset = item.routeOffsetInMeters; time = item.travelTimeInSeconds; roadName = street;
    }
    if (!steps.length || steps.at(-1).maneuver !== 'arrive') throw fail(502, 'Arrival guidance missing.');
    return { id: crypto.randomUUID(), source: 'TomTom', distanceMeters: summary.lengthInMeters, durationSeconds: summary.travelTimeInSeconds, geometry: geometry.map(p => ({ latitude: p.latitude, longitude: p.longitude })), steps, summary: [...new Set(steps.map(s => s.roadName).filter(Boolean))].slice(0, 2).join(' · ') || 'Driving route' };
  });
}
export async function calculateRoutes(input, { key, enabled, reserveRequest, fetcher = fetch }) {
  const points = validateRouteRequest(input);
  if (!enabled || !key) throw fail(503, 'Route service unavailable.');
  await reserveRequest();
  const url = new URL(`https://api.tomtom.com/routing/1/calculateRoute/${points.map(p => `${p.latitude},${p.longitude}`).join(':')}/json`);
  for (const [name, value] of Object.entries({ key, travelMode: 'car', routeType: 'fastest', traffic: 'true', departAt: 'now', instructionsType: 'text', language: 'en-GB', maxAlternatives: input.alternatives !== false && points.length === 2 ? '2' : '0', routeRepresentation: 'polyline' })) url.searchParams.set(name, value);
  try {
    const response = await fetcher(url.toString(), { signal: AbortSignal.timeout(15000), headers: { Accept: 'application/json' } });
    if (!response.ok) throw fail(503, 'Route service unavailable.');
    const reader = response.body?.getReader();
    if (!reader) throw fail(502, 'Route response rejected.');
    const chunks = []; let size = 0;
    while (true) { const { value, done } = await reader.read(); if (done) break; size += value.length; if (size > 4000000) { await reader.cancel(); throw fail(502, 'Route response too large.'); } chunks.push(Buffer.from(value)); }
    return decodeRoutes(JSON.parse(Buffer.concat(chunks).toString('utf8')));
  } catch (error) { throw fail(error.status ?? 503, error.status ? error.message : 'Route service unavailable.'); }
}
