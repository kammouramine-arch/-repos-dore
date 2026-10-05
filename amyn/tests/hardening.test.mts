import assert from "node:assert/strict";
import { test } from "node:test";
import fs from "node:fs";
import path from "node:path";
import { TRACK_EVENTS, registerAnalyticsSink, track } from "../src/lib/analytics.ts";
import { isSealedAudit, newSealedId, openSealedAudit, sealAudit, validateAudit } from "../src/lib/audit/seal.ts";
import { salesSessionLink } from "../src/lib/booking.ts";
import { auditSummaryRows, sanitizeRevenueAudit } from "../src/lib/forms/revenue-audit.ts";
import { elanHabitatFr } from "../src/content/audits/elan-habitat.fr.ts";

/* --- Audits scellés -------------------------------------------------------- */

test("scellé : aller-retour, mauvaise clé et altération refusées", async () => {
  const id = newSealedId();
  const { sealed, key } = await sealAudit(elanHabitatFr, id);
  assert.ok(isSealedAudit(sealed));
  assert.ok(!sealed.ct.includes("Élan") && !JSON.stringify(sealed).includes("Habitat"), "aucun texte en clair");
  const opened = await openSealedAudit(sealed, key);
  assert.equal(opened.company.name, "Élan Habitat");
  assert.equal(opened.slug, id);

  const other = (await sealAudit(elanHabitatFr)).key;
  await assert.rejects(openSealedAudit(sealed, other));
  const tampered = { ...sealed, ct: sealed.ct.slice(0, -4) + (sealed.ct.endsWith("AAAA") ? "BBBB" : "AAAA") };
  await assert.rejects(openSealedAudit(tampered, key));
  /* Le texte chiffré est lié à son identifiant : impossible de le déplacer. */
  await assert.rejects(openSealedAudit({ ...sealed, id: newSealedId() }, key));
});

test("scellé : un audit incohérent ne peut pas être scellé", async () => {
  const bad = structuredClone(elanHabitatFr);
  bad.observations[0].sources = ["S99"];
  await assert.rejects(sealAudit(bad), /source inconnue/);
  assert.throws(() => validateAudit({ slug: "x" }), /incomplet/);
});

test("scellé : les fichiers publiés ne contiennent que du chiffré", () => {
  const dir = path.join(import.meta.dirname, "../src/content/audits/sealed");
  for (const f of fs.existsSync(dir) ? fs.readdirSync(dir) : []) {
    const raw = fs.readFileSync(path.join(dir, f), "utf8");
    const data = JSON.parse(raw);
    assert.ok(isSealedAudit(data), f);
    assert.deepEqual(Object.keys(data).sort(), ["alg", "ct", "id", "iv", "locale", "v"], `${f} : champs en clair interdits`);
    assert.equal(f, `${data.id}.json`);
  }
});

test("modèle d'audit : valide, et marqué comme brouillon réel", () => {
  const tpl = JSON.parse(fs.readFileSync(path.join(import.meta.dirname, "../src/content/audits/audit-template.json"), "utf8"));
  const a = validateAudit(tpl);
  assert.equal(a.fictional, false);
  assert.equal(a.status, "draft");
});

/* --- Réservation ----------------------------------------------------------- */

test("réservation : sans lien configuré, e-mail à contact@amyn.agency ; https uniquement", () => {
  const before = process.env.NEXT_PUBLIC_REVENUE_ARCHITECTURE_BOOKING_URL;
  delete process.env.NEXT_PUBLIC_REVENUE_ARCHITECTURE_BOOKING_URL;
  const mail = salesSessionLink("Session — Test");
  assert.equal(mail.kind, "email");
  assert.ok(mail.href.startsWith("mailto:contact@amyn.agency?subject="));
  process.env.NEXT_PUBLIC_REVENUE_ARCHITECTURE_BOOKING_URL = "https://agenda.example/amyn";
  assert.deepEqual(salesSessionLink("x"), { href: "https://agenda.example/amyn", external: true, kind: "booking" });
  process.env.NEXT_PUBLIC_REVENUE_ARCHITECTURE_BOOKING_URL = "javascript:alert(1)";
  assert.equal(salesSessionLink("x").kind, "email");
  if (before === undefined) delete process.env.NEXT_PUBLIC_REVENUE_ARCHITECTURE_BOOKING_URL;
  else process.env.NEXT_PUBLIC_REVENUE_ARCHITECTURE_BOOKING_URL = before;
});

/* --- Mesure ---------------------------------------------------------------- */

test("mesure : tous les événements demandés existent, un seul point d'entrée", () => {
  for (const e of [
    "revenue_os_viewed",
    "revenue_os_cta_clicked",
    "demo_started",
    "demo_completed",
    "demo_stage_viewed",
    "revenue_audit_started",
    "revenue_audit_step_completed",
    "revenue_audit_submitted",
    "audit_opened",
    "audit_section_viewed",
    "roi_interacted",
    "architecture_session_clicked",
    "audit_pdf_exported",
  ]) {
    assert.ok((TRACK_EVENTS as readonly string[]).includes(e), e);
  }
  /* Hors navigateur, ou avec un outil défaillant : jamais d'erreur. */
  registerAnalyticsSink(() => {
    throw new Error("outil en panne");
  });
  assert.doesNotThrow(() => track("demo_started"));
  registerAnalyticsSink(null);
});

/* --- E-mail de demande ----------------------------------------------------- */

test("e-mail Revenue Audit : chaque champ saisi figure dans la demande", () => {
  const v = sanitizeRevenueAudit({
    company: "Test SA",
    website: "test.fr",
    industry: "b2b",
    revenue: "2m-10m",
    team: "6-20",
    leads: "20-50",
    value: "10k-50k",
    crm: "market",
    crmName: "Un CRM",
    channels: ["website", "phone"],
    problems: ["follow-up"],
    problemDetails: "Exemple",
    name: "Camille Test",
    role: "Direction",
    email: "c@test.fr",
    phone: "+33 6 00 00 00 00",
    privacy: true,
    source: "outreach",
    lang: "en",
  });
  const text = auditSummaryRows(v).map(([k, val]) => `${k}: ${val}`).join("\n");
  for (const expected of ["Test SA", "test.fr", "Services B2B", "2 à 10 M€", "6 à 20", "20 à 50", "10 000 à 50 000 €", "Un CRM", "Site web", "Téléphone", "Relances oubliées", "Camille Test", "Direction", "c@test.fr", "+33 6 00 00 00 00", "Lue et acceptée", "message d'AMYN", "anglais"]) {
    assert.ok(text.includes(expected), `manque : ${expected}`);
  }
});
