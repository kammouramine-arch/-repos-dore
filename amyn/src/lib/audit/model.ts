/**
 * Calculs du Revenue Audit — fonctions pures, testées par Node.
 *
 * Le score, le niveau, le point fort, les priorités, la feuille de route
 * et le modèle économique se DÉDUISENT des données de l'audit : aucun de
 * ces éléments n'est saisi à la main.
 */
import type {
  CategoryId,
  CategoryScore,
  ModuleKey,
  ModuleRecommendation,
  Opportunity,
  RevenueAudit,
  RoiAssumption,
  RoiInputKey,
  ScenarioLevers,
} from "./types.ts";

/* --- Score ---------------------------------------------------------------- */

export const CATEGORY_MAX: Record<CategoryId, number> = {
  leadCapture: 15,
  response: 15,
  qualification: 15,
  followUp: 20,
  crmHandoff: 15,
  reactivation: 10,
  visibility: 10,
};

export const CATEGORY_ORDER = Object.keys(CATEGORY_MAX) as CategoryId[];

export type ScoreResult = {
  /** Sur 100, ramené aux seules catégories évaluées ; `null` si aucune. */
  total: number | null;
  earned: number;
  assessable: number;
  assessed: CategoryId[];
  missing: CategoryId[];
};

export function scoreAudit(scores: CategoryScore[]): ScoreResult {
  let earned = 0;
  let assessable = 0;
  const assessed: CategoryId[] = [];
  const missing: CategoryId[] = [];
  for (const id of CATEGORY_ORDER) {
    const s = scores.find((c) => c.id === id);
    if (!s || s.points === null) {
      missing.push(id);
      continue;
    }
    const max = CATEGORY_MAX[id];
    earned += Math.max(0, Math.min(max, s.points));
    assessable += max;
    assessed.push(id);
  }
  return {
    total: assessable ? Math.round((earned / assessable) * 100) : null,
    earned,
    assessable,
    assessed,
    missing,
  };
}

export type Assessment = "foundational" | "developing" | "strong" | "advanced";

export const ASSESSMENT_BANDS: [Assessment, number][] = [
  ["foundational", 0],
  ["developing", 40],
  ["strong", 60],
  ["advanced", 80],
];

export function assessmentOf(total: number): Assessment {
  let result: Assessment = "foundational";
  for (const [band, from] of ASSESSMENT_BANDS) if (total >= from) result = band;
  return result;
}

/** Catégorie la mieux notée (en proportion) parmi celles évaluées. */
export function strongestCategory(scores: CategoryScore[]): CategoryId | null {
  let best: CategoryId | null = null;
  let ratio = -1;
  for (const id of CATEGORY_ORDER) {
    const s = scores.find((c) => c.id === id);
    if (!s || s.points === null) continue;
    const r = s.points / CATEGORY_MAX[id];
    if (r > ratio) {
      ratio = r;
      best = id;
    }
  }
  return best;
}

/* --- Priorités ------------------------------------------------------------ */

export type Tier = "high" | "medium" | "lower";

/** Impact compte double ; la complexité de mise en œuvre est retranchée. */
export const opportunityValue = (o: Opportunity) => o.impact * 2 + o.confidence + o.relevance - o.complexity;

export function opportunityTier(o: Opportunity): Tier {
  const v = opportunityValue(o);
  return v >= 9 ? "high" : v >= 6 ? "medium" : "lower";
}

export function rankOpportunities(list: Opportunity[]): Record<Tier, Opportunity[]> {
  const sorted = [...list].sort((a, b) => opportunityValue(b) - opportunityValue(a));
  return {
    high: sorted.filter((o) => opportunityTier(o) === "high"),
    medium: sorted.filter((o) => opportunityTier(o) === "medium"),
    lower: sorted.filter((o) => opportunityTier(o) === "lower"),
  };
}

/* --- Feuille de route ----------------------------------------------------- */

const PRIORITY_ORDER = ["critical", "high", "medium", "future"] as const;

export type RoadmapPhase = {
  id: "architecture" | "implementation" | "deployment" | "optimization";
  from: number;
  to: number;
  modules: ModuleKey[];
};

export type Roadmap = { phases: RoadmapPhase[]; weeks: number; later: ModuleKey[] };

/**
 * Quatre phases, dimensionnées par le périmètre recommandé :
 *   architecture 2 semaines ; mise en œuvre des modules critiques et
 *   prioritaires (3 à 6 semaines selon leur nombre) ; déploiement et
 *   recette 2 semaines ; optimisation et modules « moyens » jusqu'à la
 *   13e semaine (2 semaines au moins). Les modules « plus tard » restent
 *   hors des 90 jours.
 */
export function buildRoadmap(recs: ModuleRecommendation[]): Roadmap {
  const sorted = [...recs].sort((a, b) => PRIORITY_ORDER.indexOf(a.priority) - PRIORITY_ORDER.indexOf(b.priority));
  const core = sorted.filter((r) => r.priority === "critical" || r.priority === "high").map((r) => r.module);
  const medium = sorted.filter((r) => r.priority === "medium").map((r) => r.module);
  const later = sorted.filter((r) => r.priority === "future").map((r) => r.module);
  const impl = Math.max(3, Math.min(6, 2 + Math.ceil(core.length * 0.6)));
  const opt = Math.max(2, 13 - (2 + impl + 2));
  const phases: RoadmapPhase[] = [];
  let w = 1;
  const add = (id: RoadmapPhase["id"], len: number, modules: ModuleKey[]) => {
    phases.push({ id, from: w, to: w + len - 1, modules });
    w += len;
  };
  add("architecture", 2, []);
  add("implementation", impl, core);
  add("deployment", 2, []);
  add("optimization", opt, medium);
  return { phases, weeks: w - 1, later };
}

/* --- Modèle économique ---------------------------------------------------- */

export type RoiInputs = Record<RoiInputKey, number | null>;

export const ROI_KEYS: RoiInputKey[] = ["monthlyLeads", "dealValue", "qualificationRate", "closeRate", "historicLeads", "grossMargin"];
export const ROI_REQUIRED: RoiInputKey[] = ["monthlyLeads", "dealValue", "qualificationRate", "closeRate"];

export function roiInputs(assumptions: RoiAssumption[]): RoiInputs {
  const out = {} as RoiInputs;
  for (const key of ROI_KEYS) out[key] = assumptions.find((a) => a.key === key)?.value ?? null;
  return out;
}

export type ScenarioResult = {
  customers: number;
  revenue: number;
  incremental: number;
  /** `null` si la marge n'est pas renseignée. */
  incrementalMargin: number | null;
};

export type RoiResult = {
  baseline: { customers: number; revenue: number };
  scenarios: Record<"conservative" | "central" | "upside", ScenarioResult>;
};

const pct = (v: number) => Math.max(0, Math.min(100, v)) / 100;
const pos = (v: number) => (Number.isFinite(v) ? Math.max(0, v) : 0);

/**
 * Projets signés par an = demandes × 12 × qualification × signature
 * (taux appliqué aux demandes qualifiées), plus, dans un scénario, une
 * part de l'historique réactivée puis signée au même taux.
 * Renvoie `null` tant qu'une hypothèse indispensable manque : rien n'est
 * complété en silence.
 */
export function modelRoi(inputs: RoiInputs, levers: Record<"conservative" | "central" | "upside", ScenarioLevers>): RoiResult | null {
  if (ROI_REQUIRED.some((k) => inputs[k] === null || !Number.isFinite(inputs[k] as number))) return null;
  const leads = pos(inputs.monthlyLeads as number) * 12;
  const value = pos(inputs.dealValue as number);
  const q = pct(inputs.qualificationRate as number);
  const c = pct(inputs.closeRate as number);
  const historic = inputs.historicLeads === null ? 0 : pos(inputs.historicLeads);
  const margin = inputs.grossMargin === null ? null : pct(inputs.grossMargin);

  const baseCustomers = leads * q * c;
  const baseline = { customers: baseCustomers, revenue: baseCustomers * value };

  const run = (l: ScenarioLevers): ScenarioResult => {
    const q2 = pct((inputs.qualificationRate as number) + l.qualificationLift);
    const c2 = pct((inputs.closeRate as number) + l.closeLift);
    const reactivated = historic * pct(l.reactivationRate);
    const customers = leads * q2 * c2 + reactivated * c2;
    const revenue = customers * value;
    const incremental = revenue - baseline.revenue;
    return { customers, revenue, incremental, incrementalMargin: margin === null ? null : incremental * margin };
  };

  return {
    baseline,
    scenarios: { conservative: run(levers.conservative), central: run(levers.central), upside: run(levers.upside) },
  };
}

/* --- Contrôles d'intégrité ------------------------------------------------- */

/**
 * Erreurs de cohérence d'un audit (sources citées qui n'existent pas,
 * observation sans source, note hors barème…). Les tests exigent une liste
 * vide pour chaque audit enregistré.
 */
export function auditIssues(a: RevenueAudit): string[] {
  const issues: string[] = [];
  const sourceIds = new Set(a.sources.map((s) => s.id));
  const refIds = new Set([...a.observations.map((o) => o.id), ...a.hypotheses.map((h) => h.id), ...a.providedMetrics.map((m) => m.id)]);
  for (const o of a.observations) {
    if (!o.sources.length) issues.push(`${o.id} : aucune source`);
    for (const s of o.sources) if (!sourceIds.has(s)) issues.push(`${o.id} : source inconnue ${s}`);
  }
  for (const m of a.providedMetrics) if (!sourceIds.has(m.source)) issues.push(`${m.id} : source inconnue ${m.source}`);
  for (const s of a.scores) {
    if (s.points !== null && (s.points < 0 || s.points > CATEGORY_MAX[s.id])) issues.push(`${s.id} : note hors barème`);
    if (s.points !== null && !s.basis.length) issues.push(`${s.id} : note sans fondement`);
    for (const b of s.basis) if (!refIds.has(b)) issues.push(`${s.id} : référence inconnue ${b}`);
  }
  for (const o of a.opportunities) for (const b of o.basis) if (!refIds.has(b)) issues.push(`${o.id} : référence inconnue ${b}`);
  for (const r of a.recommendations) {
    if (!r.basis.length) issues.push(`${r.module} : recommandation sans fondement`);
    for (const b of r.basis) if (!refIds.has(b)) issues.push(`${r.module} : référence inconnue ${b}`);
  }
  if (new Set(a.recommendations.map((r) => r.module)).size !== a.recommendations.length) issues.push("module recommandé deux fois");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(a.date)) issues.push("date invalide");
  if (!/^[a-z0-9-]+$/.test(a.slug)) issues.push("slug invalide");
  return issues;
}
