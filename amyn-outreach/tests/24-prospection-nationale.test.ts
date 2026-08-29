// ---------------------------------------------------------------------------
// PROSPECTION NATIONALE — de l'instruction en français au balayage
//
// Et personnalisation des emails : chaque observation doit venir d'un constat
// prouvé, et le message ne doit jamais affirmer une proximité géographique
// qui n'existe pas.
// ---------------------------------------------------------------------------

import { test, describe, before, beforeEach } from "node:test";
import assert from "node:assert/strict";

import { prisma } from "@/lib/db";
import { parseInstruction } from "@/lib/agent/intents";
import { selectIssues, generateEmail, MAX_OBSERVATIONS, casseLisible } from "@/lib/email/generate";
import { resetDatabase, seedProspect, seedProvenIssue } from "./helpers";

before(async () => { await resetDatabase(); });
beforeEach(async () => { await resetDatabase(); });

describe("Les demandes nationales sont comprises", () => {
  const nationales: Array<[string, Record<string, unknown>]> = [
    ["Prospecte toute la France", { zone: "France" }],
    ["Trouve les meilleures opportunités AMYN en France", { zone: "France" }],
    ["Continue la prospection nationale depuis le dernier checkpoint", { zone: "France", reprise: true }],
    ["Prospecte les restaurants en France", { zone: "France" }],
    ["Prospecte les artisans en France", { zone: "France" }],
    ["Prospecte les entreprises dans le département 59", { zone: "59" }],
  ];

  for (const [instruction, attendu] of nationales) {
    test(`« ${instruction} » → NATIONAL`, () => {
      const p = parseInstruction(instruction);
      assert.equal(p.intent, "NATIONAL", `comprise comme ${p.intent}`);
      for (const [cle, valeur] of Object.entries(attendu)) {
        assert.equal(p.parameters[cle], valeur, `paramètre ${cle}`);
      }
    });
  }

  test("« Prospecte les entreprises à Lille » reste une mission locale", () => {
    const p = parseInstruction("Prospecte les entreprises à Lille");
    assert.equal(p.intent, "MISSION");
    assert.equal(p.parameters.city, "Lille");
  });

  test("un secteur demandé nationalement est bien extrait", () => {
    const p = parseInstruction("Prospecte les restaurants en France");
    assert.deepEqual(p.parameters.sectors, ["restaurant"]);
  });

  test("le code d'un département n'est pas pris pour une quantité", () => {
    const p = parseInstruction("Prospecte les entreprises dans le département 59");
    assert.equal(p.parameters.limit, undefined, "59 a été compris comme « 59 résultats »");
  });

  test("une reprise ne replanifie pas : elle poursuit", () => {
    const p = parseInstruction("Continue la prospection nationale depuis le dernier checkpoint");
    assert.equal(p.parameters.reprise, true);
  });

  test("aucune liste fermée : un métier hors catalogue passe quand même", () => {
    const p = parseInstruction("Prospecte les ébénistes en France");
    assert.equal(p.intent, "NATIONAL");
    assert.ok((p.parameters.sectors as string[] | undefined)?.length);
  });
});

describe("Personnalisation des emails", () => {
  test("jusqu'à trois constats, jamais plus", async () => {
    const prospect = await seedProspect({ email: "contact@exemple.fr" });
    for (const type of ["NO_HTTPS", "NO_MOBILE", "NO_CONTACT_FORM", "SLOW_SITE", "NO_SEO"]) {
      await seedProvenIssue(prospect.id, type);
    }

    const issues = await prisma.issue.findMany({ where: { prospectId: prospect.id } });
    const retenus = selectIssues(issues);
    assert.ok(retenus.length <= MAX_OBSERVATIONS, `${retenus.length} constats retenus`);
    assert.ok(retenus.length >= 1);
  });

  test("deux constats retenus n'ont jamais le même angle", async () => {
    const prospect = await seedProspect({ email: "contact@exemple.fr" });
    for (const type of ["NO_HTTPS", "NO_MOBILE", "NO_CONTACT_FORM"]) {
      await seedProvenIssue(prospect.id, type);
    }
    const issues = await prisma.issue.findMany({ where: { prospectId: prospect.id } });
    const retenus = selectIssues(issues);
    const types = retenus.map((i) => i.type);
    assert.equal(new Set(types).size, types.length);
  });

  test("sans constat prouvé, aucun email n'est écrit", async () => {
    const prospect = await seedProspect({ email: "contact@exemple.fr" });
    await assert.rejects(
      () => generateEmail(prospect.id),
      /Aucun problème exploitable/,
      "un email a été rédigé sans preuve",
    );
  });

  test("chaque observation citée correspond à une Issue réelle du prospect", async () => {
    const prospect = await seedProspect({ email: "contact@exemple.fr" });
    const issue = await seedProvenIssue(prospect.id);

    const email = await generateEmail(prospect.id);
    const connues = new Set([issue.id]);
    for (const id of email.citedIssueIds) {
      assert.ok(connues.has(id), `l'email cite un problème inconnu : ${id}`);
    }
  });

  test("l'email ne prétend pas être du quartier d'un prospect éloigné", async () => {
    const prospect = await seedProspect({ email: "contact@exemple.fr", city: "Marseille" });
    await prisma.prospect.update({
      where: { id: prospect.id },
      data: { postalCode: "13001", departement: "13" },
    });
    await seedProvenIssue(prospect.id);

    const email = await generateEmail(prospect.id, { generator: "template" });
    assert.doesNotMatch(
      email.body,
      /m[ée]tropole lilloise|Hauts-de-France/i,
      "un prospect de Marseille se voit annoncer une proximité qui n'existe pas",
    );
    assert.match(email.body, /partout en France/i);
  });

  test("un prospect du Nord garde la formulation locale", async () => {
    const prospect = await seedProspect({ email: "contact@exemple.fr", city: "Lille" });
    await prisma.prospect.update({
      where: { id: prospect.id },
      data: { postalCode: "59000", departement: "59" },
    });
    await seedProvenIssue(prospect.id);

    const email = await generateEmail(prospect.id, { generator: "template" });
    assert.match(email.body, /Hauts-de-France/i);
  });

  test("l'email reste vérifié : aucun chiffre inventé ne passe", async () => {
    const prospect = await seedProspect({ email: "contact@exemple.fr" });
    await seedProvenIssue(prospect.id);
    const email = await generateEmail(prospect.id, { generator: "template" });
    assert.equal(email.verification.passed, true, email.verification.problems.join(" | "));
  });

  test("une enseigne contenant un chiffre ne fait pas échouer la vérification", async () => {
    const prospect = await seedProspect({ name: "Pizza 74", email: "contact@exemple.fr" });
    await seedProvenIssue(prospect.id);

    const email = await generateEmail(prospect.id, { generator: "template" });
    assert.equal(
      email.verification.passed,
      true,
      `« Pizza 74 » refusée : ${email.verification.problems.join(" | ")}`,
    );
  });

  test("un chiffre absent du nom et des preuves reste refusé", async () => {
    const { verifyEmail } = await import("@/lib/email/verify");
    const r = verifyEmail({
      subject: "Un point sur votre site",
      body: "Bonjour,\n\nVos ventes vont augmenter de 47 %.\n\nAmyn\ncontact@amyn.agency",
      citedIssueIds: ["i1"],
      knownIssueIds: ["i1"],
      allowedNumbers: [],
      companyName: "Pizza 74",
      senderEmail: "contact@amyn.agency",
    });
    assert.equal(r.passed, false, "un chiffre inventé est passé");
    assert.ok(r.problems.some((p) => /47/.test(p)));
  });

  test("un nom en capitales est remis en casse lisible", () => {
    assert.equal(casseLisible("LES 3 BRASSEURS"), "Les 3 Brasseurs");
    assert.equal(casseLisible("VILLENEUVE-D'ASCQ"), "Villeneuve-d'Ascq");
    assert.equal(casseLisible("BOULANGERIE DE LA GARE"), "Boulangerie de la Gare");
  });

  test("la forme juridique n'encombre pas une phrase adressée à un humain", () => {
    assert.equal(casseLisible("OLD WILD WEST SAS"), "Old Wild West");
    assert.equal(casseLisible("BOULANGERIE DUPONT SARL"), "Boulangerie Dupont");
  });

  test("une raison sociale réduite à sa forme juridique reste intacte", () => {
    // Retirer « SAS » de « SAS » ne laisserait rien du tout.
    assert.equal(casseLisible("SAS"), "Sas");
  });

  test("un nom déjà en casse mixte n'est pas abîmé", () => {
    assert.equal(casseLisible("L'Atelier du Pain"), "L'Atelier du Pain");
    assert.equal(casseLisible("iDGarage"), "iDGarage");
  });

  test("l'email ne crie pas : le nom du registre est adouci", async () => {
    const prospect = await seedProspect({ name: "LE FOURNIL DU NORD", email: "contact@exemple.fr" });
    await seedProvenIssue(prospect.id);

    const email = await generateEmail(prospect.id, { generator: "template" });
    assert.ok(
      email.body.includes("Le Fournil du Nord"),
      "le nom apparaît encore tout en capitales",
    );
    assert.doesNotMatch(email.body, /LE FOURNIL DU NORD/);
  });

  test("aucun article n'est accolé au libellé de secteur", async () => {
    // « un Restauration », « un Activités immobilières » : les libellés NAF
    // ne s'accordent pas. La phrase d'ouverture ne doit plus en dépendre.
    const prospect = await seedProspect({ email: "contact@exemple.fr" });
    await prisma.prospect.update({
      where: { id: prospect.id },
      data: { sector: "Activités immobilières" },
    });
    await seedProvenIssue(prospect.id);

    const email = await generateEmail(prospect.id, { generator: "template" });
    assert.doesNotMatch(email.body, /un activités immobilières/i);
    assert.doesNotMatch(email.body, /en cherchant un /i);
  });

  test("l'email préparé n'est jamais pré-approuvé", async () => {
    const prospect = await seedProspect({ email: "contact@exemple.fr" });
    await seedProvenIssue(prospect.id);
    await generateEmail(prospect.id, { generator: "template" });

    const draft = await prisma.emailDraft.findFirstOrThrow({ where: { prospectId: prospect.id } });
    assert.equal(draft.approvedAt, null, "un email est né approuvé");
  });
});
