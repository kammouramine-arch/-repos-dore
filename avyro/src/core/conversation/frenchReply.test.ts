import { buildRouteContext } from './routeContext';
import { frenchReply } from './frenchReply';
import { conversationReducer, initialConversationState } from './conversationMachine';
import type { ConversationReply } from '@/core/domain/entities/conversation';

const context = buildRouteContext({ navigationState: 'idle', destination: null, route: null, progress: null, distanceUnit: 'metric' });
test('an English request keeps an English voice even when a French destination has accents', () => {
  const reply: ConversationReply = { speech: 'Heading to Rue Élégante.', intent: { kind: 'navigate-to-place', query: 'Rue Élégante' }, action: { type: 'none' }, referent: null };
  expect(frenchReply(reply, { transcript: 'Take me to Rue Élégante', context, origin: null }).language).toBe('en-US');
});
test('an unaccented French limit answer keeps its French voice through a maneuver interruption', () => {
  const reply = frenchReply({ speech: '', intent: { kind: 'ask-speed-limit' }, action: { type: 'none' }, referent: null }, { transcript: 'Quelle est la limitation de vitesse ici ?', context: { ...context, mappedSpeedLimit: { value: 50, unit: 'km/h' } }, origin: null });
  const thinking = conversationReducer(initialConversationState, { type: 'wake-detected', command: 'speed limit' }).state;
  const spoken = conversationReducer(thinking, { type: 'reply', reply });
  expect(spoken.effects).toContainEqual({ type: 'speak', text: reply.speech, language: 'fr-FR' });
  const interrupted = conversationReducer(spoken.state, { type: 'navigation-announcement', text: 'Turn right.', language: 'en-US' }).state;
  expect(conversationReducer(interrupted, { type: 'speech-finished' }).effects).toContainEqual({ type: 'speak', text: reply.speech, language: 'fr-FR' });
});
