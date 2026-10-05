import "server-only";
import fs from "node:fs";
import path from "node:path";
import type { AuditLocale } from "./types";
import { isSealedAudit, type SealedAudit } from "./seal";

/**
 * Audits scellés publiés : `src/content/audits/sealed/<identifiant>.json`
 * (texte chiffré uniquement — voir lib/audit/seal.ts). Lus à la
 * construction ; aucune liste n'est jamais exposée.
 *
 * Frontière de stockage : pour sortir ces fichiers du dépôt (stockage privé,
 * base de données…), seule cette fonction change.
 */
const DIR = path.join(process.cwd(), "src/content/audits/sealed");

function readAll(): SealedAudit[] {
  if (!fs.existsSync(DIR)) return [];
  return fs
    .readdirSync(DIR)
    .filter((f) => f.endsWith(".json"))
    .map((f) => JSON.parse(fs.readFileSync(path.join(DIR, f), "utf8")) as unknown)
    .filter(isSealedAudit);
}

export function sealedIds(locale: AuditLocale): string[] {
  return readAll().filter((s) => s.locale === locale).map((s) => s.id);
}

export function getSealed(id: string, locale: AuditLocale): SealedAudit | undefined {
  return readAll().find((s) => s.id === id && s.locale === locale);
}
