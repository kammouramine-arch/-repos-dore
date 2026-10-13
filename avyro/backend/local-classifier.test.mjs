import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createLocalClassifier } from './local-classifier.mjs';
test('local classification cannot target a client-supplied endpoint or paid provider', async () => {
  let sent;
  const classify = createLocalClassifier({ fetcher: async (url, options) => { sent = { url, options }; return Response.json({ choices: [{ message: { content: '{"intent":{"kind":"unknown"}}' } }] }); } });
  assert.deepEqual(await classify('hello', 'Server-owned prompt'), { intent: { kind: 'unknown' } });
  assert.equal(sent.url, 'http://127.0.0.1:8181/v1/chat/completions');
  assert.equal(JSON.parse(sent.options.body).model, 'avyro-local');
  assert.equal('Authorization' in sent.options.headers, false);
});
test('malformed and oversized local outputs are rejected', async () => {
  for (const response of [Response.json({ choices: [] }), new Response('x'.repeat(65537)), Response.json({ choices: [{ message: { content: 'not JSON' } }] })]) {
    await assert.rejects(createLocalClassifier({ fetcher: async () => response })('hello', 'prompt'));
  }
});
