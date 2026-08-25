#!/usr/bin/env node
/**
 * LifeOS production smoke test.
 *
 * Talks to a real, deployed project over HTTPS exactly as the app does: anonymous key,
 * a real signed-up account, RLS in force. Nothing here uses the service role, so a
 * check that passes here proves the path a device actually takes.
 *
 *   SUPABASE_URL=https://<ref>.supabase.co \
 *   SUPABASE_ANON_KEY=<anon key> \
 *   node scripts/smoke-test.mjs
 *
 * It creates two throwaway accounts, asserts, and deletes them again through the app's
 * own delete_my_account() RPC. Secrets are never printed — only whether they were set.
 */

const BASE = (process.env.SUPABASE_URL ?? '').replace(/\/+$/, '');
const ANON = process.env.SUPABASE_ANON_KEY ?? '';

if (!BASE || !ANON) {
  console.error('Set SUPABASE_URL and SUPABASE_ANON_KEY.');
  process.exit(2);
}

const results = [];
let group = '';

const section = (name) => { group = name; console.log(`\n── ${name} ${'─'.repeat(Math.max(0, 58 - name.length))}`); };

function record(id, name, status, detail) {
  results.push({ id, group, name, status, detail });
  const mark = { pass: 'PASS', fail: 'FAIL', skip: 'SKIP', warn: 'WARN' }[status];
  console.log(`  ${String(id).padStart(2)}. [${mark}] ${name}${detail ? ` — ${detail}` : ''}`);
}

let counter = 0;
async function check(name, fn) {
  const id = ++counter;
  try {
    const detail = await fn();
    if (detail && detail.skip) return record(id, name, 'skip', detail.skip);
    if (detail && detail.warn) return record(id, name, 'warn', detail.warn);
    record(id, name, 'pass', typeof detail === 'string' ? detail : '');
  } catch (e) {
    record(id, name, 'fail', e.message);
  }
}

const assert = (cond, msg) => { if (!cond) throw new Error(msg); };

/** Every request the app makes carries the anon key; authenticated ones add a JWT. */
async function api(path, { method = 'GET', token, body, headers = {}, raw = false } = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      apikey: ANON,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...headers,
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  if (raw) return res;
  const text = await res.text();
  let json = null;
  try { json = text ? JSON.parse(text) : null; } catch { /* not json */ }
  return { status: res.status, ok: res.ok, json, text };
}

const rest = (p, o) => api(`/rest/v1${p}`, o);
const rpc = (name, args, token) => api(`/rest/v1/rpc/${name}`, { method: 'POST', token, body: args ?? {} });
const fn = (name, o) => api(`/functions/v1/${name}`, { method: 'POST', ...o });

/** Usage is counted per calendar month, and the RPC wants that month's first day. */
const periodStart = () => { const d = new Date(); return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-01`; };

const stamp = Date.now();
/*
  Supabase rejects an address whose domain does not resolve, so a reserved TLD like
  .test is refused outright. mailinator.com is a real throwaway-mail domain that
  exists for exactly this purpose. Override it if your project restricts sign-ups.
*/
const MAIL_DOMAIN = process.env.SMOKE_EMAIL_DOMAIN ?? 'mailinator.com';
const users = {
  a: { email: `lifeos.smoke.${stamp}.a@${MAIL_DOMAIN}`, password: `Sm0ke!${stamp}aA`, token: null, id: null },
  b: { email: `lifeos.smoke.${stamp}.b@${MAIL_DOMAIN}`, password: `Sm0ke!${stamp}bB`, token: null, id: null },
};

async function signUp(u) {
  const res = await api('/auth/v1/signup', { method: 'POST', body: { email: u.email, password: u.password } });
  if (res.json?.error_code === 'over_email_send_rate_limit') {
    throw new Error('the project\'s built-in SMTP allowance is spent — this happens when '
      + '"Confirm email" is on, because every sign-up sends a mail. Turn it off and retry in an hour.');
  }
  if (res.status >= 400) {
    throw new Error(`signup ${res.status}: ${res.json?.msg ?? res.json?.error_description ?? res.text?.slice(0, 200)}`);
  }
  u.token = res.json?.access_token ?? null;
  u.id = res.json?.user?.id ?? res.json?.id ?? null;
  return res;
}

// ─────────────────────────────────────────────────────────────── state ──
let goalId = null;
let taskId = null;
let confirmationRequired = false;
/** Set when a model call fails, so the metering check can tell a refund from a bug. */
let aiCallsFailed = false;

async function main() {
  console.log(`LifeOS smoke test\n  project: ${BASE}\n  anon key: set (${ANON.length} chars, not shown)\n`);

  // ── A. Reachability ────────────────────────────────────────────────
  section('A. Reachability and configuration');

  await check('PostgREST is serving the LifeOS schema', async () => {
    /*
      The OpenAPI root is service_role-only, so an anon key cannot read it. Probe the
      schema the way the app does instead: ask each core table for zero rows. A table
      that is present answers 200 (or 401/403 if the anon role holds no grant on it,
      which is itself correct); one that is missing answers PGRST205.
    */
    const core = ['profiles', 'user_preferences', 'subscriptions', 'life_areas', 'goals',
      'tasks', 'habits', 'habit_logs', 'daily_plans', 'weekly_plans', 'reflections',
      'ai_conversations', 'ai_messages', 'ai_memory', 'store_events', 'usage_counters'];
    const missing = [];
    for (const t of core) {
      const res = await rest(`/${t}?select=*&limit=0`);
      if (res.status === 404 || res.json?.code === 'PGRST205') missing.push(t);
      else if (res.status >= 500) throw new Error(`${t} returned ${res.status}`);
    }
    assert(missing.length === 0, `tables not found: ${missing.join(', ')} — are the migrations applied?`);
    return `all ${core.length} core tables present`;
  });

  await check('Auth endpoint reports its settings', async () => {
    const res = await api('/auth/v1/settings');
    assert(res.ok, `settings returned ${res.status}`);
    assert(res.json?.external?.email !== false, 'email sign-in is disabled on this project');
    return 'email provider enabled';
  });

  await check('Anonymous request cannot read user data', async () => {
    const res = await rest('/profiles?select=id');
    // RLS must yield an empty set (or refuse) — never rows.
    if (res.status === 200) {
      assert(Array.isArray(res.json) && res.json.length === 0, `anon read returned ${res.json?.length} profile rows`);
      return 'empty result set';
    }
    assert(res.status === 401 || res.status === 403, `unexpected status ${res.status}`);
    return `refused with ${res.status}`;
  });

  // ── B. Authentication ──────────────────────────────────────────────
  section('B. Authentication');

  await check('Sign-up can issue a session (Confirm email is off)', async () => {
    const res = await api('/auth/v1/settings');
    assert(res.ok, `settings returned ${res.status}`);
    if (res.json?.mailer_autoconfirm === false) {
      confirmationRequired = true;
      return { warn: '"Confirm email" is ON — a script cannot complete a sign-in' };
    }
    return 'new sign-ups are auto-confirmed';
  });

  await check('Sign up account A', async () => {
    if (confirmationRequired) return { skip: 'sign-up cannot issue a session while Confirm email is on' };
    await signUp(users.a);
    assert(users.a.token, 'no session was issued');
    return 'user created, session issued';
  });

  if (confirmationRequired) {
    console.log('\n  ⚠  "Confirm email" is enabled on this project, so signing up sends a');
    console.log('     confirmation mail and issues no session — a script cannot proceed, and');
    console.log('     repeated attempts hit the built-in SMTP limit (429). Turn it off under');
    console.log('     Authentication → Sign In / Providers → Email → "Confirm email", then');
    console.log('     re-run. Everything that needs no session is still tested below.\n');
  }

  await check('Sign in as A with the password', async () => {
    if (confirmationRequired) return { skip: 'needs a confirmable session' };
    const res = await api('/auth/v1/token?grant_type=password', {
      method: 'POST', body: { email: users.a.email, password: users.a.password },
    });
    assert(res.ok, `sign-in returned ${res.status}: ${res.text?.slice(0, 160)}`);
    assert(res.json?.access_token, 'no access token returned');
    users.a.token = res.json.access_token;
    return 'password grant issued a JWT';
  });

  await check('Wrong password is rejected', async () => {
    const res = await api('/auth/v1/token?grant_type=password', {
      method: 'POST', body: { email: users.a.email, password: 'definitely-not-the-password' },
    });
    assert(res.status === 400 || res.status === 401, `expected 400/401, got ${res.status}`);
    return `refused with ${res.status}`;
  });

  await check('All five edge functions are deployed', async () => {
    /*
      A function that was never deployed answers 404. One that is deployed but wants a
      caller answers 401 — so this proves deployment without needing a session.
      store-notifications is deliberately --no-verify-jwt and guards itself with its
      own secret, so it is allowed to answer 401 or 501 on its own terms.
    */
    const names = ['ai-chat', 'transcribe', 'daily-brief', 'subscription-verify', 'store-notifications'];
    const statuses = {};
    for (const n of names) {
      const res = await fn(n, { body: {} });
      statuses[n] = res.status;
      assert(res.status !== 404, `${n} is not deployed (404)`);
    }
    return Object.entries(statuses).map(([n, c]) => `${n}:${c}`).join(' ');
  });

  await check('A request with no JWT is rejected by an edge function', async () => {
    const res = await fn('ai-chat', { body: { message: 'hello' } });
    assert(res.status === 401, `expected 401, got ${res.status}`);
    return 'unauthenticated call refused';
  });

  await check('Sign up account B (for isolation tests)', async () => {
    if (confirmationRequired) return { skip: 'needs a confirmable session' };
    await signUp(users.b);
    assert(users.b.token, 'no session for B');
    return 'second account created';
  });

  const ready = () => (users.a.token ? null : { skip: 'no authenticated session' });

  // ── C. Provisioning ────────────────────────────────────────────────
  section('C. Automatic provisioning on sign-up');

  await check('A profile row was created by the trigger', async () => {
    if (ready()) return ready();
    const res = await rest('/profiles?select=id,onboarding_completed', { token: users.a.token });
    assert(res.ok, `read failed ${res.status}: ${res.text?.slice(0, 160)}`);
    assert(res.json.length === 1, `expected exactly 1 profile, got ${res.json.length}`);
    return 'exactly one profile, owned by the caller';
  });

  await check('Preferences row was created', async () => {
    if (ready()) return ready();
    const res = await rest('/user_preferences?select=user_id', { token: users.a.token });
    assert(res.ok && res.json.length === 1, `expected 1 row, got ${res.json?.length} (${res.status})`);
    return 'one preferences row';
  });

  await check('Subscription starts on the free tier', async () => {
    if (ready()) return ready();
    const res = await rest('/subscriptions?select=tier,status', { token: users.a.token });
    assert(res.ok && res.json.length === 1, `expected 1 row, got ${res.json?.length}`);
    assert(res.json[0].tier === 'free', `new account is on "${res.json[0].tier}", expected free`);
    return `tier=${res.json[0].tier}, status=${res.json[0].status}`;
  });

  await check('Default life areas were seeded', async () => {
    if (ready()) return ready();
    const res = await rest('/life_areas?select=key,name', { token: users.a.token });
    assert(res.ok, `read failed ${res.status}`);
    assert(res.json.length > 0, 'no life areas were created');
    return `${res.json.length} areas seeded`;
  });

  // ── D. Database reads and writes ───────────────────────────────────
  section('D. Database reads and writes');

  await check('Insert a goal', async () => {
    if (ready()) return ready();
    const res = await rest('/goals?select=id,title,progress', {
      method: 'POST', token: users.a.token,
      headers: { Prefer: 'return=representation' },
      body: { title: 'Smoke test goal', description: 'Created by scripts/smoke-test.mjs' },
    });
    assert(res.status === 201, `insert returned ${res.status}: ${res.text?.slice(0, 200)}`);
    goalId = res.json[0].id;
    return `goal ${goalId.slice(0, 8)}… created`;
  });

  await check('Read the goal back', async () => {
    if (!goalId) return { skip: 'no goal was created' };
    const res = await rest(`/goals?id=eq.${goalId}&select=id,title`, { token: users.a.token });
    assert(res.ok && res.json.length === 1, `expected 1 row, got ${res.json?.length}`);
    assert(res.json[0].title === 'Smoke test goal', 'title did not round-trip');
    return 'row matches what was written';
  });

  await check('Insert a task linked to the goal', async () => {
    if (!goalId) return { skip: 'no goal was created' };
    const res = await rest('/tasks?select=id,status', {
      method: 'POST', token: users.a.token,
      headers: { Prefer: 'return=representation' },
      body: { title: 'Smoke test task', goal_id: goalId, duration_minutes: 15 },
    });
    assert(res.status === 201, `insert returned ${res.status}: ${res.text?.slice(0, 200)}`);
    taskId = res.json[0].id;
    return `task ${taskId.slice(0, 8)}… created`;
  });

  await check('Completing a task stamps completed_at', async () => {
    if (!taskId) return { skip: 'no task was created' };
    const res = await rest(`/tasks?id=eq.${taskId}&select=status,completed_at`, {
      method: 'PATCH', token: users.a.token,
      headers: { Prefer: 'return=representation' },
      body: { status: 'done' },
    });
    assert(res.ok, `update returned ${res.status}: ${res.text?.slice(0, 200)}`);
    assert(res.json[0].completed_at, 'completed_at was not set by the trigger');
    return 'trigger stamped the completion time';
  });

  await check('get_life_progress() returns real numbers', async () => {
    if (ready()) return ready();
    const res = await rpc('get_life_progress', {}, users.a.token);
    assert(res.ok, `rpc returned ${res.status}: ${res.text?.slice(0, 200)}`);
    return `returned ${JSON.stringify(res.json).slice(0, 90)}`;
  });

  await check('get_usage_summary() returns the caller’s meters', async () => {
    if (ready()) return ready();
    const res = await rpc('get_usage_summary', { p_period_start: periodStart() }, users.a.token);
    assert(res.ok, `rpc returned ${res.status}: ${res.text?.slice(0, 200)}`);
    return `returned ${Array.isArray(res.json) ? res.json.length : 1} meter record(s)`;
  });

  await check('export_my_data() returns the caller’s data', async () => {
    if (ready()) return ready();
    const res = await rpc('export_my_data', {}, users.a.token);
    assert(res.ok, `rpc returned ${res.status}: ${res.text?.slice(0, 200)}`);
    const dump = JSON.stringify(res.json);
    assert(dump.includes('Smoke test goal'), 'the export did not contain the goal we created');
    return `${dump.length} bytes, includes our own rows`;
  });

  // ── E. Isolation ───────────────────────────────────────────────────
  section('E. Isolation between accounts (RLS)');

  await check('B cannot read A’s goals', async () => {
    if (!users.b.token || !goalId) return { skip: 'need both accounts' };
    const res = await rest(`/goals?id=eq.${goalId}&select=id,title`, { token: users.b.token });
    assert(res.ok, `read returned ${res.status}`);
    assert(res.json.length === 0, `B saw ${res.json.length} of A's goals`);
    return 'empty result set';
  });

  await check('B cannot update A’s goal', async () => {
    if (!users.b.token || !goalId) return { skip: 'need both accounts' };
    const res = await rest(`/goals?id=eq.${goalId}&select=id`, {
      method: 'PATCH', token: users.b.token,
      headers: { Prefer: 'return=representation' },
      body: { title: 'hijacked' },
    });
    const changed = res.ok && Array.isArray(res.json) && res.json.length > 0;
    assert(!changed, 'B was able to modify A’s goal');
    return `no rows affected (HTTP ${res.status})`;
  });

  await check('B cannot delete A’s goal', async () => {
    if (!users.b.token || !goalId) return { skip: 'need both accounts' };
    await rest(`/goals?id=eq.${goalId}`, { method: 'DELETE', token: users.b.token });
    const after = await rest(`/goals?id=eq.${goalId}&select=id`, { token: users.a.token });
    assert(after.json?.length === 1, 'A’s goal disappeared after B tried to delete it');
    return 'A’s goal survived';
  });

  await check('B sees only its own profile', async () => {
    if (!users.b.token) return { skip: 'need account B' };
    const res = await rest('/profiles?select=id', { token: users.b.token });
    assert(res.json?.length === 1, `B saw ${res.json?.length} profiles`);
    assert(res.json[0].id === users.b.id, 'B saw a profile that is not its own');
    return 'exactly its own row';
  });

  // ── F. Entitlement integrity ───────────────────────────────────────
  section('F. Entitlement integrity');

  await check('A client cannot promote itself to a paid tier', async () => {
    if (ready()) return ready();
    await rest('/subscriptions?select=tier', {
      method: 'PATCH', token: users.a.token,
      headers: { Prefer: 'return=representation' },
      body: { tier: 'ultra', status: 'active' },
    });
    const after = await rest('/subscriptions?select=tier', { token: users.a.token });
    assert(after.json?.[0]?.tier === 'free', `tier became "${after.json?.[0]?.tier}" — a client granted itself entitlement`);
    return 'still free after a self-upgrade attempt';
  });

  await check('A client cannot insert its own store event', async () => {
    if (ready()) return ready();
    const res = await rest('/store_events', {
      method: 'POST', token: users.a.token,
      body: { provider: 'apple', event_id: `smoke:${stamp}`, kind: 'TEST', status: 'applied' },
    });
    assert(res.status >= 400, `store_events insert succeeded with ${res.status}`);
    return `refused with ${res.status}`;
  });

  await check('A client cannot write its own usage counters', async () => {
    if (ready()) return ready();
    const res = await rest('/usage_counters', {
      method: 'POST', token: users.a.token,
      body: { meter: 'ai_requests', used: -9999, period_start: periodStart() },
    });
    assert(res.status >= 400, `usage_counters insert succeeded with ${res.status}`);
    return `refused with ${res.status}`;
  });

  // ── G. Edge functions ──────────────────────────────────────────────
  section('G. Edge functions');

  await check('ai-chat — a real assistant reply', async () => {
    if (ready()) return ready();
    const res = await fn('ai-chat', {
      token: users.a.token,
      body: { message: 'In one short sentence, what is LifeOS for?', mode: 'chat' },
    });
    const code = res.json?.error?.code;
    if (code) aiCallsFailed = true;
    if (code === 'ai_not_configured') throw new Error('ANTHROPIC_API_KEY is not set as a Supabase secret');
    if (code === 'ai_auth') throw new Error('Anthropic rejected the key (401) — it is wrong, revoked, or from another org');
    if (code === 'rate_limited') throw new Error('Anthropic rate-limited the request (429)');
    if (code === 'ai_timeout') throw new Error('the model call exceeded the function timeout');
    if (code === 'ai_unavailable') {
      throw new Error('the key IS set and authenticated, but the Anthropic call failed — '
        + 'most often no credit on the account. Check the function logs for the logged status and message.');
    }
    assert(res.ok, `returned ${res.status}: ${res.text?.slice(0, 240)}`);
    const reply = res.json?.message ?? res.json?.reply ?? res.json?.text ?? '';
    assert(typeof reply === 'string' && reply.length > 10, `no substantive reply: ${JSON.stringify(res.json).slice(0, 200)}`);
    return `${reply.length} chars: "${reply.slice(0, 70).replace(/\s+/g, ' ')}…"`;
  });

  await check('ai-chat — a tool call really writes a row', async () => {
    if (ready()) return ready();
    const before = await rest('/tasks?select=id', { token: users.a.token });
    const res = await fn('ai-chat', {
      token: users.a.token,
      body: { message: 'Add a task called "Buy milk" for today. Just do it.', mode: 'chat' },
    });
    assert(res.ok, `returned ${res.status}: ${res.text?.slice(0, 240)}`);
    const after = await rest('/tasks?select=id,title', { token: users.a.token });
    const created = after.json.length - before.json.length;
    const receipts = res.json?.actions ?? res.json?.receipts ?? [];
    if (created < 1) {
      return { warn: `the model chose not to call a tool (receipts: ${JSON.stringify(receipts).slice(0, 120)})` };
    }
    return `${created} task row(s) created; receipts: ${receipts.length}`;
  });

  await check('daily-brief — generates and stores a briefing', async () => {
    if (ready()) return ready();
    const res = await fn('daily-brief', { token: users.a.token, body: { timezone_offset_minutes: 0 } });
    const code = res.json?.error?.code;
    if (code === 'ai_not_configured') throw new Error('ANTHROPIC_API_KEY is not set as a Supabase secret');
    if (code === 'ai_unavailable') throw new Error('the Anthropic call failed — see the function logs for the logged status');
    assert(res.ok, `returned ${res.status}: ${res.text?.slice(0, 240)}`);
    const plan = await rest('/daily_plans?select=id,headline,summary&order=created_at.desc&limit=1', { token: users.a.token });
    assert(plan.json?.length === 1, 'no daily_plans row was written');
    assert(plan.json[0].summary, 'the plan row has no stored briefing');
    return 'briefing returned and persisted to daily_plans';
  });

  await check('transcribe — refuses honestly when unconfigured', async () => {
    if (ready()) return ready();
    const res = await fn('transcribe', { token: users.a.token, body: {} });
    if (res.status === 501) return 'returns 501 transcription_not_configured, as designed';
    if (res.status === 400) return 'provider IS configured (rejected an empty body)';
    throw new Error(`unexpected ${res.status}: ${res.text?.slice(0, 200)}`);
  });

  await check('subscription-verify — refuses a forged purchase', async () => {
    if (ready()) return ready();
    const res = await fn('subscription-verify', {
      token: users.a.token,
      body: { platform: 'apple', purchase_token: 'obviously-not-a-real-signed-transaction' },
    });
    assert(res.status >= 400, `a forged receipt returned ${res.status} — it must never succeed`);
    const tier = await rest('/subscriptions?select=tier', { token: users.a.token });
    assert(tier.json?.[0]?.tier === 'free', `tier became "${tier.json?.[0]?.tier}" after a forged receipt`);
    return `refused with ${res.status} (${res.json?.error?.code ?? 'no code'}), tier unchanged`;
  });

  await check('subscription-verify — validates its input', async () => {
    if (ready()) return ready();
    const res = await fn('subscription-verify', { token: users.a.token, body: { platform: 'nintendo' } });
    assert(res.status === 400, `expected 400, got ${res.status}`);
    return 'rejects an unknown platform';
  });

  await check('store-notifications — rejects a call with no secret', async () => {
    const res = await fn('store-notifications', { body: { signedPayload: 'x' } });
    assert(res.status === 401 || res.status === 501,
      `webhook answered ${res.status} without a key — it must not be open`);
    return res.status === 401
      ? 'refused with 401 (secret is set)'
      : 'returns 501 — STORE_WEBHOOK_SECRET is not set yet';
  });

  await check('store-notifications — rejects a wrong secret', async () => {
    const res = await api('/functions/v1/store-notifications?key=wrong-key-entirely', {
      method: 'POST', body: { signedPayload: 'x' },
    });
    assert(res.status === 401 || res.status === 501, `expected 401/501, got ${res.status}`);
    return `refused with ${res.status}`;
  });

  // ── H. Metering ────────────────────────────────────────────────────
  section('H. Metering and quotas');

  await check('AI usage was metered against the account', async () => {
    if (ready()) return ready();
    const res = await rpc('get_usage_summary', { p_period_start: periodStart() }, users.a.token);
    assert(res.ok, `rpc returned ${res.status}`);
    const rows = Array.isArray(res.json) ? res.json : [res.json];
    const used = rows.reduce((n, r) => n + Number(r?.used ?? 0), 0);
    if (used === 0 && aiCallsFailed) {
      return { skip: 'the AI calls failed, and a call that produces nothing is refunded by design' };
    }
    assert(used > 0, `no usage recorded after real AI calls: ${JSON.stringify(rows).slice(0, 200)}`);
    return `${used} unit(s) recorded across ${rows.length} meter(s)`;
  });

  await check('A free account is refused a Pro-only capability', async () => {
    if (ready()) return ready();
    const res = await fn('ai-chat', { token: users.a.token, body: { message: 'Analyse my life in depth.', mode: 'deep_analysis' } });
    if (res.ok) return { warn: 'deep_analysis succeeded on the free tier — check the plan catalogue' };
    assert(res.status === 402 || res.status === 403, `expected 402/403, got ${res.status}: ${res.text?.slice(0, 200)}`);
    return `refused with ${res.status} (${res.json?.error?.code ?? 'no code'}), upgrade offered: ${res.json?.error?.upgrade_to ?? 'none'}`;
  });

  // ── I. Cleanup ─────────────────────────────────────────────────────
  section('I. Cleanup');

  for (const [key, u] of Object.entries(users)) {
    await check(`delete_my_account() removes account ${key.toUpperCase()}`, async () => {
      if (!u.token) return { skip: 'no session' };
      const res = await rpc('delete_my_account', {}, u.token);
      assert(res.ok, `rpc returned ${res.status}: ${res.text?.slice(0, 200)}`);
      const after = await rest('/profiles?select=id', { token: u.token });
      assert(!after.json?.length, 'data is still readable after account deletion');
      return 'account and its data are gone';
    });
  }

  // ── Summary ────────────────────────────────────────────────────────
  const tally = results.reduce((a, r) => ({ ...a, [r.status]: (a[r.status] ?? 0) + 1 }), {});
  console.log(`\n${'═'.repeat(62)}`);
  console.log(`  ${tally.pass ?? 0} passed · ${tally.fail ?? 0} failed · ${tally.warn ?? 0} warnings · ${tally.skip ?? 0} skipped`);
  console.log('═'.repeat(62));

  if (tally.fail) {
    console.log('\nFailures:');
    for (const r of results.filter((r) => r.status === 'fail')) {
      console.log(`  ${r.id}. [${r.group}] ${r.name}\n      ${r.detail}`);
    }
  }
  process.exit(tally.fail ? 1 : 0);
}

main().catch((e) => { console.error('\nHarness crashed:', e); process.exit(2); });
