import assert from "node:assert/strict";
import { test } from "node:test";
import { TRACK_EVENTS, isTrackEvent } from "../src/lib/analytics.ts";
import {
  AUDIT_STEPS,
  CHANNELS,
  EMPTY_REVENUE_AUDIT,
  INDUSTRIES,
  PROBLEMS,
  auditLabel,
  auditSummaryRows,
  sanitizeRevenueAudit,
  validateAuditStep,
  validateRevenueAudit,
  type AuditChoiceGroup,
} from "../src/lib/forms/revenue-audit.ts";
import { href, translatePath } from "../src/lib/i18n/routes.ts";
import {
  OPPORTUNITY_DEFAULTS,
  REVENUE_OS_FROM_EUR,
  computeOpportunity,
  getRevenue,
} from "../src/lib/revenue-os.ts";

/* --- Adresses ------------------------------------------------------------ */

test("Revenue OS : une adresse par langue, et le sélecteur reste sur la page", () => {
  assert.equal(href("revenueOs", "fr"), "/revenue-os");
  assert.equal(href("revenueOs", "en"), "/en/revenue-os");
  assert.equal(href("revenueAudit", "fr"), "/revenue-audit");
  assert.equal(href("revenueAudit", "en"), "/en/revenue-audit");
  assert.equal(translatePath("/revenue-os", "en"), "/en/revenue-os");
  assert.equal(translatePath("/en/revenue-audit", "fr"), "/revenue-audit");
  assert.equal(translatePath("/revenue-audit/", "en"), "/en/revenue-audit");
});

/* --- Calculateur ---------------------------------------------------------- */

test("calculateur : opportunité = demandes perdues × conversion × valeur × 12", () => {
  const r = computeOpportunity({ enquiries: 40, value: 8000, conversion: 20, lost: 10 });
  assert.equal(r.monthlyLost, 4);
  assert.ok(Math.abs(r.customersPerYear - 9.6) < 1e-9);
  assert.ok(Math.abs(r.annual - 76800) < 1e-6);
});

test("calculateur : valeurs par défaut cohérentes, zéro et valeurs absurdes gérés", () => {
  const d = computeOpportunity(OPPORTUNITY_DEFAULTS);
  assert.ok(d.annual > 0);
  assert.equal(computeOpportunity({ enquiries: 0, value: 8000, conversion: 20, lost: 10 }).annual, 0);
  assert.equal(computeOpportunity({ enquiries: 40, value: 8000, conversion: 0, lost: 10 }).annual, 0);
  const wild = computeOpportunity({ enquiries: -5, value: Number.NaN, conversion: 400, lost: 250 });
  assert.ok(Number.isFinite(wild.annual) && wild.annual >= 0, "aucun résultat négatif ou non numérique");
});

/* --- Formulaire ----------------------------------------------------------- */

const COMPLETE = {
  company: "Rénovation Exemple",
  website: "renovation-exemple.fr",
  industry: "construction",
  revenue: "2m-10m",
  team: "21-50",
  leads: "50-200",
  value: "10k-50k",
  crm: "market",
  crmName: "Un CRM",
  channels: ["website", "phone", "inconnu"],
  problems: ["follow-up", "proposals"],
  problemDetails: "Des devis envoyés restent sans relance.",
  name: "Camille Exemple",
  role: "Direction commerciale",
  email: "Camille@Renovation-Exemple.fr",
  phone: "",
  privacy: true,
  source: "outreach",
  lang: "fr",
  extra: "ignored",
};

test("Revenue Audit : une demande complète est acceptée et nettoyée", () => {
  const v = sanitizeRevenueAudit(COMPLETE);
  assert.deepEqual(validateRevenueAudit(v), {});
  assert.equal(v.email, "camille@renovation-exemple.fr");
  assert.deepEqual(v.channels, ["website", "phone"], "les choix inconnus sont écartés");
  assert.ok(!("extra" in v));
  assert.equal(v.source, "outreach");
});

test("Revenue Audit : chaque étape ne valide que ses propres champs", () => {
  const empty = { ...EMPTY_REVENUE_AUDIT, lang: "en" as const };
  assert.deepEqual(Object.keys(validateAuditStep(empty, 0)).sort(), ["company", "industry", "website"]);
  assert.deepEqual(Object.keys(validateAuditStep(empty, 1)).sort(), ["leads", "revenue", "team"]);
  assert.deepEqual(Object.keys(validateAuditStep(empty, 2)).sort(), ["channels", "crm", "value"]);
  assert.deepEqual(Object.keys(validateAuditStep(empty, 3)).sort(), ["problems"]);
  assert.deepEqual(Object.keys(validateAuditStep(empty, 4)).sort(), ["email", "name", "privacy"]);
  assert.match(validateAuditStep(empty, 0).company ?? "", /company/);
  assert.equal(AUDIT_STEPS.length, 5);
});

test("Revenue Audit : formats refusés (site, e-mail, téléphone)", () => {
  const v = sanitizeRevenueAudit({ ...COMPLETE, website: "javascript:alert(1)", email: "pas-une-adresse", phone: "abc" });
  const errors = validateRevenueAudit(v);
  assert.ok(errors.website && errors.email && errors.phone);
});

test("Revenue Audit : chaque choix a un libellé dans les deux langues", () => {
  const groups: [AuditChoiceGroup, readonly string[]][] = [
    ["industry", INDUSTRIES],
    ["channels", CHANNELS],
    ["problems", PROBLEMS],
  ];
  for (const [group, ids] of groups) {
    for (const id of ids) {
      assert.notEqual(auditLabel(group, id, "fr"), id);
      assert.notEqual(auditLabel(group, id, "en"), id);
    }
  }
  assert.equal(auditLabel("team", "200+", "fr"), "Plus de 200");
  assert.equal(auditLabel("leads", "200+", "en"), "Over 200");
});

test("Revenue Audit : la demande reçue est lisible, en français", () => {
  const rows = Object.fromEntries(auditSummaryRows(sanitizeRevenueAudit({ ...COMPLETE, lang: "en" })));
  assert.equal(rows["Secteur"], "Construction et rénovation");
  assert.equal(rows["Où les opportunités se perdent"], "Relances oubliées ou irrégulières, Devis envoyés sans suivi");
  assert.match(rows["Langue"], /anglais/);
});

/* --- Contenus ------------------------------------------------------------- */

const shape = (value: unknown): unknown =>
  Array.isArray(value)
    ? value.map(shape)
    : value && typeof value === "object"
      ? Object.fromEntries(Object.entries(value).map(([k, v]) => [k, shape(v)]))
      : typeof value;

test("Revenue OS : mêmes contenus en français et en anglais (structure identique)", () => {
  assert.deepEqual(shape(getRevenue("en")), shape(getRevenue("fr")));
});

/* Aucune promesse de résultat, aucune preuve inventée. */
const FORBIDDEN = [
  /(revenus?|chiffre d'affaires|résultats?|croissance|hausse) garanti/i,
  /guaranteed (revenue|results?|growth|roi)/i,
  /nous garantissons|we guarantee/i,
  /\d+\s?%\s?(de|more|plus|increase|hausse)/i,
  /\d+\s?\+?\s?(clients|customers|entreprises accompagnées|businesses served)/i,
  /testimonial|témoignage|★/i,
  /trusted by|ils nous font confiance/i,
  /prospection de masse|mass outreach|thousands of businesses|milliers d'entreprises/i,
  /premier sur google|first on google/i,
  /révolutionn|revolutioniz|game.?changer|10x/i,
];

test("Revenue OS : aucune promesse interdite ni faux signal de confiance", () => {
  for (const locale of ["fr", "en"] as const) {
    const corpus = JSON.stringify(getRevenue(locale));
    for (const pattern of FORBIDDEN) {
      assert.ok(!pattern.test(corpus), `${locale} : formulation interdite trouvée : ${pattern}`);
    }
  }
});

test("Revenue OS : chiffres illustratifs signalés comme tels, prix d'entrée cohérent", () => {
  const fr = getRevenue("fr");
  const en = getRevenue("en");
  assert.match(fr.dashboard.tag, /illustratif/i);
  assert.match(en.dashboard.tag, /illustrative/i);
  assert.match(fr.story.note, /fictives?/i);
  assert.match(fr.calculator.disclaimer, /garantie/i);
  assert.match(en.calculator.disclaimer, /guarantee/i);
  assert.equal(REVENUE_OS_FROM_EUR, 25000);
  assert.match(fr.offer.price.replace(/\s/g, ""), /^25000€$/);
  assert.match(en.offer.price, /^€25,000$/);
  /* Traitement de TVA non tranché pour Revenue OS : formulation neutre. */
  assert.ok(!/293 B|HT|TTC/.test(fr.offer.tax) && /TVA/.test(fr.offer.tax));
  /* Pas de prix dans le hero. */
  assert.ok(!/25/.test(JSON.stringify(fr.hero)) && !/25/.test(JSON.stringify(en.hero)));
});

/* --- Mesure --------------------------------------------------------------- */

test("événements de conversion : liste fermée", () => {
  assert.equal(new Set(TRACK_EVENTS).size, TRACK_EVENTS.length);
  assert.ok(isTrackEvent("revenue_audit_submitted"));
  assert.ok(!isTrackEvent("page_view"));
  assert.ok(!isTrackEvent(undefined));
});

/* --- Démonstration -------------------------------------------------------- */

import { DEMO_STAGES, DEMO_STEPS, getDemo } from "../src/lib/revenue-demo.ts";

test("démonstration : mêmes contenus FR/EN, chaque écran a ses étapes", () => {
  assert.deepEqual(shape(getDemo("en")), shape(getDemo("fr")));
  for (const s of DEMO_STAGES) assert.ok(DEMO_STEPS[s] > 0);
});

test("démonstration : fictive et signalée, sans promesse", () => {
  for (const locale of ["fr", "en"] as const) {
    const t = getDemo(locale);
    assert.match(t.fictional, /fictive|fictional/i);
    assert.match(t.company.note, /n'existe pas|does not exist/);
    assert.match(t.appointment.statNote, /illustrative/i);
    assert.match(t.dashboard.tag, /fictives|fictional/i);
    const corpus = JSON.stringify(t);
    for (const pattern of FORBIDDEN) assert.ok(!pattern.test(corpus), `${locale} : ${pattern}`);
  }
});
