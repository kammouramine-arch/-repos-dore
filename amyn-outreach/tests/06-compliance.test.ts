// CONFORMITE — les 12 controles executes avant chaque envoi.
import { test, describe, before, beforeEach, after } from "node:test";
import assert from "node:assert/strict";

import { prisma } from "@/lib/db";
import { runComplianceChecks, addToSuppressionList, checkRateLimit } from "@/lib/campaign/compliance";
import { resetDatabase, seedProspect, seedProvenIssue, seedDraft } from "./helpers";

function blockedBy(report: { blockedBy: string[] }, name: string) {
  return report.blockedBy.includes(name);
}

describe("Contrôles de conformité", () => {
  before(async () => { await resetDatabase(); });
  beforeEach(async () => { await resetDatabase(); });
  after(async () => { await prisma.$disconnect(); });

  test("un prospect complet et approuvé passe tous les contrôles", async () => {
    const prospect = await seedProspect({ email: "contact@salon-test.fr", status: "READY_TO_SEND" });
    const issue = await seedProvenIssue(prospect.id);
    const draft = await seedDraft(prospect.id, { issueIds: [issue.id] });
    await prisma.emailDraft.update({
      where: { id: draft.id },
      data: { approvedAt: new Date(), approvedBy: "TEST" },
    });

    const report = await runComplianceChecks({ prospectId: prospect.id, draftId: draft.id, step: 0 });
    assert.equal(report.allowed, true, `bloqué par : ${report.blockedBy.join(", ")}`);
    assert.ok(report.checks.length >= 10, `seulement ${report.checks.length} contrôles exécutés`);
    assert.ok(report.checks.every((c) => c.detail.length > 0), "un contrôle sans explication");
  });

  test("un prospect DEMO ne peut jamais déclencher d'envoi", async () => {
    const prospect = await seedProspect({ email: "contact@salon-demo.invalid", isDemo: true, status: "READY_TO_SEND" });
    const draft = await seedDraft(prospect.id);
    await prisma.emailDraft.update({ where: { id: draft.id }, data: { approvedAt: new Date() } });

    const report = await runComplianceChecks({ prospectId: prospect.id, draftId: draft.id, step: 0 });
    assert.equal(report.allowed, false);
    assert.ok(blockedBy(report, "DEMO_GUARD"), `blocages : ${report.blockedBy.join(", ")}`);
  });

  test("un prospect sans email vérifié est bloqué", async () => {
    const prospect = await seedProspect({ email: null, status: "READY_TO_SEND" });
    const draft = await seedDraft(prospect.id);
    const report = await runComplianceChecks({ prospectId: prospect.id, draftId: draft.id, step: 0 });
    assert.equal(report.allowed, false);
    assert.ok(report.blockedBy.length > 0);
  });

  test("un email non approuvé est bloqué", async () => {
    const prospect = await seedProspect({ email: "contact@salon-test.fr", status: "READY_TO_SEND" });
    const issue = await seedProvenIssue(prospect.id);
    const draft = await seedDraft(prospect.id, { issueIds: [issue.id] });
    const report = await runComplianceChecks({ prospectId: prospect.id, draftId: draft.id, step: 0 });
    assert.equal(report.allowed, false);
    assert.ok(blockedBy(report, "CHECK_APPROVAL"), `blocages : ${report.blockedBy.join(", ")}`);
  });

  test("une adresse en opposition est définitivement bloquée", async () => {
    const prospect = await seedProspect({ email: "contact@stop.fr", status: "READY_TO_SEND" });
    const issue = await seedProvenIssue(prospect.id);
    const draft = await seedDraft(prospect.id, { issueIds: [issue.id] });
    await prisma.emailDraft.update({ where: { id: draft.id }, data: { approvedAt: new Date() } });

    await addToSuppressionList({ email: "contact@stop.fr", reason: "UNSUBSCRIBED", source: "test" });

    const report = await runComplianceChecks({ prospectId: prospect.id, draftId: draft.id, step: 0 });
    assert.equal(report.allowed, false);
    assert.ok(blockedBy(report, "CHECK_OPT_OUT"), `blocages : ${report.blockedBy.join(", ")}`);
  });

  test("l'opposition bascule aussi le prospect en statut OPTOUT", async () => {
    const prospect = await seedProspect({ email: "contact@stop2.fr" });
    await addToSuppressionList({ email: "contact@stop2.fr", reason: "UNSUBSCRIBED", source: "test" });
    const after = await prisma.prospect.findUniqueOrThrow({ where: { id: prospect.id } });
    assert.equal(after.status, "OPTOUT");
  });

  test("un domaine en opposition bloque toutes ses adresses", async () => {
    const prospect = await seedProspect({ email: "contact@groupe-stop.fr", status: "READY_TO_SEND" });
    const issue = await seedProvenIssue(prospect.id);
    const draft = await seedDraft(prospect.id, { issueIds: [issue.id] });
    await prisma.emailDraft.update({ where: { id: draft.id }, data: { approvedAt: new Date() } });

    await addToSuppressionList({ domain: "groupe-stop.fr", reason: "COMPLAINT", source: "test" });

    const report = await runComplianceChecks({ prospectId: prospect.id, draftId: draft.id, step: 0 });
    assert.equal(report.allowed, false);
    assert.ok(blockedBy(report, "CHECK_OPT_OUT"));
  });

  test("un doublon d'envoi est refusé", async () => {
    const prospect = await seedProspect({ email: "contact@doublon.fr", status: "CONTACTED" });
    const issue = await seedProvenIssue(prospect.id);
    const draft = await seedDraft(prospect.id, { issueIds: [issue.id] });
    await prisma.emailDraft.update({ where: { id: draft.id }, data: { approvedAt: new Date() } });

    await prisma.sendLog.create({
      data: {
        prospectId: prospect.id,
        emailDraftId: draft.id,
        transport: "dry-run",
        status: "SENT",
        dryRun: false,
        toEmail: "contact@doublon.fr",
        subject: "Un point sur votre site",
        sequenceStep: 0,
      },
    });

    const report = await runComplianceChecks({ prospectId: prospect.id, draftId: draft.id, step: 0 });
    assert.equal(report.allowed, false);
    assert.ok(blockedBy(report, "CHECK_DUPLICATE"), `blocages : ${report.blockedBy.join(", ")}`);
  });

  test("un email au contenu non conforme est refusé", async () => {
    const prospect = await seedProspect({ email: "contact@contenu.fr", status: "READY_TO_SEND" });
    const issue = await seedProvenIssue(prospect.id);
    const draft = await seedDraft(prospect.id, { issueIds: [issue.id] });
    await prisma.emailDraft.update({
      where: { id: draft.id },
      data: {
        approvedAt: new Date(),
        body: "Bonjour, résultat garanti, nous allons doubler votre chiffre d'affaires.",
      },
    });

    const report = await runComplianceChecks({ prospectId: prospect.id, draftId: draft.id, step: 0 });
    assert.equal(report.allowed, false);
    assert.ok(blockedBy(report, "CHECK_CONTENT"), `blocages : ${report.blockedBy.join(", ")}`);
  });

  test("chaque contrôle est nommé et explique sa décision", async () => {
    const prospect = await seedProspect({ email: "contact@trace.fr", status: "READY_TO_SEND" });
    const draft = await seedDraft(prospect.id);
    const report = await runComplianceChecks({ prospectId: prospect.id, draftId: draft.id, step: 0 });

    const names = report.checks.map((c) => c.name);
    assert.equal(new Set(names).size, names.length, "noms de contrôle dupliqués");
    for (const check of report.checks) {
      assert.ok(check.name.length > 0);
      assert.ok(check.detail.length > 5, `${check.name} sans explication`);
    }
  });

  test("le plafond quotidien est un contrôle réel", async () => {
    const outcome = await checkRateLimit();
    assert.equal(typeof outcome.passed, "boolean");
    assert.ok(outcome.detail.length > 5);
  });
});
