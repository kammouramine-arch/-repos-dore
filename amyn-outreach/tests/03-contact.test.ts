// CONTACT — l'agent ne devine JAMAIS une adresse email.
import { test, describe } from "node:test";
import assert from "node:assert/strict";

import { isGenericAddress, validateEmailSyntax } from "@/lib/contact/discover";
import { DISCOVERY_METHOD_LABELS } from "@/lib/constants";

describe("Validation syntaxique", () => {
  test("accepte des adresses réelles", () => {
    for (const email of ["contact@amyn.agency", "salon.eclat@orange.fr", "info@le-bistrot.fr"]) {
      assert.equal(validateEmailSyntax(email).status, "SYNTAX_OK", email);
    }
  });

  test("refuse des adresses invalides", () => {
    for (const email of ["contact", "contact@", "@amyn.agency", "a b@amyn.agency", "contact@amyn"]) {
      assert.equal(validateEmailSyntax(email).status, "SYNTAX_INVALID", email);
    }
  });

  test("écarte les adresses techniques (no-reply, postmaster...)", () => {
    for (const email of ["no-reply@salon.fr", "postmaster@salon.fr", "webmaster@salon.fr"]) {
      const result = validateEmailSyntax(email);
      assert.equal(result.status, "ROLE_ACCOUNT", email);
      assert.ok(result.note, "aucune explication fournie");
    }
  });

  test("écarte les domaines d'outillage (exemples, CDN, hébergeurs)", () => {
    for (const email of ["contact@example.com", "hello@wordpress.com", "x@sentry.io"]) {
      assert.equal(validateEmailSyntax(email).status, "SYNTAX_INVALID", email);
    }
  });
});

describe("Adresses génériques", () => {
  test("reconnaît les boîtes de rôle", () => {
    for (const email of ["contact@x.fr", "info@x.fr", "bonjour@x.fr", "hello@x.fr"]) {
      assert.equal(isGenericAddress(email), true, email);
    }
  });

  test("ne confond pas une adresse nominative avec une boîte de rôle", () => {
    assert.equal(isGenericAddress("marie.dupont@x.fr"), false);
  });
});

describe("Interdiction de deviner", () => {
  test("aucune méthode de découverte ne permet la supposition", () => {
    const methods = Object.keys(DISCOVERY_METHOD_LABELS);
    for (const m of methods) {
      assert.ok(
        !/GUESS|DEVIN|PATTERN|INFER/i.test(m),
        `la méthode « ${m} » laisserait place à une adresse devinée`,
      );
    }
    // Toute méthode connue correspond à une page publiée par l'entreprise
    // ou à une saisie humaine explicite.
    for (const m of methods) {
      assert.ok(
        ["LEGAL_NOTICE", "WEBSITE_CONTACT", "WEBSITE_MAILTO", "GOOGLE_BUSINESS", "INSTAGRAM_BIO", "MANUAL"].includes(m),
        `méthode inattendue : ${m}`,
      );
    }
  });

  test("le code source ne construit jamais une adresse à partir du nom de domaine", async () => {
    const { readFile } = await import("node:fs/promises");
    const source = await readFile(new URL("../lib/contact/discover.ts", import.meta.url), "utf8");
    // Un template du type `contact@${domain}` serait une adresse inventée.
    assert.ok(
      !/["'`][a-z.]+@\$\{/i.test(source),
      "une adresse semble construite par interpolation : ce serait une invention",
    );
  });
});
