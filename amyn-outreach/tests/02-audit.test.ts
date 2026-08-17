// AUDIT — les regles ne concluent que sur preuve, et le moteur refuse
// tout signalement de probleme non prouve.
import { test, describe } from "node:test";
import assert from "node:assert/strict";

import { ALL_RULES } from "@/lib/audit/rules";
import { VERDICTS, CONFIDENCES, type CheckResult } from "@/lib/audit/types";
import { ISSUE_TYPES } from "@/lib/constants";
import { fakeContext, fakePage, fakeProspectInput } from "./helpers";

const SLOW_HTML = `<html><head><title>Salon</title></head><body><h1>Salon</h1></body></html>`;

describe("Registre des règles", () => {
  test("les identifiants sont uniques et stables", () => {
    const ids = ALL_RULES.map((r) => r.id);
    assert.equal(new Set(ids).size, ids.length, "identifiants de règle dupliqués");
  });

  test("les règles sont triées par ordre d'exécution croissant", () => {
    const orders = ALL_RULES.map((r) => r.order);
    assert.deepEqual(orders, [...orders].sort((a, b) => a - b));
  });

  test("chaque règle expose applicable() et run()", () => {
    for (const rule of ALL_RULES) {
      assert.equal(typeof rule.applicable, "function", `${rule.id}`);
      assert.equal(typeof rule.run, "function", `${rule.id}`);
      assert.ok(rule.label.length > 0, `${rule.id} sans libellé`);
    }
  });
});

describe("Contrat de preuve", () => {
  test("aucune règle ne signale un problème sans verdict VERIFIED ou NOT_FOUND", async () => {
    const ctx = fakeContext([fakePage({ html: SLOW_HTML })]);
    for (const rule of ALL_RULES) {
      if (!rule.applicable(ctx)) continue;
      const result: CheckResult = await rule.run(ctx);

      assert.ok(VERDICTS.includes(result.verdict), `${rule.id} : verdict invalide`);
      assert.ok(CONFIDENCES.includes(result.confidence), `${rule.id} : confiance invalide`);
      assert.ok(result.observation.trim().length > 0, `${rule.id} : observation vide`);
      assert.ok(result.method.trim().length > 0, `${rule.id} : méthode non documentée`);

      if (result.isProblem) {
        assert.notEqual(result.verdict, "UNVERIFIED", `${rule.id} signale un problème non vérifié`);
        assert.ok(result.issueType, `${rule.id} signale un problème sans type`);
        assert.ok(
          Object.keys(ISSUE_TYPES).includes(result.issueType!),
          `${rule.id} utilise un type hors catalogue : ${result.issueType}`,
        );
        assert.ok(result.title, `${rule.id} signale un problème sans titre`);
      }
    }
  });

  test("un site injoignable ne produit aucune affirmation sur son contenu", async () => {
    const dead = fakePage({
      ok: false,
      status: 0,
      html: "",
      error: "getaddrinfo ENOTFOUND exemple.test",
      errorCode: "ENOTFOUND",
    });
    const ctx = fakeContext([dead], { siteReachable: false, home: dead, parsed: [], parsedHome: null });

    for (const rule of ALL_RULES) {
      if (!rule.applicable(ctx)) continue;
      const result = await rule.run(ctx);
      if (result.isProblem) {
        // Seule la présence/accessibilité peut conclure sur un site injoignable.
        assert.ok(
          ["PRESENCE", "ACCESSIBILITE"].includes(rule.category),
          `${rule.id} conclut sur le contenu d'un site injoignable`,
        );
      }
    }
  });
});

describe("Règles individuelles", () => {
  test("HTTPS : détecte http:// et le prouve par l'URL finale", async () => {
    const rule = ALL_RULES.find((r) => r.id === "site.https")!;
    const page = fakePage({ finalUrl: "http://exemple.test/", requestedUrl: "http://exemple.test/" });
    const ctx = fakeContext([page], { prospect: fakeProspectInput({ website: "http://exemple.test" }) });
    const result = await rule.run(ctx);

    assert.equal(result.isProblem, true);
    assert.equal(result.verdict, "VERIFIED");
    assert.ok(result.evidence?.targetUrl?.startsWith("http://"), "preuve absente");
  });

  test("HTTPS : ne signale rien sur un site en https", async () => {
    const rule = ALL_RULES.find((r) => r.id === "site.https")!;
    const ctx = fakeContext([fakePage({ finalUrl: "https://exemple.test/" })]);
    const result = await rule.run(ctx);
    assert.equal(result.isProblem, false);
  });

  test("Viewport : l'absence est constatée sur le HTML récupéré, jamais supposée", async () => {
    const rule = ALL_RULES.find((r) => r.id === "mobile.viewport")!;
    const ctx = fakeContext([fakePage({ html: "<html><head></head><body>Salon</body></html>" })]);
    const result = await rule.run(ctx);

    assert.equal(result.isProblem, true);
    assert.notEqual(result.verdict, "UNVERIFIED");
    assert.ok(result.evidence?.targetUrl, "le constat ne dit pas sur quelle URL il porte");
    assert.match(result.method, /viewport/i, "la méthode ne dit pas ce qui a été cherché");
  });

  test("Viewport : présence détectée comme VERIFIED sans problème", async () => {
    const rule = ALL_RULES.find((r) => r.id === "mobile.viewport")!;
    const ctx = fakeContext([
      fakePage({ html: '<html><head><meta name="viewport" content="width=device-width"></head><body>x</body></html>' }),
    ]);
    const result = await rule.run(ctx);
    assert.equal(result.isProblem, false);
  });

  test("Temps de réponse : l'observation contient la mesure, l'unité, la date et la méthode", async () => {
    const rule = ALL_RULES.find((r) => r.id === "tech.response_time")!;
    const ctx = fakeContext([fakePage({ durationMs: 4200, bytes: 142336 })]);
    const result = await rule.run(ctx);

    assert.match(result.observation, /\d/, "aucune mesure chiffrée");
    assert.match(result.observation, /s\b|ms/, "aucune unité de temps");
    assert.match(result.observation, /\d{4}-\d{2}-\d{2}/, "aucune date de mesure");
    assert.match(result.observation, /GET/, "la méthode de mesure n'est pas dite");
    assert.match(
      result.observation,
      /sans exécution de JavaScript/i,
      "les limites de la mesure ne sont pas dites",
    );
  });

  test("Temps de réponse : un site rapide n'est pas signalé comme lent", async () => {
    const rule = ALL_RULES.find((r) => r.id === "tech.response_time")!;
    const ctx = fakeContext([fakePage({ durationMs: 180, bytes: 20000 })]);
    const result = await rule.run(ctx);
    assert.equal(result.isProblem, false);
  });
});
