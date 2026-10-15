PRAGMA foreign_keys = ON;
CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, email TEXT UNIQUE, name TEXT NOT NULL, salt TEXT, password TEXT, created INTEGER NOT NULL, kind TEXT NOT NULL CHECK(kind IN ('guest','account')));
CREATE TABLE IF NOT EXISTS sessions (hash TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id), expires INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS session_expiry ON sessions(expires);
CREATE TABLE IF NOT EXISTS incidents (id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id), category TEXT NOT NULL, latitude REAL NOT NULL, longitude REAL NOT NULL, observed INTEGER NOT NULL, expires INTEGER NOT NULL, status TEXT NOT NULL DEFAULT 'pending', reviewer TEXT, reviewed INTEGER);
CREATE INDEX IF NOT EXISTS incident_visibility ON incidents(status,expires);
CREATE TABLE IF NOT EXISTS moderation_audit (id INTEGER PRIMARY KEY, incident_id TEXT NOT NULL, moderator TEXT NOT NULL, decision TEXT NOT NULL, at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS provider_usage (month TEXT PRIMARY KEY, requests INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS rate_limits (key TEXT PRIMARY KEY, count INTEGER NOT NULL, expires INTEGER NOT NULL);

CREATE TABLE IF NOT EXISTS incident_direction (incident_id TEXT PRIMARY KEY REFERENCES incidents(id) ON DELETE CASCADE, heading REAL);
CREATE TABLE IF NOT EXISTS incident_feedback (incident_id TEXT NOT NULL REFERENCES incidents(id) ON DELETE CASCADE, user_id TEXT NOT NULL REFERENCES users(id), decision TEXT NOT NULL CHECK(decision IN ('confirmed','not-seen')), at INTEGER NOT NULL, PRIMARY KEY(incident_id,user_id));
