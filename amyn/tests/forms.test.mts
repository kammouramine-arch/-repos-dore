import assert from "node:assert/strict";
import { test } from "node:test";
import { sanitizeFirstLook, validateFirstLook } from "../src/lib/forms/first-look.ts";
import { sanitizeProject, validateProject } from "../src/lib/forms/project.ts";
import { cleanLine, cleanText, isWebAddress } from "../src/lib/forms/shared.ts";

const validFirstLook = {
  name: "Camille Durand",
  company: "Atelier Exemple",
  email: "Contact@Atelier-Exemple.fr",
  phone: "",
  website: "atelier-exemple.fr",
  presence: "",
  areas: ["Site web"],
  notes: "",
  privacy: true,
  source: "outreach",
};

test("premier aperçu : une demande complète est acceptée", () => {
  const values = sanitizeFirstLook(validFirstLook);
  assert.deepEqual(validateFirstLook(values), {});
  assert.equal(values.email, "contact@atelier-exemple.fr");
  assert.equal(values.source, "outreach");
});

test("premier aperçu : champs obligatoires et consentement", () => {
  const errors = validateFirstLook(sanitizeFirstLook({}));
  for (const field of ["name", "company", "email", "areas", "privacy"]) {
    assert.ok(field in errors, `erreur attendue sur ${field}`);
  }
});

test("premier aperçu : valeurs inconnues écartées, source par défaut", () => {
  const values = sanitizeFirstLook({ ...validFirstLook, areas: ["Site web", "Piratage", 3], source: "evil" });
  assert.deepEqual(values.areas, ["Site web"]);
  assert.equal(values.source, "site");
});

test("premier aperçu : le consentement doit être un vrai booléen", () => {
  const values = sanitizeFirstLook({ ...validFirstLook, privacy: "true" });
  assert.ok("privacy" in validateFirstLook(values));
});

const validProject = {
  name: "Camille Durand",
  company: "Atelier Exemple",
  email: "camille@exemple.fr",
  phone: "+33 6 12 34 56 78",
  website: "",
  services: ["Site web / refonte", "Réservation en ligne"],
  situation: "Nous avons un site à refaire",
  objective: "Recevoir plus de réservations",
  budget: "2 500–5 000 €",
  timeline: "1 à 3 mois",
  description: "Nous voulons refaire notre site et proposer la réservation en ligne.",
  privacy: true,
};

test("projet : une demande complète est acceptée", () => {
  assert.deepEqual(validateProject(sanitizeProject(validProject)), {});
});

test("projet : budget, échéance et situation hors liste refusés", () => {
  const errors = validateProject(
    sanitizeProject({ ...validProject, budget: "1 €", timeline: "hier", situation: "?" }),
  );
  assert.ok("budget" in errors && "timeline" in errors && "situation" in errors);
});

test("projet : téléphone et site invalides signalés", () => {
  const errors = validateProject(
    sanitizeProject({ ...validProject, phone: "abc", website: "javascript:alert(1)" }),
  );
  assert.ok("phone" in errors && "website" in errors);
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
