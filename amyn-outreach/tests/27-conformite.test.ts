// ---------------------------------------------------------------------------
// CONFORMITÉ DE LA PROSPECTION B2B
//
// Un email de prospection non sollicité n'est licite que sous conditions :
// l'expéditeur s'identifie, le motif du contact est en rapport avec l'activité
// du destinataire, et l'opposition est possible simplement et gratuitement —
// puis respectée immédiatement et définitivement.
//
// Ces tests vérifient chacune de ces conditions sur des emails réellement
// produits par le système, pas sur le gabarit.
// ---------------------------------------------------------------------------

import { test, describe, before, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { prisma } from "@/lib/db";
import { config } from "@/lib/config";
import { generateEmail } from "@/lib/email/generate";
import { runComplianceChecks, addToSuppressionList } from "@/lib/campaign/compliance";
import { jobEnrichSites, jobPrepareEmails } from "@/lib/scheduler/jobs";
import { buildApprovalQueue } from "@/lib/campaign/queue";
import { resetDatabase, seedProspect, seedProvenIssue, codeSansCommentaires } from "./helpers";

const racine = resolve(import.meta.dirname, "..");

async function emailReel() {
  const p = await seedProspect({ email: "contact@exemple.fr", status: "AUDITED" });
  await seedProvenIssue(p.id);
  const email = await generateEmail(p.id, { generator: "template" });
  return { prospect: p, email };
}

before(async () => { await resetDatabase(); });
beforeEach(async () => { await resetDatabase(); });

describe("Contenu de l'email", () => {
  test("AMYN est identifiée sans ambiguïté", async () => {
    const { email } = await emailReel();
    assert.match(email.body, /AMYN/);
    assert.match(email.body, /Web & Growth/);
  });

  test("une adresse de contact réelle figure dans le message", async () => {
    const { email } = await emailReel();
    assert.ok(
      email.body.includes(config.from.email),
      "l'email ne donne aucune adresse permettant de répondre",
    );
  });

  test("le motif du contact est explicite et lié à l'activité du destinataire", async () => {
    const { email } = await emailReel();
    // Le message part d'un constat sur la présence en ligne de l'entreprise,
    // et cite au moins un problème prouvé.
    assert.ok(email.citedIssueIds.length >= 1, "aucun motif factuel cité");
    assert.match(email.body, /j'ai (constaté|remarqué|not[ée])|je suis tombé sur/i);
  });

  test("un moyen d'opposition simple et gratuit est proposé", async () => {
    const { email } = await emailReel();
    assert.match(email.body, /STOP/);
    assert.match(email.body, /ne (vous )?recontacte(rai)? plus|retire imm[ée]diatement/i);
  });

  test("le moyen d'opposition ne demande ni compte, ni frais, ni démarche", async () => {
    const { email } = await emailReel();
    assert.doesNotMatch(email.body, /désabonnement payant|créer un compte|formulaire obligatoire/i);
    // Répondre au message suffit : c'est le moyen le plus simple qui soit.
    assert.match(email.body, /répondez/i);
  });

  test("aucune promesse ni superlatif : la vérification le refuserait", async () => {
    const { email } = await emailReel();
    assert.equal(email.verification.passed, true, email.verification.problems.join(" | "));
  });
});

describe("Effet immédiat de l'opposition", () => {
  test("une opposition passe le prospect hors circuit sur-le-champ", async () => {
    const p = await seedProspect({ email: "stop@exemple.fr" });
    await addToSuppressionList({ email: "stop@exemple.fr", reason: "UNSUBSCRIBED" });

    const apres = await prisma.prospect.findUniqueOrThrow({ where: { id: p.id } });
    assert.equal(apres.status, "OPTOUT");
  });

  test("après opposition, le contrôle avant envoi refuse", async () => {
    const p = await seedProspect({ email: "stop@exemple.fr", status: "AUDITED" });
    const issue = await seedProvenIssue(p.id);
    const email = await generateEmail(p.id, { generator: "template" });
    assert.ok(issue.id);

    await addToSuppressionList({ email: "stop@exemple.fr", reason: "UNSUBSCRIBED" });

    const rapport = await runComplianceChecks({
      prospectId: p.id,
      draftId: email.draftId!,
      step: 0,
    });
    assert.equal(rapport.allowed, false);
    assert.ok(rapport.blockedBy.includes("CHECK_OPT_OUT") || rapport.blockedBy.includes("CHECK_STATUS"));
  });

  test("aucun brouillon actif ne subsiste sur un prospect opposé après maintenance", async () => {
    const p = await seedProspect({ email: "stop@exemple.fr", status: "AUDITED" });
    await seedProvenIssue(p.id);
    await generateEmail(p.id, { generator: "template" });
    await addToSuppressionList({ email: "stop@exemple.fr", reason: "UNSUBSCRIBED" });

    const { jobMaintenance } = await import("@/lib/scheduler/jobs");
    await jobMaintenance();

    const actifs = await prisma.emailDraft.count({ where: { prospectId: p.id, isActive: true } });
    assert.equal(actifs, 0);
  });

  test("l'opposition n'est jamais levée par le système", async () => {
    for (const fichier of [
      "lib/scheduler/jobs.ts",
      "lib/campaign/queue.ts",
      "lib/territory/sweep.ts",
      "lib/site/discover.ts",
    ]) {
      const source = codeSansCommentaires(readFileSync(resolve(racine, fichier), "utf-8"));
      assert.doesNotMatch(
        source,
        /suppression\.delete|suppression\.deleteMany/,
        `${fichier} peut supprimer une opposition`,
      );
    }
  });
});

describe("Une même adresse n'est pas écrite deux fois", () => {
  /**
   * Le cas réel qui a révélé le défaut : « Les 3 Brasseurs » à
   * Villeneuve-d'Ascq et à Lezennes sont deux établissements distincts —
   * SIRET différents, prospects légitimement séparés — qui publient la même
   * adresse « contact@ ». Le dédoublonnage par prospect les laissait passer
   * tous les deux. À l'échelle nationale, une enseigne de trois cents
   * succursales aurait reçu trois cents messages.
   */
  async function prospectAvecAdresse(nom: string, email: string) {
    const p = await seedProspect({ name: nom, email, status: "AUDITED" });
    const issue = await seedProvenIssue(p.id);
    const email2 = await generateEmail(p.id, { generator: "template" });
    return { prospect: p, draftId: email2.draftId!, issueId: issue.id };
  }

  test("deux établissements d'une chaîne ne reçoivent pas deux messages", async () => {
    const a = await prospectAvecAdresse("Les 3 Brasseurs Villeneuve", "contact@les3brasseurs.com");
    const b = await prospectAvecAdresse("Les 3 Brasseurs Lezennes", "contact@les3brasseurs.com");

    // Le premier passe.
    const premier = await runComplianceChecks({
      prospectId: a.prospect.id, draftId: a.draftId, step: 0,
    });
    assert.equal(
      premier.checks.find((c) => c.name === "CHECK_ADDRESS_REUSE")?.passed,
      true,
      "le premier message vers une adresse neuve doit passer",
    );

    // On enregistre son envoi, puis le second établissement se présente.
    await prisma.sendLog.create({
      data: {
        prospectId: a.prospect.id, emailDraftId: a.draftId,
        transport: "dry-run", status: "SIMULATED", dryRun: true,
        toEmail: "contact@les3brasseurs.com", subject: "premier", sequenceStep: 0,
      },
    });

    const second = await runComplianceChecks({
      prospectId: b.prospect.id, draftId: b.draftId, step: 0,
    });
    const controle = second.checks.find((c) => c.name === "CHECK_ADDRESS_REUSE");
    assert.equal(controle?.passed, false, "la même adresse a été écrite deux fois");
    assert.match(controle!.detail, /Villeneuve/, "le contrôle doit nommer l'entreprise déjà contactée");
    assert.equal(second.allowed, false);
  });

  test("une relance vers le MÊME prospect n'est pas confondue avec un doublon d'adresse", async () => {
    const a = await prospectAvecAdresse("Boulangerie Unique", "contact@unique.fr");
    await prisma.sendLog.create({
      data: {
        prospectId: a.prospect.id, emailDraftId: a.draftId,
        transport: "dry-run", status: "SIMULATED", dryRun: true,
        toEmail: "contact@unique.fr", subject: "initial", sequenceStep: 0,
      },
    });

    const relance = await runComplianceChecks({
      prospectId: a.prospect.id, draftId: a.draftId, step: 1,
    });
    assert.equal(
      relance.checks.find((c) => c.name === "CHECK_ADDRESS_REUSE")?.passed,
      true,
      "une relance légitime a été bloquée comme réutilisation d'adresse",
    );
  });

  test("deux adresses différentes ne se gênent pas", async () => {
    const a = await prospectAvecAdresse("Entreprise A", "contact@a-exemple.fr");
    const b = await prospectAvecAdresse("Entreprise B", "contact@b-exemple.fr");

    await prisma.sendLog.create({
      data: {
        prospectId: a.prospect.id, emailDraftId: a.draftId,
        transport: "dry-run", status: "SIMULATED", dryRun: true,
        toEmail: "contact@a-exemple.fr", subject: "premier", sequenceStep: 0,
      },
    });

    const second = await runComplianceChecks({
      prospectId: b.prospect.id, draftId: b.draftId, step: 0,
    });
    assert.equal(second.checks.find((c) => c.name === "CHECK_ADDRESS_REUSE")?.passed, true);
  });

  test("le contrôle est nommé dans les blocages, pas fondu dans un autre", async () => {
    const a = await prospectAvecAdresse("Chaîne A", "contact@chaine.fr");
    const b = await prospectAvecAdresse("Chaîne B", "contact@chaine.fr");
    await prisma.sendLog.create({
      data: {
        prospectId: a.prospect.id, emailDraftId: a.draftId,
        transport: "dry-run", status: "SIMULATED", dryRun: true,
        toEmail: "contact@chaine.fr", subject: "premier", sequenceStep: 0,
      },
    });

    const second = await runComplianceChecks({
      prospectId: b.prospect.id, draftId: b.draftId, step: 0,
    });
    assert.ok(
      second.blockedBy.includes("CHECK_ADDRESS_REUSE"),
      `le motif de blocage devrait être nommé : ${second.blockedBy.join(", ")}`,
    );
  });
});

describe("Les nouveaux maillons ne contournent aucun contrôle", () => {
  test("aucun module de la chaîne d'enrichissement ne sait envoyer", () => {
    for (const fichier of [
      "lib/site/discover.ts",
      "lib/site/verify.ts",
      "lib/site/candidates.ts",
      "lib/campaign/queue.ts",
    ]) {
      const source = codeSansCommentaires(readFileSync(resolve(racine, fichier), "utf-8"));
      assert.doesNotMatch(source, /sendOne\(|runCampaign\(|sendTestEmail\(/, `${fichier} peut envoyer`);
    }
  });

  test("la file d'approbation ne sait pas approuver", () => {
    const source = codeSansCommentaires(
      readFileSync(resolve(racine, "lib/campaign/queue.ts"), "utf-8"),
    );
    assert.doesNotMatch(source, /approvedAt:\s*new Date/, "la file écrit approvedAt");
    assert.doesNotMatch(source, /approveCampaignMembers/, "la file appelle l'approbation");
  });

  test("un tour complet d'enrichissement n'envoie rien", async () => {
    const p = await seedProspect({ email: "contact@exemple.fr", status: "AUDITED" });
    await seedProvenIssue(p.id);
    await prisma.prospect.update({
      where: { id: p.id },
      data: { qualification: "QUALIFIED", websiteStatus: "CONFIRMED", auditStatus: "COMPLETE" },
    });

    await jobEnrichSites({ limit: 5 });
    await jobPrepareEmails({ limit: 5 });
    await buildApprovalQueue();

    assert.equal(await prisma.sendLog.count(), 0, "un envoi a eu lieu pendant l'enrichissement");
    assert.equal(
      await prisma.emailDraft.count({ where: { approvedAt: { not: null } } }),
      0,
      "un email a été approuvé sans intervention humaine",
    );
  });

  test("le mode simulation reste actif pendant toute la suite", () => {
    assert.equal(config.dryRun, true);
  });
});
