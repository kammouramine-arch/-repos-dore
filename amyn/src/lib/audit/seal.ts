/**
 * Audits « scellés » — la couche de confidentialité des audits réels.
 *
 * Un audit de prospect n'est jamais versionné en clair. Il est chiffré
 * (AES-256-GCM) avec une clé aléatoire propre à cet audit ; seul le texte
 * chiffré est publié, sous un identifiant aléatoire. La clé n'existe que
 * dans le lien remis au prospect, après le `#` :
 *
 *   https://www.amyn.agency/audit/p/<identifiant>#k=<clé>
 *
 * Ce qui suit le `#` n'est jamais envoyé au serveur (ni journaux, ni
 * référent) : le déchiffrement a lieu dans le navigateur du lecteur.
 * Sans la clé, la page ne montre qu'un message « lien incomplet ».
 *
 * Ce n'est PAS une authentification : quiconque possède le lien complet
 * peut lire l'audit. Pour révoquer un lien, re-sceller l'audit (nouvelle
 * clé) ou supprimer son fichier, puis redéployer. Le jour où un vrai
 * contrôle d'accès existe (comptes, mots de passe), il remplace
 * `openSealedAudit` sans toucher au rendu (AuditDocument).
 *
 * Module autonome (Web Crypto) : utilisé par le navigateur, par le script
 * `npm run audit:seal` et par les tests.
 */
import { auditIssues } from "./model.ts";
import type { AuditLocale, RevenueAudit } from "./types.ts";

export type SealedAudit = {
  v: 1;
  /** 32 caractères hexadécimaux aléatoires (128 bits). */
  id: string;
  locale: AuditLocale;
  alg: "A256GCM";
  iv: string;
  ct: string;
};

const SEALED_ID = /^[a-f0-9]{32}$/;
export const isSealedId = (id: string) => SEALED_ID.test(id);

/* --- Encodages ------------------------------------------------------------ */

function toB64url(bytes: Uint8Array): string {
  let bin = "";
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromB64url(s: string): Uint8Array<ArrayBuffer> {
  const bin = atob(s.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((s.length + 3) % 4));
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

const hex = (bytes: Uint8Array) => Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
const random = (n: number) => crypto.getRandomValues(new Uint8Array(n));
const aad = (id: string, locale: string) => new TextEncoder().encode(`amyn-audit:${id}:${locale}`);

/* --- Sceller / ouvrir ------------------------------------------------------ */

export function newSealedId(): string {
  return hex(random(16));
}

export async function sealAudit(audit: RevenueAudit, id: string = newSealedId()): Promise<{ sealed: SealedAudit; key: string }> {
  if (!isSealedId(id)) throw new Error("Identifiant invalide (32 caractères hexadécimaux attendus).");
  const data = validateAudit({ ...audit, slug: id });
  const rawKey = random(32);
  const iv = random(12);
  const key = await crypto.subtle.importKey("raw", rawKey, "AES-GCM", false, ["encrypt"]);
  const ct = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv, additionalData: aad(id, data.locale) },
    key,
    new TextEncoder().encode(JSON.stringify(data)),
  );
  return {
    sealed: { v: 1, id, locale: data.locale, alg: "A256GCM", iv: toB64url(iv), ct: toB64url(new Uint8Array(ct)) },
    key: toB64url(rawKey),
  };
}

/** Déchiffre et valide. Lève une erreur si la clé est fausse ou les données altérées. */
export async function openSealedAudit(sealed: SealedAudit, keyText: string): Promise<RevenueAudit> {
  const rawKey = fromB64url(keyText);
  if (rawKey.length !== 32) throw new Error("Clé invalide.");
  const key = await crypto.subtle.importKey("raw", rawKey, "AES-GCM", false, ["decrypt"]);
  const plain = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: fromB64url(sealed.iv), additionalData: aad(sealed.id, sealed.locale) },
    key,
    fromB64url(sealed.ct),
  );
  const audit = validateAudit(JSON.parse(new TextDecoder().decode(plain)));
  if (audit.slug !== sealed.id || audit.locale !== sealed.locale) throw new Error("Audit et enveloppe ne correspondent pas.");
  return audit;
}

export function isSealedAudit(x: unknown): x is SealedAudit {
  const s = x as SealedAudit;
  return !!s && s.v === 1 && s.alg === "A256GCM" && isSealedId(s.id) && (s.locale === "fr" || s.locale === "en") && typeof s.iv === "string" && typeof s.ct === "string";
}

/* --- Validation du contenu ------------------------------------------------- */

const oneOf = (v: unknown, list: readonly string[]) => typeof v === "string" && list.includes(v);
const str = (v: unknown) => typeof v === "string" && v.trim().length > 0;

/**
 * Vérifie un audit venu d'un fichier JSON (forme, valeurs autorisées, puis
 * cohérence via `auditIssues`). Renvoie l'audit ou lève une erreur listant
 * tous les problèmes.
 */
export function validateAudit(x: unknown): RevenueAudit {
  const a = x as RevenueAudit;
  const errs: string[] = [];
  const need = (ok: boolean, msg: string) => {
    if (!ok) errs.push(msg);
  };
  if (!a || typeof a !== "object") throw new Error("Audit : objet attendu.");
  need(str(a.slug), "slug");
  need(oneOf(a.locale, ["fr", "en"]), "locale (fr | en)");
  need(oneOf(a.status, ["draft", "ready", "delivered", "archived"]), "status");
  need(typeof a.fictional === "boolean", "fictional (booléen)");
  need(!!a.company && str(a.company.name) && str(a.company.industry) && str(a.company.country), "company.name / industry / country");
  need(str(a.date), "date");
  need(str(a.preparedBy), "preparedBy");
  need(!!a.summary && str(a.summary.context) && str(a.summary.primaryRecommendation), "summary.context / primaryRecommendation");
  for (const k of ["sources", "providedMetrics", "scores", "journey", "observations", "hypotheses", "opportunities", "recommendations"] as const) {
    need(Array.isArray(a[k]), `${k} (liste)`);
  }
  need(!!a.roi && Array.isArray(a.roi.assumptions) && !!a.roi.scenarios, "roi.assumptions / roi.scenarios");
  if (errs.length) throw new Error(`Audit incomplet : ${errs.join(", ")}`);

  const CATS = ["leadCapture", "response", "qualification", "followUp", "crmHandoff", "reactivation", "visibility"];
  const MODULES = ["leadCapture", "aiReception", "qualification", "routing", "crmAutomation", "followUp", "calendar", "proposalWorkflow", "reactivation", "salesCopilot", "managementDashboard"];
  const STAGES = ["discovery", "enquiry", "response", "qualification", "crm", "followUp", "meeting", "proposal", "customer"];
  const KINDS = ["website", "public_listing", "public_document", "call", "questionnaire", "company_document"];
  a.sources.forEach((s, i) => need(str(s.id) && str(s.label) && oneOf(s.kind, KINDS) && (!s.url || /^https?:\/\//.test(s.url)), `sources[${i}]`));
  a.observations.forEach((o, i) =>
    need(
      str(o.id) && str(o.title) && str(o.statement) && str(o.implication) && str(o.recommendation) && oneOf(o.provenance, ["observed", "provided"]) && oneOf(o.category, CATS) && oneOf(o.confidence, ["high", "medium", "needs_validation"]) && Array.isArray(o.sources) && (!o.stage || oneOf(o.stage, STAGES)),
      `observations[${i}]`,
    ),
  );
  a.hypotheses.forEach((h, i) => need(str(h.id) && str(h.title) && str(h.statement) && str(h.validation) && oneOf(h.category, CATS), `hypotheses[${i}]`));
  a.scores.forEach((s, i) => need(oneOf(s.id, CATS) && (s.points === null || typeof s.points === "number") && Array.isArray(s.basis) && typeof s.rationale === "string", `scores[${i}]`));
  a.journey.forEach((j, i) => need(oneOf(j.id, STAGES) && oneOf(j.status, ["verified", "needs_validation", "opportunity"]), `journey[${i}]`));
  a.opportunities.forEach((o, i) => need(str(o.id) && str(o.title) && [o.impact, o.confidence, o.complexity, o.relevance].every((r) => r === 1 || r === 2 || r === 3) && Array.isArray(o.basis), `opportunities[${i}]`));
  a.recommendations.forEach((r, i) => need(oneOf(r.module, MODULES) && oneOf(r.priority, ["critical", "high", "medium", "future"]) && str(r.what) && str(r.why) && str(r.impact) && Array.isArray(r.basis), `recommendations[${i}]`));
  a.roi.assumptions.forEach((r, i) => need(oneOf(r.origin, ["provided", "hypothesis"]) && (r.value === null || typeof r.value === "number"), `roi.assumptions[${i}]`));
  if (errs.length) throw new Error(`Audit invalide : ${errs.join(", ")}`);

  const issues = auditIssues(a);
  if (issues.length) throw new Error(`Audit incohérent : ${issues.join(" ; ")}`);
  return a;
}
