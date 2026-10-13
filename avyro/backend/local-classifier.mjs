/** A local, server-owned classification endpoint. Never expose the model server. */
export function createLocalClassifier({ fetcher = fetch } = {}) {
  return async (transcript, systemPrompt) => {
    const response = await fetcher('http://127.0.0.1:8181/v1/chat/completions', {
      method: 'POST', signal: AbortSignal.timeout(3500), headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'avyro-local', temperature: 0, max_tokens: 100, response_format: { type: 'json_object' }, messages: [
        { role: 'system', content: systemPrompt + ' Examples: "take me home" -> {"intent":{"kind":"navigate-saved","slot":"home"}}; "find coffee" -> {"intent":{"kind":"find-nearby","category":"coffee"}}; "navigate to Paris" -> {"intent":{"kind":"navigate-to-place","query":"Paris"}}. Return only one JSON object.' },
        { role: 'user', content: transcript },
      ] }),
    });
    if (!response.ok) throw Error('Local classifier unavailable.');
    const reader = response.body?.getReader(); if (!reader) throw Error('Local response rejected.');
    let bytes = 0; const chunks = [];
    while (true) {
      const { value, done } = await reader.read(); if (done) break;
      bytes += value.length;
      if (bytes > 65536) { await reader.cancel(); throw Error('Local response rejected.'); }
      chunks.push(Buffer.from(value));
    }
    const content = JSON.parse(Buffer.concat(chunks).toString('utf8')).choices?.[0]?.message?.content;
    if (typeof content !== 'string' || content.length > 4096) throw Error('Local response rejected.');
    return JSON.parse(content);
  };
}
