import { runConversationAction, type ActionContext } from './runConversationAction';
jest.mock('@/app/navigation/navigationRef',()=>({navigateWhenReady:jest.fn()}));
const place={id:'destination',name:'Destination',address:'',category:'place',coordinates:{latitude:50,longitude:3}};
function fixture() {
  const previous={id:'old'};
  const next={id:'new'};
  const state={destination:place as typeof place|null,route:previous as typeof previous|null,stops:[{...place,id:'stop',coordinates:{latitude:50.1,longitude:3.1}}],status:'guiding',setStatus:jest.fn(),replaceRoute:jest.fn()};
  const update=jest.fn(async()=>undefined);
  const planTrip=jest.fn(async (_input:unknown)=>({routes:[next]}));
  const dispatch=jest.fn();
  const context={services:{useCases:{planTrip}},stores:{navigation:{getState:()=>state},location:{getState:()=>({position:{coordinates:place.coordinates}})},preferences:{getState:()=>({update})},conversation:{getState:()=>({dispatch})}},logger:{warn:jest.fn()}} as unknown as ActionContext;
  return {context,state,update,planTrip,dispatch,next};
}
test('changing toll preference persists before rerouting and keeps the stop',async()=>{
  const f=fixture();
  await runConversationAction({type:'set-route-preference',preference:'avoidTolls',enabled:true},f.context);
  expect(f.update).toHaveBeenCalledWith({avoidTolls:true});
  expect(f.planTrip).toHaveBeenCalledWith({origin:place.coordinates,destination:place,waypoints:[f.state.stops[0].coordinates]});
  expect(f.state.replaceRoute).toHaveBeenCalledWith(f.next);
});
test('cancelled navigation cannot be restored by a late reroute',async()=>{
  const f=fixture();let resolve!: (value:{routes:{id:string}[]})=>void;
  f.planTrip.mockImplementation(()=>new Promise(done=>{resolve=done;}));
  const pending=runConversationAction({type:'reroute'},f.context);
  f.state.destination=null;f.state.route=null;
  resolve({routes:[f.next]});await pending;
  expect(f.state.replaceRoute).not.toHaveBeenCalled();
});
test('provider failure keeps the existing route and announces that recalculation failed',async()=>{
  const f=fixture();f.planTrip.mockRejectedValue(new Error('Offline'));
  await runConversationAction({type:'reroute'},f.context);
  expect(f.state.replaceRoute).not.toHaveBeenCalled();
  expect(f.dispatch).toHaveBeenCalledWith(expect.objectContaining({type:'navigation-announcement',text:expect.stringContaining('could not be updated')}));
});
