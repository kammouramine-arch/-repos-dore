import test from 'node:test';
import assert from 'node:assert/strict';
import { classifyCommand, validateClassification, unknown } from './classify.mjs';

test('rejects model-invented destinations, absent saved places and route-control intents', () => {
  for (const intent of [{ kind: 'navigate-to-place', query: 'Rome' }, { kind: 'navigate-saved', slot: 'work' }, { kind: 'cancel-navigation' }]) assert.deepEqual(validateClassification({ intent }, 'What time do I arrive?'), unknown());
});
test('discards every model fact and extra field', () => {
  assert.deepEqual(validateClassification({ intent: { kind: 'navigate-to-place', query: 'Paris', safety: 'safe' }, speech: 'No hazards ahead.' }, 'Go to Paris'), { intent: { kind: 'navigate-to-place', query: 'Paris' }, speech: null });
});

test('a model cannot invent a stop category absent from the spoken request', () => {
  assert.deepEqual(validateClassification({ intent: { kind: 'find-nearby', category: 'fuel' } }, 'Find a coffee nearby'), unknown());
  assert.deepEqual(validateClassification({ intent: { kind: 'find-nearby', category: 'fuel' } }, 'Find a train station'), unknown());
  assert.deepEqual(validateClassification({ intent: { kind: 'find-nearby', category: 'coffee' } }, 'Cherche un café'), { intent: { kind: 'find-nearby', category: 'coffee' }, speech: null });
});
test('negated and driving-safety questions never reach the remote model', async () => {
  let calls = 0; const ai = { run: async () => { calls++; return {}; } };
  for (const text of ['Do not take me home', 'Can I change lanes?', 'Ne va pas à Paris', 'Puis-je dépasser ?', 'What is the speed limit?']) assert.deepEqual(await classifyCommand(ai, text), unknown());
  assert.equal(calls, 0);
});
test('pins server model, prompt and output size; no provider prose reaches the app', async () => {
  const ai = { run: async (model, input) => {
    assert.equal(model, '@cf/qwen/qwen3-30b-a3b-fp8'); assert.equal(input.max_tokens, 160);
    return { choices: [{ message: { content: JSON.stringify({ intent: { kind: 'navigate-saved', slot: 'home' }, speech: 'Clear road.' }) } }] };
  } };
  assert.deepEqual(await classifyCommand(ai, 'Could you bring me home?'), { intent: { kind: 'navigate-saved', slot: 'home' }, speech: null });
});
