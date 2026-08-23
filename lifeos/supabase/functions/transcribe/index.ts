// deno-lint-ignore-file no-explicit-any
import { fail, json, preflight } from '../_shared/http.ts';
import { adminClient, requireUser } from '../_shared/supabase.ts';
import { loadBilling, refundAll, spendForOperation } from '../_shared/config.ts';
import type { Meter } from '../_shared/plans.ts';

/**
 * Speech to text for the hold-to-talk button.
 *
 * The integration is complete, but it needs a provider key. Without one this returns
 * a clear 501 and the app disables the microphone rather than pretending to listen.
 * Configure with:  supabase secrets set TRANSCRIBE_PROVIDER=openai OPENAI_API_KEY=...
 */
Deno.serve(async (req) => {
  const cors = preflight(req);
  if (cors) return cors;
  if (req.method !== 'POST') return fail('method_not_allowed', 'Use POST', 405);

  const provider = (Deno.env.get('TRANSCRIBE_PROVIDER') ?? '').toLowerCase();
  const openaiKey = Deno.env.get('OPENAI_API_KEY');

  if (!provider) {
    return fail(
      'transcription_not_configured',
      'Voice input is not configured on this server. See docs/AI.md.',
      501,
    );
  }
  if (provider !== 'openai') {
    return fail('transcription_not_configured', `Unsupported TRANSCRIBE_PROVIDER "${provider}".`, 501);
  }
  if (!openaiKey) {
    return fail('transcription_not_configured', 'OPENAI_API_KEY is not set.', 501);
  }

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

  const upstream = new FormData();
  upstream.append('file', file, file.name || 'audio.m4a');
  upstream.append('model', Deno.env.get('TRANSCRIBE_MODEL') ?? 'whisper-1');
  upstream.append('response_format', 'json');

  const res = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${openaiKey}` },
    body: upstream,
  });

  if (!res.ok) {
    await refundAll(admin, user.id, billing.period.start, spend.spent as Partial<Record<Meter, number>>);
    const detail = await res.text();
    return fail('transcription_failed', `Transcription failed (${res.status}). ${detail.slice(0, 200)}`, 502);
  }

  const data: any = await res.json();
  return json({ text: String(data.text ?? '').trim(), seconds });
});
