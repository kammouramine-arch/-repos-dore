import { createTripStore } from './tripStore';
import type { ServiceContainer } from '@/services/container';
import type { RoutePlan } from '@/core/domain/entities/route';
const place = { id:'home',name:'Home',address:'Private address',coordinates:{latitude:50,longitude:3},category:'place' as const };
const plan = {origin:place.coordinates,destination:place,routes:[],createdAt:0} satisfies RoutePlan;
function fixture() {
  const completions: ((plan:RoutePlan)=>void)[] = [];
  const signals: AbortSignal[] = [];
  const services = { useCases:{planTrip:({signal}:{signal:AbortSignal})=>{signals.push(signal);return new Promise<RoutePlan>(resolve=>completions.push(resolve));}},recentDestinationsRepository:{add:async()=>[]}} as unknown as ServiceContainer;
  return {store:createTripStore(services),completions,signals};
}
test('cancelling a pending trip prevents a late route from becoming active', async () => {
  const {store,completions,signals}=fixture();
  const request=store.getState().planTrip(place,place.coordinates);
  store.getState().clearTrip();
  expect(signals[0].aborted).toBe(true);
  completions[0](plan);
  expect(await request).toBe(false);
  expect(store.getState().plan).toBeNull();
  expect(store.getState().planning).toBe(false);
});
test('the newest destination wins even when the old provider responds later', async () => {
  const {store,completions}=fixture();
  const first=store.getState().planTrip(place,place.coordinates);
  const secondPlace={...place,id:'work'};
  const second=store.getState().planTrip(secondPlace,place.coordinates);
  completions[1]({...plan,destination:secondPlace}); expect(await second).toBe(true);
  completions[0](plan); expect(await first).toBe(false);
  expect(store.getState().plan?.destination.id).toBe('work');
});
