import assert from "node:assert/strict";
import { test } from "node:test";
import {
  STEPS,
  sanitizeFirstLook,
  validateFirstLook,
  validateStep,
} from "../src/lib/forms/first-look.ts";
import { cleanLine, cleanText, isWebAddress } from "../src/lib/forms/shared.ts";

const valid = {
  name: "Camille Durand",
  company: "Atelier Exemple",
  email: "Contact@Atelier-Exemple.fr",
  phone: "",
  presence: "atelier-exemple.fr",
  services: ["Site web / refonte", "Réservation en ligne"],
  need: "Recevoir des réservations en ligne",
  timeline: "1 à 3 mois",
  description: "Un atelier de réparation de vélos qui veut prendre ses rendez-vous en ligne.",
  privacy: true,
  source: "outreach",
};

test("formulaire unique : une demande complète est acceptée", () => {
  const values = sanitizeFirstLook(valid);
  assert.deepEqual(validateFirstLook(values), {});
  assert.equal(values.email, "contact@atelier-exemple.fr");
  assert.equal(values.source, "outreach");
});

test("formulaire unique : aucun champ budget n'existe", () => {
  const values = sanitizeFirstLook({ ...valid, budget: "Moins de 1 000 €" });
  assert.ok(!("budget" in values));
  assert.ok(!STEPS.flatMap((s) => s.fields).includes("budget" as never));
});

test("formulaire unique : champs obligatoires et consentement", () => {
  const errors = validateFirstLook(sanitizeFirstLook({}));
  for (const field of ["name", "company", "email", "services", "need", "timeline", "description", "privacy"]) {
    assert.ok(field in errors, `erreur attendue sur ${field}`);
  }
  for (const optional of ["phone", "presence"]) assert.ok(!(optional in errors), optional);
});

test("étapes : chaque étape ne valide que ses propres champs", () => {
  const empty = sanitizeFirstLook({});
  assert.deepEqual(Object.keys(validateStep(empty, 0)).sort(), ["company", "email", "name"]);
  assert.deepEqual(Object.keys(validateStep(empty, 1)).sort(), ["need", "services", "timeline"]);
  assert.deepEqual(Object.keys(validateStep(empty, 2)).sort(), ["description", "privacy"]);
});

test("valeurs inconnues écartées, source par défaut", () => {
  const values = sanitizeFirstLook({ ...valid, services: ["Site web / refonte", "Piratage", 3], timeline: "hier", source: "evil" });
  assert.deepEqual(values.services, ["Site web / refonte"]);
  assert.equal(values.timeline, "");
  assert.equal(values.source, "site");
});

test("le consentement doit être un vrai booléen ; le téléphone est contrôlé", () => {
  assert.ok("privacy" in validateFirstLook(sanitizeFirstLook({ ...valid, privacy: "true" })));
  assert.ok("phone" in validateFirstLook(sanitizeFirstLook({ ...valid, phone: "abc" })));
});

test("nettoyage : caractères de contrôle, sauts de ligne et longueur", () => {
  assert.equal(cleanLine("  Bon\u0000jour \n  toi  ", 50), "Bonjour toi");
  assert.equal(cleanLine("x".repeat(500), 10).length, 10);
  assert.equal(cleanText("a\r\n\r\n\r\n\r\n\r\nb", 50), "a\n\n\nb");
  assert.equal(cleanLine(42, 10), "");
});

test("adresses web : formats humains acceptés, protocoles dangereux refusés", () => {
  for (const ok of ["monsite.fr", "www.monsite.fr", "https://monsite.fr/page", "http://a.b.co"]) {
    assert.ok(isWebAddress(ok), ok);
  }
  for (const ko of ["javascript:alert(1)", "data:text/html,x", "monsite", "https://user:pw@site.fr", ""]) {
    assert.ok(!isWebAddress(ko), ko);
  }
});
