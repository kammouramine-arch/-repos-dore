// WORKFLOW COMPLET — de la fiche prospect au client, hors ligne.
import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";

import { prisma } from "@/lib/db";
import { generateEmail } from "@/lib/email/generate";
import { createCampaign, addProspectsToCampaign, prepareCampaign, approveCampaignMembers, runCampaign } from "@/lib/campaign";
import { findFollowUpCandidates } from "@/lib/campaign/followup";
import { recordReply } from "@/lib/replies";
import { createClientFromProspect } from "@/lib/crm";
import { scoreProspect } from "@/lib/scoring";
import { pipelineSnapshot } from "@/lib/analytics";
import { resetDatabase, seedProspect, seedProvenIssue } from "./helpers";

describe("Chaîne complète : prospect → audit → email → campagne → réponse → client", () => {
  let prospectId = "";
  let campaignId = "";

  before(async () => {
    await resetDatabase();
    const prospect = await seedProspect({
      name: "Salon Parcours",
      city: "Lille",
      email: "contact@salon-parcours.fr",
      status: "AUDITED",
    });
    prospectId = prospect.id;
    await seedProvenIssue(prospectId);
  });

  after(async () => { await prisma.$disconnect(); });

  test("1. le score est calculé et justifié", async () => {
    const score = await scoreProspect(prospectId);
    assert.ok(score.overallScore >= 0 && score.overallScore <= 100);
    assert.ok(score.unknowns.length > 0, "le score ne dit pas ce qu'il ignore");

    const prospect = await prisma.prospect.findUniqueOrThrow({ where: { id: prospectId } });
    assert.equal(prospect.overallScore, score.overallScore);
    assert.ok(prospect.scoreRationale, "la justification n'est pas conservée");
  });

  test("2. l'email est rédigé à partir des preuves et vérifié", async () => {
    const email = await generateEmail(prospectId);
    assert.ok(email.subject.length > 5);
    assert.ok(email.verification.passed, email.verification.problems.join(" | "));

    const draft = await prisma.emailDraft.findFirstOrThrow({
      where: { prospectId, isActive: true },
    });
    const cited = JSON.parse(draft.citedIssueIds);
    assert.ok(cited.length > 0, "l'email ne cite aucun problème prouvé");

    const known = await prisma.issue.findMany({ where: { prospectId }, select: { id: true } });
    for (const id of cited) {
      assert.ok(known.some((i) => i.id === id), `problème cité inexistant : ${id}`);
    }
  });

  test("3. la campagne se prépare et refuse d'envoyer sans approbation", async () => {
    const campaign = await createCampaign({ name: "Test parcours", targetCriteria: { city: "Lille" } });
    campaignId = campaign.id;
    await addProspectsToCampaign(campaignId, [prospectId]);
    await prepareCampaign(campaignId);

    const before = await runCampaign(campaignId);
    assert.equal(before.sent, 0);
    assert.equal(before.simulated, 0);
    assert.ok(before.blocked >= 1, "un envoi non approuvé n'a pas été bloqué");
  });

  test("4. après approbation, l'envoi est simulé (DRY_RUN)", async () => {
    const approval = await approveCampaignMembers(campaignId, "TEST");
    assert.ok(approval.approved >= 1, "aucun email approuvé");

    const result = await runCampaign(campaignId);
    assert.equal(result.sent, 0, "un email a été réellement envoyé en mode simulation");
    assert.equal(result.simulated, 1);

    const log = await prisma.sendLog.findFirstOrThrow({
      where: { campaignId, status: "SIMULATED" },
    });
    const report = JSON.parse(log.complianceReport!);
    assert.equal(report.allowed, true);
    assert.ok(report.checks.every((c: { passed: boolean }) => c.passed));
  });

  test("5. aucune relance n'est due avant le délai configuré", async () => {
    const { candidates, skipped } = await findFollowUpCandidates(campaignId);
    assert.equal(candidates.length, 0);
    assert.ok(skipped.length >= 0);
  });

  test("6. une réponse est classée et enregistrée", async () => {
    await recordReply({
      prospectId,
      campaignId,
      fromEmail: "contact@salon-parcours.fr",
      subject: "Re: un point sur votre site",
      body: "Bonjour, ça m'intéresse. Quel est votre tarif ?",
    });

    const reply = await prisma.reply.findFirstOrThrow({ where: { prospectId } });
    assert.ok(["INTERESTED", "PRICE_REQUEST"].includes(reply.classification), reply.classification);
    assert.ok(JSON.parse(reply.matchedSignals ?? "[]").length > 0);
  });

  test("7. une réponse arrête la séquence de relance", async () => {
    // On place le membre dans l'état « déjà envoyé il y a 10 jours » : sans la
    // réponse, il serait éligible à une relance.
    await prisma.campaignMember.updateMany({
      where: { campaignId, prospectId },
      data: {
        status: "SENT",
        sequenceStep: 0,
        lastSentAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
      },
    });

    const { candidates, skipped } = await findFollowUpCandidates(campaignId);
    assert.equal(candidates.length, 0, "une relance est prévue alors que le prospect a répondu");
    assert.ok(
      skipped.some((s) => /répondu/i.test(s.reason)),
      `raisons : ${skipped.map((s) => s.reason).join(" | ")}`,
    );
  });

  test("8. le prospect devient client avec projet, tâches et onboarding", async () => {
    const result = await createClientFromProspect({
      companyName: "Salon Parcours",
      offer: "PREMIUM",
      prospectId,
    });
    assert.equal(result.created, true);
    assert.equal(result.client.contactEmail, "contact@salon-parcours.fr");

    const tasks = await prisma.task.count({ where: { projectId: result.project!.id } });
    assert.ok(tasks > 0);
  });

  test("9. le tableau de bord reflète exactement ce qui s'est passé", async () => {
    const snapshot = await pipelineSnapshot();
    assert.equal(snapshot.prospects.total, 1);
    assert.equal(snapshot.prospects.withContact, 1);
    assert.equal(snapshot.audit.issues, 1);
    assert.equal(snapshot.emails.realSends, 0, "le tableau de bord annonce un envoi réel inexistant");
    assert.equal(snapshot.replies.total, 1);
    assert.equal(snapshot.clients.total, 1);
    assert.ok(snapshot.revenue.signed > 0);
  });

  test("10. chaque étape a laissé une trace au journal", async () => {
    const modules = await prisma.activityLog.groupBy({ by: ["module"], _count: { _all: true } });
    const names = modules.map((m) => m.module);
    for (const expected of ["EMAIL", "SEND", "REPLIES"]) {
      assert.ok(names.includes(expected), `aucune trace du module ${expected} : ${names.join(", ")}`);
    }
  });
});
