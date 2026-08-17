// ENVOI — en DRY_RUN, rien ne part. Tout est journalise, y compris les refus.
import { test, describe, beforeEach, after } from "node:test";
import assert from "node:assert/strict";

import { prisma } from "@/lib/db";
import { config, assertSendingAllowed, sendingReadiness } from "@/lib/config";
import { sendOne, sendTestEmail } from "@/lib/campaign/send";
import { mailerStatus } from "@/lib/mailer";
import { resetDatabase, seedProspect, seedProvenIssue, seedDraft } from "./helpers";

async function approvedCandidate(email: string) {
  const prospect = await seedProspect({ email, status: "READY_TO_SEND" });
  const issue = await seedProvenIssue(prospect.id);
  const draft = await seedDraft(prospect.id, { issueIds: [issue.id] });
  await prisma.emailDraft.update({
    where: { id: draft.id },
    data: { approvedAt: new Date(), approvedBy: "TEST" },
  });
  return { prospect, draft };
}

describe("Verrou DRY_RUN", () => {
  beforeEach(async () => { await resetDatabase(); });
  after(async () => { await prisma.$disconnect(); });

  test("DRY_RUN est actif dans l'environnement de test", () => {
    assert.equal(config.dryRun, true);
    assert.equal(sendingReadiness().canSendForReal, false);
  });

  test("assertSendingAllowed refuse tant que DRY_RUN est vrai", () => {
    assert.throws(() => assertSendingAllowed(), /DRY_RUN/);
  });

  test("le transport actif ne peut pas délivrer réellement", () => {
    const status = mailerStatus();
    assert.equal(status.dryRun, true);
    assert.equal(status.canDeliver, false);
  });

  test("un envoi conforme est SIMULÉ, jamais transmis", async () => {
    const { prospect, draft } = await approvedCandidate("contact@simule.fr");
    const outcome = await sendOne({ prospectId: prospect.id, draftId: draft.id, step: 0 });

    assert.equal(outcome.blocked, false, outcome.reason);
    assert.equal(outcome.sent, false, "un email a été considéré comme réellement envoyé");
    assert.equal(outcome.simulated, true);

    const log = await prisma.sendLog.findFirstOrThrow({ where: { prospectId: prospect.id } });
    assert.equal(log.status, "SIMULATED");
    assert.equal(log.dryRun, true);
    assert.equal(log.transport, "dry-run");
  });

  test("une simulation ne fait pas avancer le prospect en CONTACTED", async () => {
    const { prospect, draft } = await approvedCandidate("contact@statut.fr");
    await sendOne({ prospectId: prospect.id, draftId: draft.id, step: 0 });
    const after = await prisma.prospect.findUniqueOrThrow({ where: { id: prospect.id } });
    assert.notEqual(after.status, "CONTACTED");
  });

  test("le test d'envoi fonctionne et se déclare simulé", async () => {
    const result = await sendTestEmail("contact@amyn.agency");
    assert.equal(result.ok, true);
    assert.equal(result.dryRun, true);
  });
});

describe("Traçabilité des envois", () => {
  beforeEach(async () => { await resetDatabase(); });

  test("un refus produit un SendLog BLOCKED avec le rapport de conformité", async () => {
    const prospect = await seedProspect({ email: "contact@refus.fr", status: "READY_TO_SEND" });
    const draft = await seedDraft(prospect.id); // non approuvé
    const outcome = await sendOne({ prospectId: prospect.id, draftId: draft.id, step: 0 });

    assert.equal(outcome.blocked, true);
    const log = await prisma.sendLog.findFirstOrThrow({ where: { prospectId: prospect.id } });
    assert.equal(log.status, "BLOCKED");
    assert.ok(log.error && log.error.length > 0, "le refus n'est pas motivé");

    const report = JSON.parse(log.complianceReport!);
    assert.equal(report.allowed, false);
    assert.ok(Array.isArray(report.checks) && report.checks.length > 0);
  });

  test("chaque envoi laisse une entrée au journal", async () => {
    const { prospect, draft } = await approvedCandidate("contact@journal.fr");
    await sendOne({ prospectId: prospect.id, draftId: draft.id, step: 0 });

    const entries = await prisma.activityLog.findMany({ where: { module: "SEND" } });
    assert.ok(entries.length >= 1, "aucune trace de l'envoi");
    assert.ok(entries.every((e) => e.summary.length > 5));
  });

  test("un prospect DEMO ne produit jamais d'envoi simulé", async () => {
    const prospect = await seedProspect({
      email: "contact@salon-demo.invalid",
      isDemo: true,
      status: "READY_TO_SEND",
    });
    const issue = await seedProvenIssue(prospect.id);
    const draft = await seedDraft(prospect.id, { issueIds: [issue.id] });
    await prisma.emailDraft.update({ where: { id: draft.id }, data: { approvedAt: new Date() } });

    const outcome = await sendOne({ prospectId: prospect.id, draftId: draft.id, step: 0 });
    assert.equal(outcome.blocked, true);
    assert.equal(outcome.simulated, false);
  });
});
