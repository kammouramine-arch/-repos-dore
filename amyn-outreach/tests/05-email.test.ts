// EMAIL — un brouillon ne peut affirmer que ce qui est prouve.
import { test, describe } from "node:test";
import assert from "node:assert/strict";

import { verifyEmail, FORBIDDEN_PATTERNS } from "@/lib/email/verify";
import { ANGLES } from "@/lib/email/angles";
import { ISSUE_TYPES } from "@/lib/constants";

const VALID = {
  subject: "Salon Éclat — un point sur votre site",
  body: [
    "Bonjour,",
    "",
    "En consultant votre site, j'ai constaté qu'il répond en http:// et non en https://.",
    "Les navigateurs affichent alors un avertissement « non sécurisé » à vos visiteurs.",
    "",
    "Si le sujet vous intéresse, je peux vous montrer ce que cela implique.",
    "",
    "Amine — AMYN, Web & Growth, Lille",
    "contact@amyn.agency",
    "",
    "Répondez STOP pour ne plus recevoir de message de ma part.",
  ].join("\n"),
  citedIssueIds: ["issue-1"],
  knownIssueIds: ["issue-1", "issue-2"],
  allowedNumbers: [],
  companyName: "Salon Éclat",
  senderEmail: "contact@amyn.agency",
};

describe("Vérification des emails", () => {
  test("un email factuel et conforme passe", () => {
    const result = verifyEmail(VALID);
    assert.equal(result.passed, true, result.problems.join(" | "));
  });

  test("refuse un email qui cite un problème absent de la base de preuves", () => {
    const result = verifyEmail({ ...VALID, citedIssueIds: ["issue-inventee"] });
    assert.equal(result.passed, false);
    assert.ok(result.problems.some((p) => /absent/i.test(p)));
  });

  test("refuse un email sans mention de désinscription", () => {
    const result = verifyEmail({
      ...VALID,
      body: VALID.body.replace("Répondez STOP pour ne plus recevoir de message de ma part.", ""),
    });
    assert.equal(result.passed, false);
    assert.ok(result.problems.some((p) => /désinscri|opposition|stop/i.test(p)));
  });

  test("refuse chaque formulation interdite", () => {
    const samples: Array<[string, RegExp]> = [
      ["Résultat garanti sous 30 jours.", /garantie/i],
      ["Nous pouvons doubler vos réservations.", /multiplication/i],
      ["Je peux vous faire x3 sur vos rendez-vous.", /multiplication/i],
      ["Vous êtes le meilleur salon de Lille.", /superlatif/i],
      ["Vous perdez des clients chaque jour.", /perte/i],
      ["Vous auriez 40 % d'augmentation.", /statistique/i],
      ["Tous vos concurrents ont déjà un site.", /généralisation/i],
      ["C'est urgent.", /urgence/i],
      ["Cliquez ici.", /publicitaire/i],
    ];

    for (const [phrase] of samples) {
      const result = verifyEmail({ ...VALID, body: `${VALID.body}\n${phrase}` });
      assert.equal(result.passed, false, `« ${phrase} » aurait dû être refusé`);
    }
  });

  test("chaque motif interdit est nommé explicitement", () => {
    for (const pattern of FORBIDDEN_PATTERNS) {
      assert.ok(pattern.label.length > 3, "motif interdit sans libellé");
    }
  });

  test("refuse un chiffre non justifié par une preuve", () => {
    const result = verifyEmail({
      ...VALID,
      body: `${VALID.body}\nVotre site met 12 secondes à s'afficher.`,
      allowedNumbers: [],
    });
    assert.equal(result.passed, false);
  });

  test("accepte un chiffre issu d'une mesure réelle", () => {
    const result = verifyEmail({
      ...VALID,
      body: VALID.body.replace(
        "Les navigateurs affichent alors un avertissement « non sécurisé » à vos visiteurs.",
        "La page d'accueil a mis 4 secondes à répondre lors de ma mesure.",
      ),
      allowedNumbers: [4],
    });
    assert.equal(result.passed, true, result.problems.join(" | "));
  });

  test("exige l'identité de l'expéditeur", () => {
    const result = verifyEmail({
      ...VALID,
      body: VALID.body.replace("Amine — AMYN, Web & Growth, Lille", "Cordialement"),
    });
    assert.equal(result.passed, false);
  });
});

describe("Angles de rédaction", () => {
  test("chaque angle correspond à un type de problème du catalogue", () => {
    for (const key of Object.keys(ANGLES)) {
      assert.ok(Object.keys(ISSUE_TYPES).includes(key), `angle sans type de problème : ${key}`);
    }
  });

  test("aucun angle ne contient une promesse ou un chiffre inventé", () => {
    const ctx = {
      company: "Salon Éclat",
      city: "Lille",
      sector: "Salon de coiffure",
      observation: "constat mesuré",
      evidence: "preuve",
    };
    for (const [key, angle] of Object.entries(ANGLES)) {
      const text = [
        angle.subject(ctx as never),
        angle.observation(ctx as never),
        angle.consequence(ctx as never),
      ].join("\n");
      for (const pattern of FORBIDDEN_PATTERNS) {
        assert.ok(!pattern.re.test(text), `l'angle ${key} contient : ${pattern.label}`);
      }
    }
  });
});
