import assert from "node:assert/strict";
import { test } from "node:test";
import { faq } from "../src/lib/faq.ts";
import { LEGAL_LABELS, legal, missingLegalFields } from "../src/lib/legal.ts";
import { DEFAULT_PRICING, QUOTE_LABEL, priceLabel } from "../src/lib/pricing.ts";
import { projects } from "../src/lib/projects.ts";
import { services } from "../src/lib/services.ts";

test("sept services, slugs uniques, liens internes valides", () => {
  assert.equal(services.length, 7);
  const slugs = new Set(services.map((s) => s.slug));
  assert.equal(slugs.size, 7);
  for (const s of services) {
    for (const r of s.related) assert.ok(slugs.has(r), `${s.slug} → ${r}`);
  }
  for (const p of projects) {
    for (const s of p.services) assert.ok(slugs.has(s), `${p.slug} → ${s}`);
  }
});

test("tarification : tout est sur devis au lancement", () => {
  for (const s of services) {
    assert.equal(s.pricing.mode, "quote", s.slug);
    assert.equal(priceLabel(s.pricing), QUOTE_LABEL);
  }
});

test("tarification : les autres modes sont prêts sans toucher aux pages", () => {
  assert.equal(priceLabel({ mode: "startingFrom", amount: 1490, visible: true }), "À partir de 1 490 €");
  assert.equal(priceLabel({ mode: "fixed", amount: 990, taxLabel: "HT", visible: true }), "990 € HT");
  assert.equal(priceLabel({ mode: "fixed", visible: true }), QUOTE_LABEL);
  assert.equal(priceLabel({ ...DEFAULT_PRICING, visible: false }), null);
});

test("réalisations : chaque projet déclare sa nature ; aucun faux client", () => {
  for (const p of projects) {
    assert.ok(["client", "concept", "demonstration", "exploratory"].includes(p.kind));
    assert.equal(p.kind, "concept", `${p.slug} : aucun projet client n'est enregistré à ce jour`);
  }
});

/* Formulations interdites : promesses de résultat, jargon de vente, faux
   signaux de confiance. */
const FORBIDDEN = [
  /premier sur google/i,
  /premi[èe]re position (garantie|assurée)/i,
  /nous garantissons/i,
  /garanti(e|t)? (votre|un|une) (classement|position|place)/i,
  /boostez/i,
  /r[ée]volutionn/i,
  /explosez/i,
  /\b10x\b/i,
  /game changer/i,
  /solution ultime/i,
  /num[ée]ro 1|n°\s?1/i,
  /\d+\s?\+?\s?clients/i,
  /★|étoiles/i,
];

test("rédaction : aucune promesse interdite ni faux signal de confiance", () => {
  const corpus = JSON.stringify({ services, projects, faq });
  for (const pattern of FORBIDDEN) {
    assert.ok(!pattern.test(corpus), `formulation interdite trouvée : ${pattern}`);
  }
});

test("rédaction : aucun prix affiché dans le contenu des services", () => {
  assert.ok(!/\d\s?€/.test(JSON.stringify(services)));
});

test("légal : aucune information inventée, les manques sont détectés", () => {
  for (const key of Object.keys(LEGAL_LABELS) as (keyof typeof legal)[]) {
    assert.ok(legal[key] === null || typeof legal[key] === "string");
  }
  assert.deepEqual(missingLegalFields(), [], "mentions légales obligatoires complètes");
  assert.deepEqual(missingLegalFields({ ...legal, publisherName: "X", legalForm: "EI", siren: "1", address: "A", phone: "0", publicationDirector: "X" }), []);
});

test("légal : identifiants officiels valides, mention EI, plus aucune mention provisoire", async () => {
  const { readFileSync, readdirSync } = await import("node:fs");
  const luhn = (n: string) =>
    [...n].reverse().reduce((sum, c, i) => {
      const d = Number(c) * (i % 2 ? 2 : 1);
      return sum + (d > 9 ? d - 9 : d);
    }, 0) % 10 === 0;
  const siren = (legal.siren ?? "").replace(/\s/g, "");
  const siret = (legal.siret ?? "").replace(/\s/g, "");
  assert.equal(siren, "130867757");
  assert.ok(luhn(siren) && luhn(siret) && siret.startsWith(siren) && siret.length === 14);
  assert.match(legal.legalForm ?? "", /Entrepreneur individuel \(EI\)/);
  assert.equal(legal.publicationDirector, "Amine Kammour");
  /* Activité libérale non réglementée : pas de RCS. Franchise en base : pas de n° de TVA. */
  assert.equal(legal.registration, null);
  assert.equal(legal.vatNumber, null);
  assert.equal(legal.vatMention, "TVA non applicable, article 293 B du CGI.");
  assert.equal(legal.phone, "+33 7 55 88 77 09");
  const dir = new URL("../src/views/legal/", import.meta.url);
  for (const f of readdirSync(dir)) {
    const src = readFileSync(new URL(f, dir), "utf8");
    assert.ok(!/en cours de création|being set up|pas encore attribu|COMPLÉTER/i.test(src), f);
  }
});
