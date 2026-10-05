import assert from "node:assert/strict";
import { test } from "node:test";
import { AUDITS } from "../src/content/audits/index.ts";
import {
  CATEGORY_MAX,
  assessmentOf,
  auditIssues,
  buildRoadmap,
  modelRoi,
  opportunityTier,
  rankOpportunities,
  roiInputs,
  scoreAudit,
  strongestCategory,
} from "../src/lib/audit/model.ts";
import { auditPath, SAMPLE_AUDIT, translatePath } from "../src/lib/i18n/routes.ts";
import type { CategoryScore, Opportunity } from "../src/lib/audit/types.ts";

test("barème : 7 catégories, 100 points", () => {
  assert.equal(Object.values(CATEGORY_MAX).reduce((a, b) => a + b, 0), 100);
});

test("score : ramené aux catégories évaluées, sans pénaliser l'inconnu", () => {
  const scores: CategoryScore[] = [
    { id: "leadCapture", points: 15, basis: ["O1"], rationale: "" },
    { id: "followUp", points: 10, basis: ["O1"], rationale: "" },
    { id: "crmHandoff", points: null, basis: [], rationale: "" },
  ];
  const r = scoreAudit(scores);
  assert.equal(r.earned, 25);
  assert.equal(r.assessable, 35);
  assert.ok(r.missing.includes("crmHandoff") && r.missing.includes("response"));
  assert.equal(scoreAudit([]).total, null, "rien d'évalué : pas de score inventé");
  assert.equal(r.coverage, "insufficient", "2 domaines sur 7 : pas de score affiché");
  assert.equal(r.total, null);
  assert.equal(strongestCategory(scores), "leadCapture");
});

test("niveaux : bornes 40 / 60 / 80", () => {
  assert.equal(assessmentOf(39), "foundational");
  assert.equal(assessmentOf(40), "developing");
  assert.equal(assessmentOf(60), "strong");
  assert.equal(assessmentOf(80), "advanced");
});

test("priorités : impact ×2 + confiance + pertinence − complexité", () => {
  const o = (impact: 1 | 2 | 3, confidence: 1 | 2 | 3, complexity: 1 | 2 | 3, relevance: 1 | 2 | 3): Opportunity => ({ id: "x", title: "", summary: "", impact, confidence, complexity, relevance, basis: [] });
  assert.equal(opportunityTier(o(3, 3, 1, 3)), "high");
  assert.equal(opportunityTier(o(2, 2, 2, 2)), "medium");
  assert.equal(opportunityTier(o(1, 1, 3, 2)), "lower");
  const ranked = rankOpportunities([o(2, 2, 2, 2), o(3, 3, 1, 3)]);
  assert.equal(ranked.high.length, 1);
});

test("feuille de route : dimensionnée par le périmètre, 90 jours tenus", () => {
  const r = buildRoadmap([
    { module: "aiReception", priority: "critical", what: "", why: "", impact: "", basis: ["O1"] },
    { module: "reactivation", priority: "medium", what: "", why: "", impact: "", basis: ["O1"] },
    { module: "salesCopilot", priority: "future", what: "", why: "", impact: "", basis: ["O1"] },
  ]);
  assert.equal(r.weeks, 13);
  assert.deepEqual(r.phases[1].modules, ["aiReception"]);
  assert.deepEqual(r.phases[3].modules, ["reactivation"]);
  assert.deepEqual(r.later, ["salesCopilot"]);
  assert.equal(r.phases[0].from, 1);
  for (let i = 1; i < r.phases.length; i++) assert.equal(r.phases[i].from, r.phases[i - 1].to + 1);
});

test("modèle économique : formule, et rien d'inventé quand une hypothèse manque", () => {
  const inputs = { monthlyLeads: 100, dealValue: 10000, qualificationRate: 50, closeRate: 20, historicLeads: 1000, grossMargin: null };
  const lev = { qualificationLift: 0, closeLift: 0, reactivationRate: 0 };
  const r = modelRoi(inputs, { conservative: lev, central: { qualificationLift: 10, closeLift: 0, reactivationRate: 1 }, upside: lev })!;
  assert.equal(r.baseline.customers, 120);
  assert.equal(r.baseline.revenue, 1_200_000);
  assert.equal(r.scenarios.conservative.incremental, 0);
  /* 1200 × 0,6 × 0,2 = 144 ; + 1000 × 1 % × 0,2 = 2 → 146 */
  assert.ok(Math.abs(r.scenarios.central.customers - 146) < 1e-9);
  assert.equal(r.scenarios.central.incrementalMargin, null, "marge inconnue : non calculée");
  assert.equal(modelRoi({ ...inputs, closeRate: null }, { conservative: lev, central: lev, upside: lev }), null);
});

test("audits enregistrés : cohérents, slugs uniques par langue", () => {
  const keys = new Set<string>();
  for (const a of AUDITS) {
    assert.deepEqual(auditIssues(a), [], `${a.slug} : ${auditIssues(a).join(", ")}`);
    const key = `${a.locale}:${a.slug}`;
    assert.ok(!keys.has(key), `slug en double : ${key}`);
    keys.add(key);
  }
});

test("audits en clair : uniquement des exemples fictifs", () => {
  for (const a of AUDITS) assert.ok(a.fictional, `${a.slug} : un audit réel doit être scellé, jamais en clair`);
});

test("exemple Élan Habitat : fictif, mêmes calculs en français et en anglais", () => {
  const fr = AUDITS.find((a) => a.slug === SAMPLE_AUDIT.fr)!;
  const en = AUDITS.find((a) => a.slug === SAMPLE_AUDIT.en)!;
  assert.ok(fr.fictional && en.fictional);
  assert.equal(scoreAudit(fr.scores).total, 45);
  assert.equal(scoreAudit(fr.scores).coverage, "partial", "6 domaines sur 7 : évaluation partielle, annoncée");
  assert.equal(scoreAudit(en.scores).total, scoreAudit(fr.scores).total);
  assert.equal(assessmentOf(45), "developing");
  assert.deepEqual(roiInputs(fr.roi.assumptions), roiInputs(en.roi.assumptions));
  assert.equal(roiInputs(fr.roi.assumptions).grossMargin, null, "marge non communiquée : laissée vide");
  assert.equal(fr.observations.length, en.observations.length);
  assert.ok(fr.company.domain?.endsWith(".example"), "domaine réservé, jamais une vraie entreprise");
});

test("adresses : exemple bilingue, sélecteur de langue", () => {
  assert.equal(auditPath("x", "fr"), "/audit/x");
  assert.equal(auditPath("x", "en"), "/en/audit/x");
  assert.equal(translatePath(auditPath(SAMPLE_AUDIT.fr, "fr"), "en"), auditPath(SAMPLE_AUDIT.en, "en"));
  assert.equal(translatePath("/revenue-os/demo", "en"), "/en/revenue-os/demo");
});

test("score : complet à 7/7, partiel dès 4, rien en dessous", () => {
  const all = (["leadCapture", "response", "qualification", "followUp", "crmHandoff", "reactivation", "visibility"] as const).map((id) => ({ id, points: 5, basis: ["O1"], rationale: "" }));
  assert.equal(scoreAudit(all).coverage, "complete");
  assert.equal(scoreAudit(all.slice(0, 4)).coverage, "partial");
  assert.ok(scoreAudit(all.slice(0, 4)).total !== null);
  assert.equal(scoreAudit(all.slice(0, 3)).total, null);
});

test("preuves : une hypothèse seule ne note rien ; « observé » exige une source externe", () => {
  const base = structuredClone(AUDITS[0]);
  base.scores = base.scores.map((s) => (s.id === "qualification" ? { ...s, basis: ["H1"] } : s));
  assert.ok(auditIssues(base).some((i) => i.includes("hypothèses seulement")));
  const obs = structuredClone(AUDITS[0]);
  obs.observations[0] = { ...obs.observations[0], provenance: "observed", sources: ["S4"] };
  assert.ok(auditIssues(obs).some((i) => i.includes("sans source externe")));
  const prov = structuredClone(AUDITS[0]);
  prov.observations[0] = { ...prov.observations[0], provenance: "provided", sources: ["S1"] };
  assert.ok(auditIssues(prov).some((i) => i.includes("sans source de l'entreprise")));
});
