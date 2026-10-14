const kinds = new Set(['navigate-saved','navigate-to-place','find-nearby','ask-eta','ask-location','ask-remaining-distance','ask-traffic','unknown']);
const normalize = text => text.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
export const unknown = () => ({ intent: { kind: 'unknown' }, speech: null });

export function validateClassification(output, transcript) {
  const intent = output?.intent, text = normalize(transcript);
  if (!kinds.has(intent?.kind)) return unknown();
  if (intent.kind === 'navigate-saved') {
    if (!['home','work'].includes(intent.slot)) return unknown();
    if (!(intent.slot === 'home' ? /\b(?:home|maison|chez moi)\b/ : /\b(?:work|office|travail|bureau)\b/).test(text)) return unknown();
  }
  if (intent.kind === 'navigate-to-place' && (typeof intent.query !== 'string' || intent.query.trim().length < 2 || intent.query.length > 200 || !text.includes(normalize(intent.query.trim())))) return unknown();
  if (intent.kind === 'find-nearby') {
    const cues = { coffee: /\b(?:coffee|cafe|cafes)\b/, fuel: /\b(?:fuel|gas|petrol|essence|carburant|station)\b/, restaurants: /\b(?:food|eat|restaurant|restaurants|manger|repas)\b/, parking: /\b(?:parking|park|stationner|garer)\b/ };
    if (!cues[intent.category]?.test(text)) return unknown();
  }
  const safe = { kind: intent.kind };
  if (intent.kind === 'navigate-saved') safe.slot = intent.slot;
  if (intent.kind === 'navigate-to-place') safe.query = intent.query.trim();
  if (intent.kind === 'find-nearby') safe.category = intent.category;
  return { intent: safe, speech: null };
}

export async function classifyCommand(ai, transcript) {
  const text = normalize(transcript);
  if (/\b(?:don['’]t|do not|overtak\w*|lanes?|safe to|speed limit|road signs?|hazards? ahead|depass\w*|changer de voie|limitation|panneaux)\b|\b(?:ne|n['’])\b.*\b(?:pas|jamais)\b/.test(text)) return unknown();
  let timer;
  try {
    const result = await Promise.race([
      ai.run('@cf/qwen/qwen3-30b-a3b-fp8', { temperature: 0, max_tokens: 160, response_format: { type: 'json_object' }, messages: [
        { role: 'system', content: `Classify only a French or English navigation command. Return JSON {intent:{kind,slot?,query?,category?}}. Allowed kinds: ${[...kinds].join(',')}. Slots home/work; categories coffee/fuel/restaurants/parking. Query must be a substring of the user's words. No route-control commands, facts about roads, driving safety or negated actions. Return unknown if unsure. /no_think` },
        { role: 'user', content: transcript },
      ] }),
      new Promise((_, reject) => { timer = setTimeout(() => reject(Error('Classifier timeout')), 3500); }),
    ]);
    const content = result?.choices?.[0]?.message?.content;
    if (typeof content !== 'string' || content.length > 4096) return unknown();
    return validateClassification(JSON.parse(content), transcript);
  } catch { return unknown(); }
  finally { clearTimeout(timer); }
}
