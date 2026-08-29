// deno-lint-ignore-file no-explicit-any
import { fail, json, preflight } from '../_shared/http.ts';
import { adminClient, requireUser } from '../_shared/supabase.ts';
import { loadBilling, refundAll, spendForOperation } from '../_shared/config.ts';
import type { Meter } from '../_shared/plans.ts';
import { loadPolicy, loadRegistry, loadHealth, transcribeMetered } from '../_shared/ai/runtime.ts';

/**
 * Speech to text for the hold-to-talk button.
 *
 * Routed through the AI Router like every other model call, so this function names no
 * provider. Without an eligible audio model it returns a clear 501 and the app disables
 * the microphone rather than pretending to listen.
 */
Deno.serve(async (req) => {
  const cors = preflight(req);
  if (cors) return cors;
  if (req.method !== 'POST') return fail('method_not_allowed', 'Use POST', 405);

  /*
    No provider preamble here any more. TRANSCRIBE_PROVIDER and OPENAI_API_KEY used to
    gate this endpoint, which quietly made OpenAI a required dependency for voice. The
    router now answers "is any audio provider available" from the registry, so voice
    follows the same eligibility rules — verification, privacy, health — as everything else.
  */
  const { client: db, user, error } = await requireUser(req);
  if (!db || !user) return fail('unauthorized', error ?? 'Not authenticated', 401);

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return fail('bad_request', 'Send the recording as multipart/form-data with a "file" field.');
  }

  const file = form.get('file');
  if (!(file instanceof File)) return fail('bad_request', 'Missing "file".');
  if (file.size > 25 * 1024 * 1024) return fail('too_large', 'Recording is larger than 25 MB.', 413);

  /*
    Voice is metered in seconds. The client reports the recording length, but a client
    can lie, so the upload's size sets a floor: at the recorder's bitrate a second of
    audio is roughly 4 KB, and whichever number is larger is the one charged.
  */
  const reported = Number(form.get('duration_seconds') ?? 0);
  const claimed = Number.isFinite(reported) && reported > 0 ? reported : 0;
  const fromSize = file.size / 4000;
  const seconds = Math.max(1, Math.round(Math.max(claimed, fromSize)));

  const admin = adminClient();
  const billing = await loadBilling(db);
  const spend = await spendForOperation(admin, billing, user.id, 'voice_transcription', {
    multiplier: seconds,
  });
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

  /*
    Routed like everything else: this function no longer knows which provider transcribes
    audio, and no longer holds a provider URL. The router picks an audio-capable model
    that is enabled, verified and cleared for this data class, or refuses.
  */
  // Service role: the config rows are private and a user client cannot see them.
  const policy = await loadPolicy(admin);
  const registry = await loadRegistry(admin);
  const health = await loadHealth(admin);

  try {
    const result = await transcribeMetered(
      {
        requestId: `voice:${user.id}:${Date.now()}`,
        file,
        durationSeconds: seconds,
        language: typeof form.get('language') === 'string' ? String(form.get('language')) : undefined,
      },
      {
        userId: user.id,
        tier: billing.entitlement.plan.tier,
        registry,
        policy,
        health,
        readKey: (name) => Deno.env.get(name),
      },
    );

    return json({ text: result.text.trim(), seconds: Math.round(result.durationSeconds) });
  } catch (e: any) {
    // Nothing usable was produced, so the allowance goes back.
    await refundAll(admin, user.id, billing.period.start, spend.spent as Partial<Record<Meter, number>>);
    console.error('[transcribe] failed', JSON.stringify({
      code: e?.code ?? null,
      message: String(e?.message ?? '').slice(0, 300),
    }));
    const notConfigured = e?.code === 'PROVIDER_CONFIGURATION_ERROR'
      || e?.code === 'NO_ELIGIBLE_MODEL'
      || e?.code === 'PRIVACY_NOT_PERMITTED';
    return fail(
      notConfigured ? 'transcription_not_configured' : 'transcription_failed',
      notConfigured
        ? 'Voice input is not configured on this server. See docs/AI.md.'
        : 'Transcription failed. Nothing was charged.',
      notConfigured ? 501 : 502,
    );
  }
});
