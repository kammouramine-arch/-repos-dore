// deno-lint-ignore-file no-explicit-any
import Anthropic from '@anthropic-ai/sdk';
import { fail, json, preflight } from '../_shared/http.ts';
import { requireUser } from '../_shared/supabase.ts';
import { buildContext } from '../_shared/context.ts';
import { systemPrompt } from '../_shared/prompt.ts';
import { adminClient } from '../_shared/supabase.ts';
import { loadBilling, refundAll, spendForOperation } from '../_shared/config.ts';
import type { Meter } from '../_shared/plans.ts';
import { loadPolicy, loadRegistry, loadHealth, readBudget, runMetered, periodStart } from '../_shared/ai/runtime.ts';
import { TASK_PRIVACY } from '../_shared/ai/types.ts';

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

  const admin = adminClient();
  const [context, billing] = await Promise.all([buildContext(db, offset), loadBilling(db)]);

  const spend = await spendForOperation(admin, billing, user.id, 'morning_brief');
  if (!spend.ok) {
    return json(
      {
        error: {
          code: spend.code,
          message: spend.message,
          meter: spend.meter ?? null,
          upgrade_to: spend.upgradeTo ?? null,
          upgrade_name: spend.upgradeName ?? null,
          period_end: billing.period.end,
        },
      },
      spend.code === 'quota_exceeded' ? 402 : 403,
    );
  }

  const prompt = systemPrompt({
    aiName: Deno.env.get('AI_NAME') ?? 'LifeOS',
    mode: 'morning_brief',
    context: context.text,
    plan: billing.entitlement.plan.name,
    entitlements: billing.entitlement.entitlements,
  });

  /*
    Same two suppliers as ai-chat, same rule: the router is the only thing that ever
    selects a provider, and the Anthropic branch below selects nothing — it calls the
    single model the plan's routing table already named. Phase 14 removes it.
  */
  const policy = await loadPolicy(db);
  let text: string;
  try {
    if (policy.routerEnabled) {
      const registry = await loadRegistry(db);
      const health = await loadHealth(admin);
      const tier = billing.entitlement.plan.tier;
      const budget = await readBudget(admin, user.id, tier, policy);
      const budgetPolicy = policy.budgets[tier];

      const response = await runMetered(
        {
          requestId: `brief:${user.id}:${context.today}`,
          userId: user.id,
          tier,
          taskType: 'daily_planning',
          system: prompt,
          messages: [{ role: 'user', content: 'Write my briefing for today.' }],
          requiredCapabilities: [],
          qualityRequirement: budget.degraded ? 'basic' : 'standard',
          latencyRequirement: 'normal',
          privacyRequirement: TASK_PRIVACY.daily_planning,
          maxCost: Math.min(budgetPolicy.perRequestMax, budget.remaining),
          maxOutputTokens: Math.min(1200, budgetPolicy.maxOutputTokens),
          budgetRemaining: budget.remaining,
          metadata: { estimatedInputTokens: Math.ceil(prompt.length / 4) },
        },
        { admin, registry, policy, health, readKey: (name) => Deno.env.get(name), period: periodStart() },
      );
      text = response.text.trim();
    } else {
      const anthropic = new Anthropic({ apiKey });
      const response: any = await anthropic.messages.create({
        model: spend.model,
        max_tokens: 1200,
        system: prompt,
        messages: [{ role: 'user', content: 'Write my briefing for today.' }],
        thinking: { type: 'adaptive' },
        output_config: { effort: 'low' },
      });
      text = (response.content ?? [])
        .filter((b: any) => b.type === 'text')
        .map((b: any) => b.text)
        .join('\n')
        .trim();
    }
  } catch (e: any) {
    // Same reasoning as ai-chat: vague to the caller, specific in the logs.
    console.error('[daily-brief] model call failed', JSON.stringify({
      status: e?.status ?? null,
      model: spend.model,
      type: e?.error?.error?.type ?? e?.name ?? null,
      message: String(e?.message ?? '').slice(0, 500),
      request_id: e?.request_id ?? null,
    }));
    await refundAll(admin, user.id, billing.period.start, spend.spent as Partial<Record<Meter, number>>);
    return fail('ai_unavailable', 'Could not generate a briefing right now.', 503);
  }

  if (!text) {
    await refundAll(admin, user.id, billing.period.start, spend.spent as Partial<Record<Meter, number>>);
    return fail('ai_unavailable', 'The briefing came back empty.', 503);
  }

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
