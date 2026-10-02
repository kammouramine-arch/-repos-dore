import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { href, translatePath } from "../src/lib/i18n/routes.ts";
import { computeCapacity, countByStatus, evidence, getDemo, matrixCsv, sourcesText } from "../src/lib/proofsprint-demo.ts";

const fixture = JSON.parse(readFileSync(new URL("./fixtures/proofsprint-evidence.json", import.meta.url), "utf8"));

test("démo : données identiques au paquet fourni (evidence.json)", () => {
  assert.deepEqual(JSON.parse(JSON.stringify(evidence)), fixture);
  assert.equal(evidence.responses.length, 20);
  assert.equal(evidence.sources.length, 8);
  assert.deepEqual([countByStatus("supported"), countByStatus("review"), countByStatus("missing")], [12, 5, 3]);
  const ids = new Set(evidence.sources.map((s) => s.id));
  for (const r of evidence.responses) for (const id of r.source_ids) assert.ok(ids.has(id), `${r.id} → ${id}`);
  /* Les preuves manquantes n'ont aucune source ; les réponses négatives restent. */
  assert.ok(evidence.responses.filter((r) => r.status === "missing").every((r) => r.source_ids.length === 0));
  assert.match(evidence.responses.find((r) => r.id === "Q04")!.answer.fr, /^Non\./);
});

test("démo : adresses FR/EN et sélecteur de langue", () => {
  assert.equal(href("proofsprintDemo", "fr"), "/proofsprint/exemple");
  assert.equal(href("proofsprintDemo", "en"), "/en/proofsprint/example");
  assert.equal(translatePath("/proofsprint/exemple", "en"), "/en/proofsprint/example");
  assert.equal(translatePath("/en/proofsprint/example", "fr"), "/proofsprint/exemple");
});

test("démo : calculateur — scénarios exigés, résultat négatif conservé", () => {
  assert.deepEqual(computeCapacity({ hours: 60, rate: 150, share: 100 }), { capacity: 9000, net: -3500, breakEvenHours: 12500 / 150, coversFee: false });
  const hundred = computeCapacity({ hours: 100, rate: 150, share: 100 });
  assert.equal(hundred.capacity, 15000);
  assert.equal(hundred.net, 2500);
  assert.equal(hundred.coversFee, true);
  for (const zero of [{ hours: 60, rate: 0, share: 100 }, { hours: 60, rate: 150, share: 0 }, { hours: 0, rate: 0, share: 0 }]) {
    const r = computeCapacity(zero);
    assert.equal(r.breakEvenHours, null, "pas de seuil fini, pas de division par zéro");
    assert.ok(Number.isFinite(r.capacity) && Number.isFinite(r.net));
  }
  const odd = computeCapacity({ hours: Number.NaN, rate: -5, share: 250 });
  assert.equal(odd.capacity, 0);
  assert.equal(computeCapacity({ hours: 10, rate: 100, share: 250 }).capacity, 1000, "part bornée à 100 %");
});

test("démo : CSV UTF-8 avec BOM, accents, libellés traduits, 8 colonnes", () => {
  for (const locale of ["fr", "en"] as const) {
    const csv = matrixCsv(locale);
    assert.ok(csv.startsWith("﻿"));
    const lines = csv.slice(1).trimEnd().split("\r\n");
    assert.equal(lines.length, 21);
    for (const line of lines) assert.equal(line.match(/","/g)?.length, 7, line.slice(0, 40));
    assert.ok(csv.includes(getDemo(locale).status.missing));
  }
  const fr = matrixCsv("fr");
  assert.ok(fr.includes("Réponse proposée") && fr.includes("prévoit") && fr.includes("Allemagne"));
  assert.ok(!/supported|review/.test(fr.split("\r\n").slice(1).join()), "états traduits en français");
  const txt = sourcesText("fr");
  assert.ok(txt.startsWith("﻿DÉMONSTRATION FICTIVE") && txt.includes("S08 — Projet de politique de conservation"));
});

test("démo : aucune revendication inventée", () => {
  const text = JSON.stringify([getDemo("fr"), getDemo("en")]);
  assert.ok(!/approuvée? par le client|approved by the client|win rate (increased|improved)|taux de signature (accru|amélioré) de/i.test(text));
  assert.match(getDemo("fr").noticeTitle, /fictive/);
  assert.match(getDemo("en").noticeTitle, /Fictional/);
});
