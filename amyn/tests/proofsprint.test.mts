import assert from "node:assert/strict";
import { test } from "node:test";
import { EMPTY_PROOFSPRINT, sanitizeProofSprint, validateProofSprint } from "../src/lib/forms/proofsprint.ts";
import { href, translatePath } from "../src/lib/i18n/routes.ts";
import { getProofSprint } from "../src/lib/proofsprint.ts";

test("ProofSprint : une adresse par langue, et le sélecteur reste sur la page", () => {
  assert.equal(href("proofsprint", "fr"), "/proofsprint");
  assert.equal(href("proofsprint", "en"), "/en/proofsprint");
  assert.equal(translatePath("/proofsprint", "en"), "/en/proofsprint");
  assert.equal(translatePath("/en/proofsprint", "fr"), "/proofsprint");
});

test("ProofSprint : une demande complète est acceptée, sans document", () => {
  const v = sanitizeProofSprint({
    company: "Éditeur Exemple",
    email: "Ventes@Editeur-Exemple.fr",
    deadline: "remise le 14 novembre",
    description: "Une opportunité grand compte qui attend un calcul de ROI et un plan de déploiement.",
    privacy: true,
    lang: "en",
    file: "secret.pdf",
  });
  assert.deepEqual(validateProofSprint(v), {});
  assert.equal(v.email, "ventes@editeur-exemple.fr");
  assert.ok(!("file" in v), "aucun champ inconnu n'est conservé");
});

test("ProofSprint : champs manquants signalés, dans la langue du visiteur", () => {
  const fr = validateProofSprint({ ...EMPTY_PROOFSPRINT, lang: "fr" });
  assert.deepEqual(Object.keys(fr).sort(), ["company", "deadline", "description", "email", "privacy"]);
  const en = validateProofSprint({ ...EMPTY_PROOFSPRINT, lang: "en" });
  assert.match(en.deadline ?? "", /deadline/);
  assert.equal(validateProofSprint({ ...sanitizeProofSprint({}), email: "pas-une-adresse" }).email, "Cette adresse e-mail ne semble pas valide.");
});

test("ProofSprint : mêmes contenus en français et en anglais", () => {
  const fr = getProofSprint("fr");
  const en = getProofSprint("en");
  assert.equal(fr.deliverables.items.length, 5);
  assert.equal(en.deliverables.items.length, 5);
  assert.equal(fr.process.steps.length, en.process.steps.length);
  assert.equal(fr.faq.items.length, 8);
  assert.equal(en.faq.items.length, 8);
  assert.equal(fr.pricing.scope.length, 9);
  assert.equal(en.pricing.scope.length, 9);
  assert.equal(fr.hero.primary, "Parlons de votre dossier");
  assert.equal(en.hero.primary, "Discuss your deal");
  assert.equal(fr.pricing.price, "12 500 € HT");
  assert.ok(en.pricing.price === "€12,500" && /excluding VAT/.test(en.pricing.priceNote));
});

test("ProofSprint : aucune preuve sociale ni promesse inventée", () => {
  const text = JSON.stringify([getProofSprint("fr"), getProofSprint("en")]);
  for (const banned of [/témoignage|testimonial/i, /\d+\s?%\s?(de|of)?\s?(clients|win|réussite|taux)/i, /certifié|certified/i, /ISO\s?27001|SOC\s?2/i, /places? limitées|limited spots|countdown/i, /remise de \d|\d+\s?% de remise|réduction|discount/i]) {
    assert.ok(!banned.test(text), `formulation interdite : ${banned}`);
  }
  assert.match(getProofSprint("fr").visual.fictional, /fictif/);
  assert.match(getProofSprint("en").visual.fictional, /Fictional/);
});
