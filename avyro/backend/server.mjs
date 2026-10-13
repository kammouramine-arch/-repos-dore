import http from 'node:http';
import { DatabaseSync } from 'node:sqlite';
import { randomBytes, randomUUID, createHash, scrypt as derive, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';

const scrypt = promisify(derive);
const digest = (text) => createHash('sha256').update(text).digest('hex');
const categories = new Set(['accident', 'hazard', 'closure', 'police']);
const kinds = new Set(['navigate-saved', 'navigate-to-place', 'find-nearby', 'ask-eta', 'ask-remaining-distance', 'ask-fastest-route', 'ask-traffic', 'cancel-navigation', 'reroute', 'navigate-referent', 'restore-destination', 'unknown']);
const SESSION_MS = 7 * 24 * 60 * 60 * 1000;
const INCIDENT_MS = 60 * 60 * 1000;
const MAX_BODY_BYTES = 16384;
const error = (status, message) => Object.assign(new Error(message), { status });

/** No client-supplied prompt, provider URL or credential reaches the upstream. */
export function createGateway({ database = 'avyro.sqlite', providerKey = process.env.OPENAI_API_KEY, model = process.env.AVYRO_AI_MODEL, moderators = new Set((process.env.AVYRO_MODERATOR_IDS ?? '').split(',').filter(Boolean)), fetcher = fetch, now = Date.now } = {}) {
  const db = new DatabaseSync(database);
  db.exec(`PRAGMA journal_mode=WAL;
    PRAGMA foreign_keys=ON;
    CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, email TEXT UNIQUE NOT NULL, name TEXT NOT NULL, salt TEXT NOT NULL, password TEXT NOT NULL, created INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS sessions (hash TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id), expires INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS incidents (id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id), category TEXT NOT NULL, latitude REAL NOT NULL, longitude REAL NOT NULL, observed INTEGER NOT NULL, expires INTEGER NOT NULL, status TEXT NOT NULL DEFAULT 'pending', reviewer TEXT, reviewed INTEGER);
    CREATE INDEX IF NOT EXISTS incident_visibility ON incidents(status,expires);
    CREATE TABLE IF NOT EXISTS moderation_audit (id INTEGER PRIMARY KEY, incident_id TEXT NOT NULL, moderator TEXT NOT NULL, decision TEXT NOT NULL, at INTEGER NOT NULL);`);
  const buckets = new Map();
  const rate = (key, maximum, interval = 60000) => {
    const time = now();
    if (buckets.size > 10000) {
      for (const [id, bucket] of buckets) if (bucket.until <= time) buckets.delete(id);
      if (buckets.size > 10000) throw error(503, 'Please try later.');
    }
    let bucket = buckets.get(key);
    if (!bucket || bucket.until <= time) { bucket = { until: time + interval, count: 0 }; buckets.set(key, bucket); }
    if (++bucket.count > maximum) throw error(429, 'Please try later.');
  };
  const publicUser = (user) => ({ id: user.id, email: user.email, fullName: user.name, createdAt: user.created });
  const issue = (user) => {
    const token = randomBytes(32).toString('base64url');
    const expiresAt = now() + SESSION_MS;
    db.prepare('INSERT INTO sessions VALUES (?,?,?)').run(digest(token), user.id, expiresAt);
    return { token, user: publicUser(user), issuedAt: now(), expiresAt };
  };
  const authorize = (req) => {
    const token = req.headers.authorization?.match(/^Bearer ([A-Za-z0-9_-]{43})$/)?.[1];
    if (!token) throw error(401, 'Sign in required.');
    const user = db.prepare('SELECT users.* FROM users JOIN sessions ON sessions.user_id=users.id WHERE sessions.hash=? AND sessions.expires>?').get(digest(token), now());
    if (!user) throw error(401, 'Sign in required.');
    return user;
  };
  const read = async (req) => {
    if (!req.headers['content-type']?.startsWith('application/json')) throw error(415, 'JSON required.');
    const chunks = []; let length = 0;
    for await (const chunk of req) {
      length += chunk.length;
      if (length > MAX_BODY_BYTES) throw error(413, 'Request too large.');
      chunks.push(chunk);
    }
    try {
      const value = JSON.parse(Buffer.concat(chunks).toString('utf8'));
      if (!value || typeof value !== 'object' || Array.isArray(value)) throw Error();
      return value;
    } catch { throw error(400, 'Invalid request.'); }
  };
  const reply = (res, status, value) => {
    res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
    res.end(JSON.stringify(value));
  };
  const server = http.createServer(async (req, res) => {
    try {
      // Do not trust X-Forwarded-For. A deployment proxy must enforce its own limits.
      rate(`ip:${req.socket.remoteAddress}`, 120);
      if (req.headers.origin) throw error(403, 'Browser access is disabled.');
      const route = new URL(req.url, 'http://localhost').pathname;
      if (route === '/health' && req.method === 'GET') return reply(res, 200, { status: 'ok' });
      if (['/auth/register', '/auth/login'].includes(route) && req.method === 'POST') {
        rate(`auth:${req.socket.remoteAddress}`, 10, 15 * 60000);
        const { email, password, fullName } = await read(req);
        if (typeof email !== 'string' || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || typeof password !== 'string' || password.length < 8 || password.length > 128) throw error(400, 'Valid email and password required.');
        const normalized = email.trim().toLowerCase();
        const existing = db.prepare('SELECT * FROM users WHERE email=?').get(normalized);
        if (route === '/auth/register') {
          if (typeof fullName !== 'string' || fullName.trim().length < 1 || fullName.length > 100) throw error(400, 'Name required.');
          const salt = randomBytes(16).toString('hex');
          const hashed = (await scrypt(password, salt, 64, { N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 })).toString('hex');
          if (existing) throw error(409, 'Account could not be created.');
          const user = { id: randomUUID(), email: normalized, name: fullName.trim(), salt, password: hashed, created: now() };
          try { db.prepare('INSERT INTO users VALUES (?,?,?,?,?,?)').run(user.id, user.email, user.name, salt, hashed, user.created); }
          catch { throw error(409, 'Account could not be created.'); }
          return reply(res, 201, issue(user));
        }
        const candidate = await scrypt(password, existing?.salt ?? '00000000000000000000000000000000', 64, { N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 });
        const stored = existing ? Buffer.from(existing.password, 'hex') : Buffer.alloc(64);
        if (!existing || !timingSafeEqual(candidate, stored)) throw error(401, 'Email or password is incorrect.');
        return reply(res, 200, issue(existing));
      }
      const user = authorize(req);
      rate(`user:${user.id}`, 60);
      if (route === '/auth/me' && req.method === 'GET') return reply(res, 200, publicUser(user));
      if (route === '/auth/logout' && req.method === 'POST') {
        db.prepare('DELETE FROM sessions WHERE hash=?').run(digest(req.headers.authorization.slice(7)));
        return reply(res, 200, { signedOut: true });
      }
      if (route === '/ai' && req.method === 'POST') {
        rate(`ai:${user.id}`, 10);
        if (!providerKey || !model) throw error(503, 'AI is not configured.');
        const { transcript } = await read(req);
        if (typeof transcript !== 'string' || !transcript.trim() || transcript.length > 500) throw error(400, 'Invalid transcript.');
        const response = await fetcher('https://api.openai.com/v1/chat/completions', {
          method: 'POST', signal: AbortSignal.timeout(3500),
          headers: { Authorization: `Bearer ${providerKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ model, max_completion_tokens: 180, response_format: { type: 'json_object' }, messages: [
            { role: 'system', content: `Classify a navigation command. Return JSON {intent:{kind:string,slot?:string,category?:string,query?:string}}. Valid kinds: ${[...kinds].join(',')}. Slots: home,work. Categories: restaurants,coffee,fuel,parking. Destination queries must come from the driver's words. Unknown for road conditions, driving safety or negated actions. Do not answer questions or provide prose.` },
            { role: 'user', content: transcript },
          ] }),
        });
        if (!response.ok) throw error(503, 'AI is unavailable.');
        let output;
        try { output = JSON.parse((await response.json()).choices[0].message.content); } catch { throw error(502, 'AI response rejected.'); }
        const intent = output?.intent;
        if (!kinds.has(intent?.kind) || (intent.kind === 'navigate-saved' && !['home', 'work'].includes(intent.slot)) || (intent.kind === 'find-nearby' && !['restaurants', 'coffee', 'fuel', 'parking'].includes(intent.category)) || (intent.kind === 'navigate-to-place' && (typeof intent.query !== 'string' || !intent.query.trim() || intent.query.length > 200))) throw error(502, 'AI response rejected.');
        // Discard all model prose and extraneous fields; the client resolves locally.
        const safe = { kind: intent.kind };
        for (const name of ['slot', 'category', 'query']) if (typeof intent[name] === 'string') safe[name] = intent[name];
        return reply(res, 200, { choices: [{ message: { content: JSON.stringify({ intent: safe, speech: null }) } }] });
      }
      if (route === '/incidents' && req.method === 'POST') {
        rate(`report:${user.id}`, 3, 10 * 60000);
        const report = await read(req);
        const { category, latitude, longitude, observedAt, consent } = report;
        if (!categories.has(category) || !Number.isFinite(latitude) || Math.abs(latitude) > 90 || !Number.isFinite(longitude) || Math.abs(longitude) > 180 || !Number.isFinite(observedAt) || observedAt > now() + 5000 || now() - observedAt > 5 * 60000 || consent !== true) throw error(400, 'Recent observation and reporting consent required.');
        const id = randomUUID();
        // Avoid storing a precise trip trace or publishing the reporter's identity.
        db.prepare('INSERT INTO incidents (id,user_id,category,latitude,longitude,observed,expires) VALUES (?,?,?,?,?,?,?)').run(id, user.id, category, Math.round(latitude * 1000) / 1000, Math.round(longitude * 1000) / 1000, observedAt, observedAt + INCIDENT_MS);
        return reply(res, 202, { id, status: 'pending' });
      }
      if (route === '/incidents' && req.method === 'GET') {
        const url = new URL(req.url, 'http://localhost');
        const lat = Number(url.searchParams.get('latitude')), lon = Number(url.searchParams.get('longitude'));
        if (!url.searchParams.has('latitude') || !url.searchParams.has('longitude') || !Number.isFinite(lat) || Math.abs(lat) > 90 || !Number.isFinite(lon) || Math.abs(lon) > 180) throw error(400, 'Area required.');
        const observations = db.prepare("SELECT id,category,latitude,longitude,observed,expires FROM incidents WHERE status='approved' AND expires>? AND latitude BETWEEN ? AND ? AND longitude BETWEEN ? AND ? LIMIT 100").all(now(), lat - 0.1, lat + 0.1, lon - 0.1, lon + 0.1);
        return reply(res, 200, { observations, source: 'Avyro moderated community observations', verified: false });
      }
      if (route === '/moderation' && req.method === 'GET') {
        if (!moderators.has(user.id)) throw error(403, 'Moderator required.');
        return reply(res, 200, db.prepare("SELECT id,category,latitude,longitude,observed FROM incidents WHERE status='pending' AND expires>? LIMIT 100").all(now()));
      }
      if (route === '/moderation' && req.method === 'POST') {
        if (!moderators.has(user.id)) throw error(403, 'Moderator required.');
        const { id, decision } = await read(req);
        if (typeof id !== 'string' || !['approved', 'rejected'].includes(decision)) throw error(400, 'Invalid decision.');
        db.exec('BEGIN IMMEDIATE');
        try {
          const updated = db.prepare("UPDATE incidents SET status=?,reviewer=?,reviewed=? WHERE id=? AND status='pending' AND expires>?").run(decision, user.id, now(), id, now());
          if (!updated.changes) throw error(409, 'Report expired or already reviewed.');
          db.prepare('INSERT INTO moderation_audit (incident_id,moderator,decision,at) VALUES (?,?,?,?)').run(id, user.id, decision, now());
          db.exec('COMMIT');
        } catch (cause) { db.exec('ROLLBACK'); throw cause; }
        return reply(res, 200, { id, status: decision });
      }
      throw error(404, 'Not found.');
    } catch (cause) { reply(res, cause.status ?? 503, { error: cause.status ? cause.message : 'Service unavailable.' }); }
  });
  server.requestTimeout = 10000;
  server.headersTimeout = 10000;
  server.on('close', () => db.close());
  return server;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const server = createGateway();
  server.listen(Number(process.env.PORT ?? 8787), '127.0.0.1', () => console.log('Avyro gateway listening on loopback; expose only behind TLS.'));
}
