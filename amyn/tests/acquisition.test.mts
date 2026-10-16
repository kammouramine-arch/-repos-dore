import assert from "node:assert/strict";
import { test } from "node:test";
import { ACQUISITION_FROM_EUR, ACQUISITION_SLUG, getAcquisition } from "../src/lib/acquisition.ts";
import { EMPTY_FIRST_LOOK, SERVICE_BY_SLUG, SERVICE_LABELS_EN, sanitizeFirstLook, validateFirstLook } from "../src/lib/forms/first-look.ts";
import { mainNav, ctas } from "../src/lib/i18n/nav.ts";
import { href, translatePath } from "../src/lib/i18n/routes.ts";

const shape = (v: unknown): unknown =>
  Array.isArray(v) ? v.map(shape) : v && typeof v === "object" ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, shape(x)])) : typeof v;

test("Acquisition & Conversion : une adresse par langue, dans la navigation principale", () => {
  assert.equal(href("acquisition", "fr"), "/acquisition-conversion");
  assert.equal(href("acquisition", "en"), "/en/acquisition-conversion");
  assert.equal(translatePath("/acquisition-conversion", "en"), "/en/acquisition-conversion");
  for (const locale of ["fr", "en"] as const) {
    const nav = mainNav(locale);
    assert.ok(nav.some((i) => i.href === href("acquisition", locale) && i.label === "Acquisition & Conversion"));
    assert.ok(nav.length <= 5, "en-tête sobre : cinq liens au plus");
    assert.equal(ctas(locale).talk.href, href("firstLook", locale), "« Parlons de votre projet » mène au formulaire de projet");
  }
});

test("Acquisition & Conversion : mêmes contenus FR/EN, prix d'entrée cohérent", () => {
  assert.deepEqual(shape(getAcquisition("en")), shape(getAcquisition("fr")));
  assert.equal(ACQUISITION_FROM_EUR, 2500);
  assert.equal(getAcquisition("fr").pricing.price.replace(/\s/g, ""), "2500€");
  assert.equal(getAcquisition("en").pricing.price, "€2,500");
  assert.equal(getAcquisition("fr").solution.stages.length, 4);
  assert.equal(getAcquisition("fr").included.items.length, 8);
  assert.equal(getAcquisition("fr").problem.items.length, 3);
});

test("Acquisition & Conversion : aucune promesse de résultat, aucune fausse urgence", () => {
  const forbidden = [
    /garanti(e|s)?\b(?! de)/i,
    /\bguarantee(d)?\b(?!.*not)/i,
    /\d+\s?%/,
    /\bx\d|\d+x\b/i,
    /offre limitée|limited offer|derni(er|ère)s? places|only \d+ spots|promo|réduction|discount|compte à rebours|countdown/i,
    /témoignage|testimonial|★/i,
  ];
  for (const locale of ["fr", "en"] as const) {
    const corpus = JSON.stringify(getAcquisition(locale));
    for (const p of forbidden) assert.ok(!p.test(corpus), `${locale} : ${p}`);
    assert.match(getAcquisition(locale).pricing.honest, /promett|promise/);
  }
});

test("formulaire de projet : le nouveau service est un type de projet sélectionnable", () => {
  assert.equal(SERVICE_BY_SLUG[ACQUISITION_SLUG], "Acquisition & Conversion Express");
  assert.equal(SERVICE_LABELS_EN["Acquisition & Conversion Express"], "Acquisition & Conversion Express");
  const v = sanitizeFirstLook({
    ...EMPTY_FIRST_LOOK,
    name: "Camille Test",
    company: "Test SA",
    email: "c@test.fr",
    presence: "test.be",
    services: ["Acquisition & Conversion Express"],
    need: "Recevoir des demandes qualifiées",
    timeline: "1 à 3 mois",
    description: "Une entreprise de services qui veut structurer ses demandes.",
    privacy: true,
  });
  assert.deepEqual(validateFirstLook(v), {});
  assert.deepEqual(v.services, ["Acquisition & Conversion Express"]);
});
