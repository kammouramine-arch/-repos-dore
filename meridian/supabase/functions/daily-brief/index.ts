// deno-lint-ignore-file no-explicit-any
import Anthropic from '@anthropic-ai/sdk';
import { fail, json, preflight } from '../_shared/http.ts';
import { requireUser } from '../_shared/supabase.ts';
import { buildContext } from '../_shared/context.ts';
import { systemPrompt } from '../_shared/prompt.ts';
import { AI_MODEL_DEFAULT } from '../_shared/limits.ts';

/**
 * Generates the morning briefing for the calling user and stores it on today's plan.
 * The app calls this when it opens in the morning; it can also be driven on a schedule
 * (see docs/BACKEND.md) — either way it writes real rows, it does not just return text.
 */
Deno.serve(async (req) => {
  const cors = preflight(req);
  if (cors) return cors;
  if (req.method !== 'POST') return fail('method_not_allowed', 'Use POST', 405);

  const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
  if (!apiKey) return fail('ai_not_configured', 'ANTHROPIC_API_KEY is not set.', 503);

  const { client: db, user, error } = await requireUser(req);
  if (!db || !user) return fail('unauthorized', error ?? 'Not authenticated', 401);

  const body = await req.json().catch(() => ({}));
  const offset = Number.isFinite(body?.timezone_offset_minutes) ? Number(body.timezone_offset_minutes) : 0;
  const context = await buildContext(db, offset);

  const anthropic = new Anthropic({ apiKey });
  let text: string;
  try {
    const response: any = await anthropic.messages.create({
      model: Deno.env.get('AI_MODEL') ?? AI_MODEL_DEFAULT,
      max_tokens: 1200,
      system: systemPrompt({
        aiName: Deno.env.get('AI_NAME') ?? 'Meridian',
        mode: 'morning_brief',
        context: context.text,
        tier: context.tier,
      }),
      messages: [{ role: 'user', content: 'Write my briefing for today.' }],
      thinking: { type: 'adaptive' },
      output_config: { effort: 'low' },
    });
    text = (response.content ?? [])
      .filter((b: any) => b.type === 'text')
      .map((b: any) => b.text)
      .join('\n')
      .trim();
  } catch {
    return fail('ai_unavailable', 'Could not generate a briefing right now.', 503);
  }

  if (!text) return fail('ai_unavailable', 'The briefing came back empty.', 503);

  const headline = text.split('\n')[0].slice(0, 220);
  const { error: writeError } = await db.from('daily_plans').upsert(
    { date: context.today, headline, summary: text, generated_by: 'ai' },
    { onConflict: 'user_id,date' },
  );
  if (writeError) return fail('db_error', writeError.message, 500);

  await db.from('notifications').insert({
    kind: 'morning_brief',
    title: 'Your day',
    body: headline,
    delivered_at: new Date().toISOString(),
  });

  return json({ date: context.today, headline, brief: text });
});
