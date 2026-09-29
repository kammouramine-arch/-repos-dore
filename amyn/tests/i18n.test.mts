import assert from "node:assert/strict";
import { test } from "node:test";
import { faq, faqEn } from "../src/lib/faq.ts";
import { sanitizeFirstLook, validateFirstLook, optionLabel, SERVICE_OPTIONS, TIMELINES, SERVICE_BY_SLUG } from "../src/lib/forms/first-look.ts";
import { localeFromPath } from "../src/lib/i18n/config.ts";
import {
  ROUTES,
  SERVICE_SLUGS,
  projectPath,
  servicePath,
  translatePath,
  type RouteKey,
} from "../src/lib/i18n/routes.ts";
import { getMethod, getPrinciples } from "../src/lib/method.ts";
import { priceLabel } from "../src/lib/pricing.ts";
import { getProjects, projects } from "../src/lib/projects.ts";
import { getServices, services } from "../src/lib/services.ts";
import { draftsAllowed, testimonials, visibleTestimonials } from "../src/lib/testimonials.ts";

test("routes : chaque page a son équivalent exact dans l'autre langue", () => {
  for (const key of Object.keys(ROUTES) as RouteKey[]) {
    assert.equal(translatePath(ROUTES[key].fr, "en"), ROUTES[key].en, key);
    assert.equal(translatePath(ROUTES[key].en, "fr"), ROUTES[key].fr, key);
  }
  for (const id of Object.keys(SERVICE_SLUGS)) {
    assert.equal(translatePath(servicePath(id, "fr"), "en"), servicePath(id, "en"));
    assert.equal(translatePath(servicePath(id, "en"), "fr"), servicePath(id, "fr"));
  }
  for (const p of projects) {
    assert.equal(translatePath(projectPath(p.slug, "fr"), "en"), projectPath(p.slug, "en"));
  }
  assert.equal(translatePath("/page-inconnue", "en"), "/en");
});

test("routes : toutes les adresses anglaises commencent par /en, aucune française", () => {
  for (const key of Object.keys(ROUTES) as RouteKey[]) {
    assert.equal(localeFromPath(ROUTES[key].en), "en", key);
    assert.equal(localeFromPath(ROUTES[key].fr), "fr", key);
  }
  assert.equal(localeFromPath("/entreprise"), "fr");
});

test("contenu anglais : chaque service, projet, question et étape est traduit", () => {
  const en = getServices("en");
  assert.equal(en.length, services.length);
  en.forEach((s, i) => {
    assert.notEqual(s.name, services[i].name === "Application mobile" ? "" : services[i].name, s.slug);
    assert.notEqual(s.hero.intro, services[i].hero.intro, s.slug);
    assert.equal(s.deliverables.length > 0, true);
    assert.equal(s.faq.length, services[i].faq.length, `${s.slug} : même nombre de questions`);
  });
  getProjects("en").forEach((p, i) => assert.notEqual(p.summary, projects[i].summary, p.slug));
  assert.equal(faqEn.length, faq.length);
  assert.equal(getMethod("en").length, getMethod("fr").length);
  assert.equal(getPrinciples("en").length, getPrinciples("fr").length);
});

/* Promesses interdites, en anglais aussi. */
const FORBIDDEN_EN = [
  /rank(ed)? (you )?(first|#1|number one)/i,
  /top (spot|position) guaranteed/i,
  /we guarantee/i,
  /* Affirmatif seulement : « we don't promise a guaranteed ranking » est permis. */
  /(?<!(\bno\b|\bnot\b|n't)[^.]{0,40})guaranteed (ranking|position|results|traffic)/i,
  /\b10x\b/i,
  /game[- ]changer/i,
  /revolutioni[sz]e/i,
  /\d+\s?\+?\s?(happy )?clients/i,
  /★|stars/i,
];

test("rédaction anglaise : aucune promesse interdite ni faux signal de confiance", () => {
  const corpus = JSON.stringify({ services: getServices("en"), projects: getProjects("en"), faqEn });
  for (const pattern of FORBIDDEN_EN) {
    assert.ok(!pattern.test(corpus), `formulation interdite : ${pattern}`);
  }
});

test("tarification anglaise", () => {
  assert.equal(priceLabel({ mode: "quote", visible: true }, "en"), "Priced on quote");
  assert.equal(priceLabel({ mode: "startingFrom", amount: 1200, visible: true }, "en"), "From €1,200");
});

test("formulaire : messages dans la langue du visiteur, valeurs identiques", () => {
  const fr = validateFirstLook(sanitizeFirstLook({ lang: "fr" }));
  const en = validateFirstLook(sanitizeFirstLook({ lang: "en" }));
  assert.deepEqual(Object.keys(fr).sort(), Object.keys(en).sort());
  assert.equal(en.email, "Please enter your work email address.");
  assert.match(fr.email ?? "", /adresse e-mail/);
  /* Langue inconnue : français. */
  assert.equal(sanitizeFirstLook({ lang: "de" }).lang, "fr");
  /* Chaque choix a un libellé anglais ; la valeur envoyée reste la même. */
  for (const o of [...SERVICE_OPTIONS, ...TIMELINES]) {
    assert.notEqual(optionLabel(o, "en"), "", o);
    assert.equal(optionLabel(o, "fr"), o);
  }
  /* Les liens depuis les pages anglaises pré-cochent le bon service. */
  for (const [id, slugs] of Object.entries(SERVICE_SLUGS)) {
    assert.equal(SERVICE_BY_SLUG[slugs.en], SERVICE_BY_SLUG[id]);
  }
});

test("témoignages : aucun brouillon n'est publiable en production", () => {
  assert.equal(draftsAllowed({ VERCEL_ENV: "production", NODE_ENV: "production" }), false);
  assert.equal(draftsAllowed({ VERCEL_ENV: "production", AMYN_SHOW_DRAFT_TESTIMONIALS: "1" }), false);
  assert.equal(draftsAllowed({ NODE_ENV: "production" }), false);
  assert.equal(draftsAllowed({ VERCEL_ENV: "preview", NODE_ENV: "production" }), true);
  for (const locale of ["fr", "en"] as const) {
    for (const t of visibleTestimonials(locale, false)) assert.equal(t.verified, true, t.id);
  }
});

test("témoignages : les brouillons actuels sont bien marqués non vérifiés, sans note ni source", () => {
  for (const t of testimonials.filter((x) => !x.verified)) {
    assert.equal(t.rating, undefined, t.id);
    assert.equal(t.source, undefined, t.id);
    assert.equal(t.image, undefined, t.id);
  }
  /* Même affichés en prévisualisation, un brouillon ne porte jamais de note. */
  for (const t of visibleTestimonials("fr", true)) if (!t.verified) assert.equal(t.rating, undefined);
});
