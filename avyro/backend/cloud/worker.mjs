import { createTomTomRoadProvider, ROAD_MONTHLY_CAP } from '../road-data.mjs';
import { calculateRoutes } from '../routing.mjs';
import { classifyCommand } from './classify.mjs';
import { transcribeCommand, validateCommandAudio } from './transcribe.mjs';
import { DurableObject } from 'cloudflare:workers';
import { derivePasswordValue } from './password.mjs';

const metersBetween = (a, b) => {
  const rad = Math.PI / 180, dLat = (b.latitude - a.latitude) * rad, dLon = (b.longitude - a.longitude) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.latitude * rad) * Math.cos(b.latitude * rad) * Math.sin(dLon / 2) ** 2;
  return 6371000 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(Math.max(0, 1 - h)));
};
const directionCompatible = (a,b) => a == null || b == null ? a == null && b == null : Math.abs(((a-b+540)%360)-180) <= 45;
const SESSION_MS = 7 * 86400000;
const fail = (status, message) => Object.assign(new Error(message), { status });
const b64 = bytes => Buffer.from(bytes).toString('base64url');
const hex = bytes => Buffer.from(bytes).toString('hex');
const hash = async text => hex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text)));
const publicUser = u => ({ id: u.id, email: u.email, fullName: u.name, createdAt: u.created });
const json = (body, status = 200) => Response.json(body, { status, headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' } });
async function body(request, maximum = 16384) {
  if (!request.headers.get('content-type')?.startsWith('application/json')) throw fail(415, 'JSON required.');
  const reader = request.body?.getReader();
  if (!reader) throw fail(400, 'JSON required.');
  const chunks = []; let size = 0;
  while (true) {
    const { value, done } = await reader.read(); if (done) break;
    size += value.length; if (size > maximum) { await reader.cancel(); throw fail(413, 'Request too large.'); }
    chunks.push(Buffer.from(value));
  }
  try { const value = JSON.parse(Buffer.concat(chunks).toString('utf8')); if (!value || typeof value !== 'object' || Array.isArray(value)) throw Error(); return value; }
  catch { throw fail(400, 'JSON required.'); }
}
async function rate(db, key, limit, window = 60000) {
  const at = Date.now(), period = Math.floor(at / window), expires = (period + 1) * window;
  // One atomic SQL operation; different Worker instances share the same limits.
  const row = await db.prepare('INSERT INTO rate_limits (key,count,expires) VALUES (?,1,?) ON CONFLICT(key) DO UPDATE SET count=count+1 RETURNING count').bind(`${key}:${period}`, expires).first();
  if (row.count > limit) throw fail(429, 'Please try again later.');
}
// Password hashing must not be weakened to fit the regular Free Worker's 10 ms
// CPU ceiling. A SQLite-backed Free Durable Object has a 30-second CPU budget.
export class PasswordHasher extends DurableObject {
  async derive(password, salt) {
    if (typeof password !== 'string' || password.length > 128 || typeof salt !== 'string' || salt.length > 100) throw Error('Invalid password input.');
    return derivePasswordValue(password, salt);
  }
}
const derivePassword = (password, salt, env) => env.PASSWORD_HASHER.get(env.PASSWORD_HASHER.idFromName('passwords')).derive(password, salt);
async function issue(db, user, guest = false) {
  const token = b64(crypto.getRandomValues(new Uint8Array(32))), issuedAt = Date.now(), expiresAt = issuedAt + SESSION_MS;
  await db.prepare('INSERT INTO sessions VALUES (?,?,?)').bind(await hash(token), user.id, expiresAt).run();
  return guest ? { token, expiresAt } : { token, issuedAt, expiresAt, user: publicUser(user) };
}
async function authorize(request, db) {
  const authorization = request.headers.get('authorization');
  if (!/^Bearer [A-Za-z0-9_-]{43}$/.test(authorization ?? '')) throw fail(401, 'Session required.');
  const user = await db.prepare('SELECT u.* FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.hash=? AND s.expires>?').bind(await hash(authorization.slice(7)), Date.now()).first();
  if (!user) throw fail(401, 'Session expired.');
  return user;
}
const moderator = (user, env) => user.kind === 'account' && (env.MODERATOR_IDS ?? '').split(',').filter(Boolean).includes(user.id);

export default {
  async fetch(request, env) {
    try {
      const route = new URL(request.url).pathname, method = request.method, db = env.DB;
      if (route === '/health' && method === 'GET') return json({ status: 'ok', hosting: 'cloud', paidAi: false });
      // IP values are hashed before storage; no location trace or raw transcript is stored.
      const ip = await hash(request.headers.get('CF-Connecting-IP') ?? 'local-testing');
      await rate(db, `ip:${ip}`, 120);
      if (route === '/auth/guest' && method === 'POST') {
        await body(request);
        await rate(db, `guest:${ip}`, 10, 3600000); await rate(db, 'guest:global', 500, 86400000);
        const user = { id: crypto.randomUUID(), name: 'Guest', created: Date.now() };
        await db.prepare("INSERT INTO users (id,name,created,kind) VALUES (?,?,?,'guest')").bind(user.id, user.name, user.created).run();
        return json(await issue(db, user, true), 201);
      }
      if (['/auth/register', '/auth/login'].includes(route) && method === 'POST') {
        await rate(db, `auth:${ip}`, 8);
        await rate(db, 'auth:global', 1000, 86400000);
        const { email, password, fullName } = await body(request);
        if (typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254 || typeof password !== 'string' || password.length < 10 || password.length > 128) throw fail(400, 'Use a valid email and a password of 10–128 characters.');
        const normalized = email.trim().toLowerCase();
        const user = await db.prepare("SELECT * FROM users WHERE email=? AND kind='account'").bind(normalized).first();
        if (route === '/auth/register') {
          if (typeof fullName !== 'string' || fullName.trim().length < 2 || fullName.length > 100) throw fail(400, 'Enter your name.');
          await rate(db, 'register:global', 100, 86400000);
          if (user) throw fail(409, 'Account could not be created.');
          const salt = b64(crypto.getRandomValues(new Uint8Array(32)));
          const newUser = { id: crypto.randomUUID(), email: normalized, name: fullName.trim(), created: Date.now() };
          const passwordHash = await derivePassword(password, salt, env);
          try { await db.prepare("INSERT INTO users VALUES (?,?,?,?,?,?,'account')").bind(newUser.id, normalized, newUser.name, salt, passwordHash, newUser.created).run(); }
          catch { throw fail(409, 'Account could not be created.'); }
          return json(await issue(db, newUser), 201);
        }
        const candidate = await derivePassword(password, user?.salt ?? '00000000000000000000000000000000', env);
        // Compare all bytes, including nonexistent users, without an early exit.
        const stored = user?.password ?? '0'.repeat(64); let difference = 0;
        for (let i = 0; i < 64; i++) difference |= candidate.charCodeAt(i) ^ stored.charCodeAt(i);
        if (!user || difference) throw fail(401, 'Email or password is incorrect.');
        return json(await issue(db, user));
      }
      const user = await authorize(request, db);
      await rate(db, `user:${user.id}`, 60);
      if (route === '/auth/me' && method === 'GET') return user.kind === 'account' ? json(publicUser(user)) : json({ guest: true });
      if (route === '/auth/logout' && method === 'POST') {
        await db.prepare('DELETE FROM sessions WHERE hash=?').bind(await hash(request.headers.get('authorization').slice(7))).run();
        return json({ signedOut: true });
      }
      if (route === '/routes' && method === 'POST') {
        await rate(db, `route:${user.id}`, 15);
        return json(await calculateRoutes(await body(request), { key: env.TOMTOM_API_KEY, enabled: env.ROAD_DATA_ENABLED === 'true', reserveRequest: async () => {
          const month = 'routing:' + new Date().toISOString().slice(0, 7);
          await db.prepare('INSERT OR IGNORE INTO provider_usage VALUES (?,0)').bind(month).run();
          const reservation = await db.prepare('UPDATE provider_usage SET requests=requests+1 WHERE month=? AND requests<1000 RETURNING requests').bind(month).first();
          if (!reservation) throw fail(429, 'Free route testing allowance exhausted.');
        } }));
      }
      if (['/roads/context', '/roads/ahead'].includes(route) && method === 'POST') {
        await rate(db, `road:${user.id}`, 6);
        const roads = createTomTomRoadProvider({ key: env.TOMTOM_API_KEY, enabled: env.ROAD_DATA_ENABLED === 'true', reserveRequest: async () => {
          const month = new Date().toISOString().slice(0, 7);
          await db.prepare('INSERT OR IGNORE INTO provider_usage VALUES (?,0)').bind(month).run();
          const reservation = await db.prepare('UPDATE provider_usage SET requests=requests+1 WHERE month=? AND requests<? RETURNING requests').bind(month, ROAD_MONTHLY_CAP).first();
          if (!reservation) throw fail(429, 'Road-data evaluation allowance exhausted.');
        } });
        const input = await body(request, route === '/roads/ahead' ? 32000 : 16384);
        return json(route === '/roads/ahead' ? await roads.lookupAhead(input) : await roads.lookup(input));
      }
      if (route === '/ai' && method === 'POST') {
        await rate(db, `ai:${user.id}`, 10);
        const { transcript, context } = await body(request);
        if (typeof transcript !== 'string' || transcript.length > 500 || !transcript.trim()) throw fail(400, 'Invalid command.');
        if (env.AI_ENABLED !== 'true' || !env.AI) throw fail(503, 'Cloud command assistance is disabled.');
        await rate(db, 'ai:global', 100, 86400000);
        return json({ choices: [{ message: { content: JSON.stringify(await classifyCommand(env.AI, transcript, context)) } }] });
      }
      if (route === '/speech/transcribe' && method === 'POST') {
        const { audio, language, consent } = await body(request, 900000);
        if (consent !== true || !['en', 'fr', 'auto'].includes(language)) throw fail(400, 'Command-audio consent required.');
        validateCommandAudio(audio);
        if (env.AI_ENABLED !== 'true' || !env.AI) throw fail(503, 'Cloud speech is disabled.');
        await rate(db, `speech:${ip}`, 5);
        await rate(db, `speech:user:${user.id}`, 30, 86400000);
        // At most ~35 minutes/day: under 1,650 Whisper neurons, with no paid fallback.
        await rate(db, 'speech:global', 100, 86400000);
        return json(await transcribeCommand(env.AI, audio, language));
      }
      if (route === '/incidents/feedback' && method === 'POST') {
        await rate(db, `feedback:${user.id}`, 10, 600000); await rate(db, `feedback:${ip}`, 20, 600000);
        const input = await body(request), now = Date.now();
        if (typeof input.id !== 'string' || !['confirmed','not-seen','withdraw'].includes(input.decision)) throw fail(400, 'Invalid feedback.');
        const report = await db.prepare("SELECT * FROM incidents WHERE id=? AND expires>? AND status IN ('community','approved','pending')").bind(input.id, now).first();
        if (!report) throw fail(404, 'This observation has expired.');
        if (input.decision === 'withdraw') {
          if (report.user_id !== user.id) throw fail(403, 'Only the author can withdraw a report.');
          await db.prepare("UPDATE incidents SET status='withdrawn',expires=? WHERE id=? AND user_id=?").bind(now, input.id, user.id).run();
          return json({ accepted: true });
        }
        if (![input.latitude,input.longitude,input.observedAt].every(Number.isFinite) || Math.abs(input.latitude)>90 || Math.abs(input.longitude)>180 || input.observedAt>now+5000 || now-input.observedAt>60000 || metersBetween(input, report)>150) throw fail(400, 'A recent nearby observation is required.');
        await db.prepare('INSERT INTO incident_feedback (incident_id,user_id,decision,at) VALUES (?,?,?,?) ON CONFLICT(incident_id,user_id) DO UPDATE SET decision=excluded.decision,at=excluded.at').bind(input.id,user.id,input.decision,now).run();
        // Feedback never upgrades a community report to verified. Three distinct
        // recent "not seen" reports expire it when they outweigh confirmations.
        await db.prepare("UPDATE incidents SET expires=? WHERE id=? AND status='community' AND (SELECT COUNT(*) FROM incident_feedback WHERE incident_id=? AND decision='not-seen' AND at>?)>=3 AND (SELECT COUNT(*) FROM incident_feedback WHERE incident_id=? AND decision='not-seen' AND at>?)>(SELECT COUNT(*) FROM incident_feedback WHERE incident_id=? AND decision='confirmed' AND at>?)").bind(now,input.id,input.id,now-600000,input.id,now-600000,input.id,now-600000).run();
        return json({ accepted: true });
      }
      if (route === '/incidents' && method === 'POST') {
        await rate(db, `report:${user.id}`, 3, 600000); await rate(db, `report:${ip}`, 6, 600000);
        const { category, latitude, longitude, observedAt, consent, publication, heading } = await body(request), now = Date.now();
        if (!['accident','hazard','closure','traffic','blocked-lane','weather','map-issue'].includes(category) || !Number.isFinite(latitude) || Math.abs(latitude) > 90 || !Number.isFinite(longitude) || Math.abs(longitude) > 180 || !Number.isFinite(observedAt) || observedAt > now + 5000 || now - observedAt > 300000 || consent !== true) throw fail(400, 'Recent observation and consent required.');
        const direction = Number.isFinite(heading) && heading >= 0 && heading < 360 ? heading : null;
        if (publication === 'community') {
          const nearby = (await db.prepare("SELECT i.*,d.heading FROM incidents i LEFT JOIN incident_direction d ON d.incident_id=i.id WHERE i.category=? AND i.status='community' AND i.expires>? AND i.latitude BETWEEN ? AND ? AND i.longitude BETWEEN ? AND ? LIMIT 30").bind(category,now,latitude-.001,latitude+.001,longitude-.002,longitude+.002).all()).results;
          const duplicate = nearby.find(item => metersBetween({ latitude,longitude },item)<60 && directionCompatible(direction,item.heading));
          if (duplicate) return json({ id: duplicate.id, category, latitude: duplicate.latitude, longitude: duplicate.longitude, observed: duplicate.observed, expires: duplicate.expires, status: 'community', merged: true },202);
        }
        const id = crypto.randomUUID();
        // Structured categories only: no user text or personal data enters the public pin.
        // Automated acceptance checks freshness, consent, coordinates and rate limits;
        // this never claims that the observation is factually verified.
        const status = publication === 'community' ? 'community' : 'pending';
        const report = { id, status, category, latitude: Math.round(latitude * 10000) / 10000, longitude: Math.round(longitude * 10000) / 10000, observed: observedAt, expires: now + 3600000 };
        await db.prepare('INSERT INTO incidents (id,user_id,category,latitude,longitude,observed,expires,status) VALUES (?,?,?,?,?,?,?,?)').bind(id, user.id, category, report.latitude, report.longitude, observedAt, report.expires, status).run();
        await db.prepare('INSERT INTO incident_direction (incident_id,heading) VALUES (?,?)').bind(id,direction).run();
        return json(report, 202);
      }
      if (route === '/moderation') {
        if (!moderator(user, env)) throw fail(403, 'Moderator access required.');
        if (method === 'GET') return json((await db.prepare("SELECT id,category,latitude,longitude,observed,expires,status FROM incidents WHERE status IN ('pending','community') AND expires>? ORDER BY observed DESC LIMIT 100").bind(Date.now()).all()).results);
        if (method === 'POST') {
          const { id, decision } = await body(request);
          if (typeof id !== 'string' || !['approved','rejected'].includes(decision)) throw fail(400, 'Invalid review.');
          const now = Date.now();
          // D1 batches are transactional. Audit insert only applies to a changed pending row.
          const result = await db.batch([
            db.prepare('INSERT INTO moderation_audit (incident_id,moderator,decision,at) SELECT id,?,?,? FROM incidents WHERE id=? AND status IN (\'pending\',\'community\') AND expires>?').bind(user.id, decision, now, id, now),
            db.prepare("UPDATE incidents SET status=?,reviewer=?,reviewed=? WHERE id=? AND status IN ('pending','community') AND expires>?").bind(decision, user.id, now, id, now),
          ]);
          if (!result[1].meta.changes) throw fail(404, 'Pending report not found.');
          return json({ reviewed: true });
        }
      }
      if (route === '/incidents' && method === 'GET') {
        const includeCommunity = new URL(request.url).searchParams.get('community') === '1';
        return json((await db.prepare(`SELECT id,category,latitude,longitude,observed,expires,status,(SELECT heading FROM incident_direction WHERE incident_id=incidents.id) AS heading FROM incidents WHERE category!='police' AND status IN ('approved',${includeCommunity ? "'community'" : "'approved'"}) AND expires>? ORDER BY observed DESC LIMIT 100`).bind(Date.now()).all()).results);
      }
      throw fail(404, 'Not found.');
    } catch (error) { return json({ error: error.status ? error.message : 'Service unavailable.' }, error.status ?? 503); }
  },
  async scheduled(_event, env) {
    const now = Date.now();
    await env.DB.batch([
      env.DB.prepare('DELETE FROM rate_limits WHERE expires<?').bind(now),
      env.DB.prepare('DELETE FROM sessions WHERE expires<?').bind(now),
      env.DB.prepare('DELETE FROM moderation_audit WHERE at<?').bind(now - 7 * 86400000),
      env.DB.prepare('DELETE FROM incidents WHERE expires<?').bind(now - 7 * 86400000),
      env.DB.prepare("DELETE FROM users WHERE kind='guest' AND created<? AND NOT EXISTS (SELECT 1 FROM sessions WHERE sessions.user_id=users.id) AND NOT EXISTS (SELECT 1 FROM incidents WHERE incidents.user_id=users.id)").bind(now - SESSION_MS),
    ]);
  },
};
