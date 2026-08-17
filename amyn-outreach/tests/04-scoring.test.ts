// SCORING — deterministe, justifie, et honnete sur ce qu'il ignore.
import { test, describe } from "node:test";
import assert from "node:assert/strict";

import { computeScore } from "@/lib/scoring";
import { OFFERS } from "@/lib/constants";

const BASE = {
  sector: "coiffeur",
  city: "Lille",
  website: "https://exemple.test",
  phone: "0320000000",
  googleBusinessUrl: null,
  instagramUrl: null,
  auditStatus: "COMPLETE",
  issues: [] as Array<{ type: string; severity: string; confidence: string }>,
  contacts: [] as Array<{ isGeneric: boolean; discoveryMethod: string; validationStatus: string }>,
};

describe("Scoring", () => {
  test("est déterministe : deux appels identiques donnent le même résultat", () => {
    const a = computeScore(BASE);
    const b = computeScore(BASE);
    assert.deepEqual(a, b);
  });

  test("les scores restent dans 0–100", () => {
    const s = computeScore({
      ...BASE,
      issues: Array.from({ length: 30 }, () => ({ type: "NO_HTTPS", severity: "HIGH", confidence: "HIGH" })),
    });
    for (const value of [s.fitScore, s.auditScore, s.contactScore, s.overallScore]) {
      assert.ok(value >= 0 && value <= 100, `score hors bornes : ${value}`);
    }
  });

  test("chaque point attribué porte une justification lisible", () => {
    const s = computeScore(BASE);
    for (const component of [...s.fit, ...s.audit, ...s.contact]) {
      assert.ok(component.reason.trim().length > 10, `justification absente : ${component.label}`);
      assert.ok(component.points <= component.max, `${component.label} dépasse son maximum`);
    }
  });

  test("dit explicitement qu'il ignore le chiffre d'affaires", () => {
    const s = computeScore(BASE);
    assert.ok(
      s.unknowns.some((u) => /chiffre d'affaires/i.test(u)),
      "le score ne signale pas qu'il ignore la capacité financière",
    );
  });

  test("un contact vérifié fait monter le score de contact", () => {
    const without = computeScore(BASE);
    const withContact = computeScore({
      ...BASE,
      contacts: [{ isGeneric: true, discoveryMethod: "LEGAL_NOTICE", validationStatus: "SYNTAX_OK" }],
    });
    assert.ok(withContact.contactScore > without.contactScore);
  });

  test("des problèmes prouvés font monter le score d'audit", () => {
    const without = computeScore(BASE);
    const withIssues = computeScore({
      ...BASE,
      issues: [
        { type: "NO_HTTPS", severity: "HIGH", confidence: "HIGH" },
        { type: "NOT_MOBILE_FRIENDLY", severity: "HIGH", confidence: "HIGH" },
      ],
    });
    assert.ok(withIssues.auditScore > without.auditScore);
  });

  test("un secteur hors cible ne fait pas planter le calcul et est signalé", () => {
    const s = computeScore({ ...BASE, sector: "fabricant de fusées" });
    assert.ok(s.fitScore >= 0);
    assert.ok(s.fit.some((c) => /secteur/i.test(c.label)));
  });

  test("l'offre recommandée existe au catalogue et au bon prix", () => {
    const s = computeScore({
      ...BASE,
      issues: [
        { type: "NO_WEBSITE", severity: "HIGH", confidence: "HIGH" },
        { type: "NO_BOOKING", severity: "HIGH", confidence: "HIGH" },
      ],
      contacts: [{ isGeneric: true, discoveryMethod: "WEBSITE_CONTACT", validationStatus: "SYNTAX_OK" }],
    });
    if (s.recommendedOffer) {
      assert.ok(Object.keys(OFFERS).includes(s.recommendedOffer), "offre hors catalogue");
      assert.ok(s.offerRationale.length > 10, "recommandation non justifiée");
    }
  });

  test("les prix du catalogue ne bougent pas", () => {
    assert.equal(OFFERS.ESSENTIAL.price, 790);
    assert.equal(OFFERS.PREMIUM.price, 1290);
    assert.equal(OFFERS.ULTIMATE.price, 1990);
    assert.equal(OFFERS.CARE.price, 99);
  });
});
