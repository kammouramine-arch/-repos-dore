#!/usr/bin/env tsx
/**
 * ---------------------------------------------------------------------------
 * Lanceur de tests.
 *
 * Les tests ne doivent JAMAIS toucher a la base de travail ni au reseau.
 * Ce script :
 *   1. force DATABASE_URL vers une base SQLite jetable (prisma/test.db)
 *   2. force DRY_RUN=true et un transport dry-run
 *   3. recree le schema dans cette base
 *   4. lance le runner de tests de Node avec cet environnement
 * ---------------------------------------------------------------------------
 */

import { spawnSync } from "node:child_process";
import { existsSync, rmSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const dbFile = resolve(root, "prisma", "test.db");

for (const suffix of ["", "-journal"]) {
  if (existsSync(dbFile + suffix)) rmSync(dbFile + suffix);
}

const env: NodeJS.ProcessEnv = {
  ...process.env,
  DATABASE_URL: "file:./test.db",
  DRY_RUN: "true",
  MAIL_TRANSPORT: "dry-run",
  NODE_ENV: "test" as const,
  // Aucune cle : les tests ne doivent appeler aucun service externe.
  ANTHROPIC_API_KEY: "",
  GOOGLE_PLACES_API_KEY: "",
};

const push = spawnSync(
  "npx",
  ["prisma", "db", "push", "--skip-generate", "--accept-data-loss"],
  { cwd: root, env, stdio: "inherit" },
);
if (push.status !== 0) process.exit(push.status ?? 1);

import { readdirSync } from "node:fs";

const files = readdirSync(resolve(root, "tests"))
  .filter((f) => f.endsWith(".test.ts"))
  .sort()
  .map((f) => `tests/${f}`);

const run = spawnSync("npx", ["tsx", "--test", "--test-concurrency=1", ...files], {
  cwd: root,
  env,
  stdio: "inherit",
});
process.exit(run.status ?? 1);
