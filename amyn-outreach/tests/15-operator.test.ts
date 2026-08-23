// ---------------------------------------------------------------------------
// OPÉRATEUR — politique d'envoi, qualification, décision, rédaction, jobs.
//
// Ces tests vérifient les RÈGLES MÉTIER, pas seulement que le code s'exécute :
// ce que l'agent a le droit de faire seul, et surtout ce qu'il ne peut jamais
// faire, quelle que soit la configuration.
// ---------------------------------------------------------------------------

import { test, describe, beforeEach, after } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { join, resolve } from "node:path";

import { prisma } from "@/lib/db";
import {
  getPolicy, setPolicy, checkSendWindow, remainingToday,
  POLICY_DEFAULTS, POLICY_LABELS,
} from "@/lib/policy";
import { qualifyProspect } from "@/lib/qualification";
import { decideOnReply } from "@/lib/operator/decide";
import { composeReply, composeFollowUp, KIND_BY_CLASS } from "@/lib/email/replies";
import { runJob, windowKey, recentJobs } from "@/lib/scheduler";
import { jobDecideReplies, jobDueFollowUps, jobMaintenance } from "@/lib/scheduler/jobs";
import { ingestReply } from "@/lib/replies/ingest";
import { addToSuppressionList } from "@/lib/campaign/compliance";
import { REPLY_CLASSES } from "@/lib/constants";
import { resetDatabase, seedProspect, seedProvenIssue, seedDraft } from "./helpers";

const ROOT = resolve(import.meta.dirname, "..");

/** Enregistre une réponse et renvoie son identifiant. */
async function reponseDe(email: string, corps: string, sujet = "Re: votre message") {
  const out = await ingestReply({
    fromEmail: email, subject: sujet, body: corps,
    messageId: `<${Math.random().toString(36).slice(2)}@test.invalid>`,
    source: "IMAP",
  });
  return out.replyId!;
}

// === POLITIQUE D'ENVOI ======================================================

describe("Politique d'envoi", () => {
  beforeEach(async () => { await resetDatabase(); });
  after(async () => { await prisma.$disconnect(); });

  test("chaque réglage a un libellé et une explication", () => {
    for (const cle of Object.keys(POLICY_DEFAULTS)) {
      const meta = POLICY_LABELS[cle as keyof typeof POLICY_DEFAULTS];
      assert.ok(meta, `aucun libellé pour ${cle}`);
      assert.ok(meta.hint.length > 10, `explication trop courte pour ${cle}`);
    }
  });

  test("la réponse automatique est désactivée par défaut", async () => {
    const p = await getPolicy();
    assert.equal(p.autoReplyEnabled, false, "l'agent pourrait répondre seul dès l'installation");
  });

  test("un réglage se modifie à chaud et la modification est tracée", async () => {
    await setPolicy("dailyLimit", 42);
    assert.equal((await getPolicy()).dailyLimit, 42);

    const trace = await prisma.activityLog.findFirst({ where: { action: "policy.update" } });
    assert.ok(trace, "la modification n'est pas tracée");
    assert.match(trace!.summary, /42/);
  });

  test("la fenêtre d'envoi refuse la nuit et le week-end", () => {
    const p = { ...POLICY_DEFAULTS, sendWindowStartHour: 9, sendWindowEndHour: 18, sendOnWeekends: false };

    const nuit = new Date("2026-08-19T05:00:00");     // mercredi 5 h
    const journee = new Date("2026-08-19T11:00:00");  // mercredi 11 h
    const soir = new Date("2026-08-19T22:00:00");     // mercredi 22 h
    const dimanche = new Date("2026-08-23T11:00:00"); // dimanche 11 h

    assert.equal(checkSendWindow(p, nuit).open, false);
    assert.equal(checkSendWindow(p, journee).open, true);
    assert.equal(checkSendWindow(p, soir).open, false);
    assert.equal(checkSendWindow(p, dimanche).open, false);
    assert.match(checkSendWindow(p, dimanche).reason, /week-end/i);
  });

  test("une fenêtre fermée indique quand elle rouvre", () => {
    const p = { ...POLICY_DEFAULTS, sendWindowStartHour: 9 };
    const c = checkSendWindow(p, new Date("2026-08-19T05:00:00"));
    assert.ok(c.nextOpening, "aucune réouverture annoncée");
    assert.equal(c.nextOpening!.getHours(), 9);
  });

  test("le week-end peut être autorisé explicitement", () => {
    const p = { ...POLICY_DEFAULTS, sendOnWeekends: true };
    assert.equal(checkSendWindow(p, new Date("2026-08-23T11:00:00")).open, true);
  });

  test("le quota du jour compte les envois simulés comme les réels", async () => {
    const prospect = await seedProspect({ email: "contact@quota.fr" });
    for (let i = 0; i < 3; i += 1) {
      await prisma.sendLog.create({
        data: {
          prospectId: prospect.id, transport: "dry-run", status: "SIMULATED",
          dryRun: true, toEmail: "contact@quota.fr", subject: `Test ${i}`,
        },
      });
    }
    const q = await remainingToday(await getPolicy());
    assert.equal(q.used, 3);
    assert.equal(q.remaining, POLICY_DEFAULTS.dailyLimit - 3);
  });
});

// === QUALIFICATION ==========================================================

describe("Qualification des prospects", () => {
  beforeEach(async () => { await resetDatabase(); });

  test("un prospect complet est qualifié, avec ses raisons", async () => {
    const p = await seedProspect({ email: "contact@complet.fr", status: "AUDITED" });
    await seedProvenIssue(p.id);
    await prisma.prospect.update({
      where: { id: p.id },
      data: { auditStatus: "COMPLETE", overallScore: 70 },
    });

    const q = await qualifyProspect(p.id);
    assert.equal(q.verdict, "QUALIFIED", q.summary);
    assert.ok(q.reasons.length > 0, "aucune raison donnée");
    assert.equal(q.blockers.length, 0);
  });

  test("un prospect en opposition est écarté, quel que soit son score", async () => {
    const p = await seedProspect({ email: "contact@stop-qual.fr", status: "AUDITED" });
    await seedProvenIssue(p.id);
    await prisma.prospect.update({
      where: { id: p.id },
      data: { auditStatus: "COMPLETE", overallScore: 99 },
    });
    await addToSuppressionList({ email: "contact@stop-qual.fr", reason: "UNSUBSCRIBED", source: "test" });

    const q = await qualifyProspect(p.id);
    assert.equal(q.verdict, "NOT_QUALIFIED");
    assert.ok(q.blockers.some((b) => /opposition/i.test(b)), q.blockers.join(" | "));
  });

  test("un prospect sans email n'est pas qualifié", async () => {
    const p = await seedProspect({ email: null, status: "AUDITED" });
    await seedProvenIssue(p.id);
    await prisma.prospect.update({ where: { id: p.id }, data: { auditStatus: "COMPLETE", overallScore: 70 } });

    const q = await qualifyProspect(p.id);
    assert.equal(q.verdict, "NOT_QUALIFIED");
    assert.ok(q.criteres.some((c) => c.id === "contact" && c.passed === false));
  });

  test("un prospect non audité part en NEEDS_HUMAN, pas en « probablement bon »", async () => {
    const p = await seedProspect({ email: "contact@nonaudite.fr" });
    const q = await qualifyProspect(p.id);
    assert.equal(q.verdict, "NEEDS_HUMAN", q.summary);
    assert.ok(q.unknowns.length > 0, "aucune information manquante signalée");
    assert.match(q.summary, /impossible de conclure/i);
  });

  test("un prospect contacté récemment est écarté par le délai de recontact", async () => {
    const p = await seedProspect({ email: "contact@recent.fr", status: "AUDITED" });
    await seedProvenIssue(p.id);
    await prisma.prospect.update({ where: { id: p.id }, data: { auditStatus: "COMPLETE", overallScore: 70 } });
    await prisma.sendLog.create({
      data: {
        prospectId: p.id, transport: "dry-run", status: "SIMULATED", dryRun: true,
        toEmail: "contact@recent.fr", subject: "Premier email",
      },
    });

    const q = await qualifyProspect(p.id);
    assert.equal(q.verdict, "NOT_QUALIFIED");
    assert.ok(q.blockers.some((b) => /recontact|contacté/i.test(b)), q.blockers.join(" | "));
  });

  test("une fiche DEMO ne peut jamais être qualifiée", async () => {
    const p = await seedProspect({ email: "contact@demo.invalid", isDemo: true, status: "AUDITED" });
    await seedProvenIssue(p.id);
    const q = await qualifyProspect(p.id);
    assert.equal(q.verdict, "NOT_QUALIFIED");
    assert.ok(q.blockers.some((b) => /démonstration/i.test(b)));
  });

  test("le verdict et sa justification sont conservés sur la fiche", async () => {
    const p = await seedProspect({ email: "contact@trace-qual.fr" });
    await qualifyProspect(p.id);

    const apres = await prisma.prospect.findUniqueOrThrow({ where: { id: p.id } });
    assert.ok(["QUALIFIED", "NOT_QUALIFIED", "NEEDS_HUMAN"].includes(apres.qualification));
    assert.ok(apres.qualificationReason, "aucune justification conservée");
    assert.ok(apres.qualifiedAt);

    const detail = JSON.parse(apres.qualificationReason!);
    assert.ok(Array.isArray(detail.criteres) && detail.criteres.length > 0);
  });

  test("un score sous le seuil écarte le prospect", async () => {
    const p = await seedProspect({ email: "contact@faible.fr", status: "AUDITED" });
    await seedProvenIssue(p.id);
    await prisma.prospect.update({
      where: { id: p.id },
      data: { auditStatus: "COMPLETE", overallScore: 10 },
    });
    const q = await qualifyProspect(p.id);
    assert.equal(q.verdict, "NOT_QUALIFIED");
    assert.ok(q.criteres.some((c) => c.id === "score" && c.passed === false));
  });
});

// === DÉCISION ===============================================================

describe("Décision sur une réponse", () => {
  beforeEach(async () => { await resetDatabase(); });

  test("prospect intéressé → répondre, mais avec validation par défaut", async () => {
    await seedProspect({ email: "contact@interesse-dec.fr" });
    const id = await reponseDe("contact@interesse-dec.fr", "Bonjour, ça m'intéresse, on peut en parler ?");

    const d = await decideOnReply(id);
    assert.equal(d.action, "REPLY");
    assert.equal(d.autoAllowed, false, "l'agent répondrait seul dès l'installation");
    assert.ok(d.gates.some((g) => /automatique est désactivée/i.test(g)), d.gates.join(" | "));
  });

  test("demande de prix → répondre", async () => {
    await seedProspect({ email: "contact@prix-dec.fr" });
    const id = await reponseDe("contact@prix-dec.fr", "Quel est votre tarif ?");
    assert.equal((await decideOnReply(id)).action, "REPLY");
  });

  test("demande de rendez-vous → répondre", async () => {
    await seedProspect({ email: "contact@rdv-dec.fr" });
    const id = await reponseDe("contact@rdv-dec.fr", "On peut se voir mardi matin ?");
    assert.equal((await decideOnReply(id)).action, "REPLY");
  });

  test("refus poli → arrêter la séquence, sans blacklist", async () => {
    await seedProspect({ email: "contact@refus-dec.fr" });
    const id = await reponseDe("contact@refus-dec.fr", "Non merci, nous avons déjà un prestataire.");

    const d = await decideOnReply(id);
    assert.equal(d.action, "STOP_SEQUENCE");
    assert.equal(await prisma.suppression.count({ where: { email: "contact@refus-dec.fr" } }), 0,
      "un simple refus ne doit pas mettre en liste noire");
  });

  test("OPT_OUT → blacklist, jamais de réponse commerciale", async () => {
    await seedProspect({ email: "contact@stop-dec.fr" });
    const id = await reponseDe("contact@stop-dec.fr", "Désinscrivez-moi de votre liste.");

    const d = await decideOnReply(id);
    assert.equal(d.action, "BLACKLIST");
    assert.ok(d.gates.some((g) => /aucune réponse commerciale/i.test(g)));
  });

  test("une adresse déjà blacklistée ne peut jamais recevoir de réponse", async () => {
    await seedProspect({ email: "contact@deja-bl.fr" });
    await addToSuppressionList({ email: "contact@deja-bl.fr", reason: "MANUAL", source: "test" });
    // Message par ailleurs très positif : la blacklist doit primer.
    const id = await reponseDe("contact@deja-bl.fr", "Super, ça m'intéresse beaucoup !");

    const d = await decideOnReply(id);
    assert.equal(d.action, "BLACKLIST", "un message positif a contourné la liste d'opposition");
  });

  test("réponse ambiguë → intervention humaine, jamais d'automatisme", async () => {
    await seedProspect({ email: "contact@ambigu-dec.fr" });
    const id = await reponseDe("contact@ambigu-dec.fr", "C'est très intéressant et bien vu, mais non merci.");

    const d = await decideOnReply(id);
    assert.equal(d.action, "HUMAN_REVIEW");
    assert.equal(d.autoAllowed, false);
  });

  test("expéditeur inconnu → intervention humaine", async () => {
    const id = await reponseDe("inconnu@nulle-part.fr", "Bonjour, ça m'intéresse.");
    const d = await decideOnReply(id);
    assert.equal(d.action, "HUMAN_REVIEW");
    assert.match(d.reason, /inconnu/i);
  });

  test("rebond → arrêt, adresse invalide", async () => {
    const id = await reponseDe(
      "mailer-daemon@mx.ovh.net",
      "550 5.1.1 Recipient address rejected: User unknown",
      "Undelivered Mail Returned to Sender",
    );
    assert.equal((await decideOnReply(id)).action, "STOP_SEQUENCE");
  });

  test("même avec la réponse automatique activée, l'ambiguïté reste humaine", async () => {
    await setPolicy("autoReplyEnabled", true);
    await seedProspect({ email: "contact@ambigu2.fr" });
    const id = await reponseDe("contact@ambigu2.fr", "C'est très intéressant et bien vu, mais non merci.");

    const d = await decideOnReply(id);
    assert.equal(d.action, "HUMAN_REVIEW");
    assert.equal(d.autoAllowed, false, "un réglage a contourné la protection sur les cas ambigus");
  });

  test("même avec la réponse automatique activée, une opposition reste une opposition", async () => {
    await setPolicy("autoReplyEnabled", true);
    await seedProspect({ email: "contact@stop2.fr" });
    const id = await reponseDe("contact@stop2.fr", "Ne me contactez plus.");
    assert.equal((await decideOnReply(id)).action, "BLACKLIST");
  });

  test("avec la réponse automatique activée et une confiance haute, l'agent peut répondre seul", async () => {
    await setPolicy("autoReplyEnabled", true);
    await seedProspect({ email: "contact@sur.fr" });
    const id = await reponseDe("contact@sur.fr", "Quel est votre tarif pour ce genre de prestation ?");

    const reply = await prisma.reply.findUniqueOrThrow({ where: { id } });
    const d = await decideOnReply(id);
    if (reply.confidence === "HIGH") {
      assert.equal(d.autoAllowed, true, `confiance ${reply.confidence} : ${d.gates.join(" | ")}`);
    } else {
      assert.equal(d.autoAllowed, false);
    }
  });

  test("la décision est conservée et tracée", async () => {
    await seedProspect({ email: "contact@trace-dec.fr" });
    const id = await reponseDe("contact@trace-dec.fr", "Quel est votre tarif ?");
    await decideOnReply(id);

    const reply = await prisma.reply.findUniqueOrThrow({ where: { id } });
    assert.ok(reply.decisionAction);
    assert.ok(reply.decisionReason && reply.decisionReason.length > 10);

    const trace = await prisma.activityLog.findFirst({ where: { action: "operator.decide" } });
    assert.ok(trace, "la décision n'est pas tracée");
  });

  test("tout classement du catalogue reçoit une décision", async () => {
    for (const cls of REPLY_CLASSES) {
      const reply = await prisma.reply.create({
        data: {
          fromEmail: `x-${cls.toLowerCase()}@test.invalid`,
          subject: "Re:", body: "texte", classification: cls, confidence: "MEDIUM",
        },
      });
      const d = await decideOnReply(reply.id);
      assert.ok(d.action, `aucune décision pour ${cls}`);
      assert.ok(d.reason.length > 10, `décision non motivée pour ${cls}`);
    }
  });
});

// === RÉDACTION DES RÉPONSES =================================================

describe("Rédaction des réponses", () => {
  beforeEach(async () => { await resetDatabase(); });

  test("chaque classement répondable a un modèle de message", () => {
    for (const cls of ["INTERESTED", "PRICE_REQUEST", "MEETING_REQUEST", "QUESTION"] as const) {
      assert.ok(KIND_BY_CLASS[cls], `aucun modèle pour ${cls}`);
    }
  });

  test("réponse à un intéressé : vérifiée, sans promesse", async () => {
    const p = await seedProspect({ name: "Salon Redaction", email: "contact@redac1.fr" });
    await seedProvenIssue(p.id);
    await prisma.prospect.update({
      where: { id: p.id },
      data: { recommendedOffer: "PREMIUM", recommendedPrice: 1290 },
    });
    const id = await reponseDe("contact@redac1.fr", "Bonjour, ça m'intéresse, on peut en parler ?");

    const c = await composeReply(id);
    assert.equal(c.verification.passed, true, c.verification.problems.join(" | "));
    assert.ok(c.body.includes("AMYN"), "l'identité AMYN n'apparaît pas");
    assert.ok(!/garanti|doubler|meilleur/i.test(c.body), "promesse détectée");
  });

  test("réponse tarifs : les prix du catalogue, pas d'autres chiffres", async () => {
    const p = await seedProspect({ name: "Coiffure Tarifs", email: "contact@redac2.fr" });
    await seedProvenIssue(p.id);
    const id = await reponseDe("contact@redac2.fr", "Quel est votre tarif ?");

    const c = await composeReply(id);
    assert.equal(c.verification.passed, true, c.verification.problems.join(" | "));
    assert.ok(c.body.includes("790"), "l'offre Essential n'est pas citée");
    assert.ok(c.body.includes("1290") || c.body.includes("1 290"));
  });

  test("demande de rendez-vous : aucun créneau inventé", async () => {
    const p = await seedProspect({ name: "Atelier Rendez-vous", email: "contact@redac3.fr" });
    await seedProvenIssue(p.id);
    const id = await reponseDe("contact@redac3.fr", "On peut se voir mardi ?");

    const c = await composeReply(id);
    assert.equal(c.verification.passed, true, c.verification.problems.join(" | "));
    assert.ok(
      c.avoided.some((a) => /agenda/i.test(a)),
      "le message devrait signaler qu'il n'invente pas de créneau",
    );
    assert.ok(!/\b(lundi|mardi|mercredi|jeudi|vendredi)\s+\d/i.test(c.body), "un créneau précis a été inventé");
  });

  test("prénom inconnu : « Bonjour, » plutôt qu'un prénom inventé", async () => {
    const p = await seedProspect({ name: "Institut Prenom", email: "contact@redac4.fr" });
    await seedProvenIssue(p.id);
    const id = await reponseDe("contact@redac4.fr", "Quel est votre tarif ?");

    const c = await composeReply(id);
    assert.ok(c.body.startsWith("Bonjour,"), c.body.slice(0, 40));
    assert.ok(c.avoided.some((a) => /prénom/i.test(a)));
  });

  test("une réponse ne peut pas être rédigée sans prospect rattaché", async () => {
    const id = await reponseDe("inconnu@ailleurs.fr", "Quel est votre tarif ?");
    await assert.rejects(() => composeReply(id), /aucun prospect/i);
  });

  test("aucune réponse n'est rédigée pour un cas ambigu", async () => {
    await seedProspect({ name: "Salon Ambigu", email: "contact@redac5.fr" });
    const id = await reponseDe("contact@redac5.fr", "C'est très intéressant et bien vu, mais non merci.");
    await assert.rejects(() => composeReply(id), /intervention humaine/i);
  });

  test("relance 1 et relance finale sont différentes et vérifiées", async () => {
    const p = await seedProspect({ name: "Salon Relance", email: "contact@relance.fr" });
    await seedProvenIssue(p.id);

    const r1 = await composeFollowUp(p.id, 1);
    const r2 = await composeFollowUp(p.id, 2);

    assert.equal(r1.verification.passed, true, r1.verification.problems.join(" | "));
    assert.equal(r2.verification.passed, true, r2.verification.problems.join(" | "));
    assert.notEqual(r1.body, r2.body, "les deux relances sont identiques");
    assert.match(r2.body, /derni[èe]re fois|ne vous solliciterai plus/i);
  });

  test("toute relance porte une mention de désinscription", async () => {
    const p = await seedProspect({ name: "Salon Relance Deux", email: "contact@relance2.fr" });
    await seedProvenIssue(p.id);
    for (const step of [1, 2]) {
      const r = await composeFollowUp(p.id, step);
      assert.match(r.body, /STOP/, `relance ${step} sans mention d'opposition`);
    }
  });
});

// === JOBS ET IDEMPOTENCE ====================================================

describe("Jobs planifiés", () => {
  beforeEach(async () => { await resetDatabase(); });

  test("un job exécuté deux fois dans la même fenêtre ne travaille qu'une fois", async () => {
    let executions = 0;
    const travail = async () => {
      executions += 1;
      return { summary: "fait", itemsSeen: 1, itemsChanged: 1 };
    };
    const cle = "test:fenetre-unique";

    const a = await runJob("maintenance", travail, { lockKey: cle });
    const b = await runJob("maintenance", travail, { lockKey: cle });

    assert.equal(a.ran, true);
    assert.equal(b.skipped, true, "la seconde exécution a retravaillé");
    assert.equal(executions, 1, `le travail a tourné ${executions} fois`);
  });

  test("le verrou survit à un redémarrage : il est en base, pas en mémoire", async () => {
    const cle = "test:persistant";
    await runJob("maintenance", async () => ({ summary: "ok", itemsSeen: 0, itemsChanged: 0 }), { lockKey: cle });

    const verrou = await prisma.jobRun.findUnique({ where: { lockKey: cle } });
    assert.ok(verrou, "aucun verrou en base");
    assert.equal(verrou!.status, "DONE");
  });

  test("un job en échec est enregistré et n'interrompt pas l'appelant", async () => {
    const r = await runJob("maintenance", async () => { throw new Error("panne simulée"); }, {
      lockKey: "test:echec",
    });
    assert.ok(r.error);
    const run = await prisma.jobRun.findUniqueOrThrow({ where: { lockKey: "test:echec" } });
    assert.equal(run.status, "FAILED");
    assert.match(run.error ?? "", /panne simulée/);
  });

  test("la clé de fenêtre change à la minute", () => {
    const a = windowKey("sync-inbox", new Date("2026-08-19T10:00:30Z"));
    const b = windowKey("sync-inbox", new Date("2026-08-19T10:00:59Z"));
    const c = windowKey("sync-inbox", new Date("2026-08-19T10:01:00Z"));
    assert.equal(a, b, "deux appels dans la même minute doivent partager le verrou");
    assert.notEqual(a, c);
  });

  test("le job de décision ne retraite pas ce qui est déjà décidé", async () => {
    await seedProspect({ email: "contact@job1.fr" });
    await seedProspect({ email: "contact@job2.fr" });
    await reponseDe("contact@job1.fr", "Quel est votre tarif ?");
    await reponseDe("contact@job2.fr", "Non merci.");

    const premier = await jobDecideReplies();
    assert.equal(premier.itemsChanged, 2);

    const second = await runJob("decide-replies", async () => {
      const restant = await prisma.reply.count({ where: { decisionAction: null } });
      return { summary: `${restant} en attente`, itemsSeen: restant, itemsChanged: 0 };
    }, { lockKey: "decide-replies:second" });

    assert.equal(second.itemsSeen, 0, "des réponses déjà décidées ont été reprises");
  });

  test("la maintenance retire de campagne un prospect passé en opposition", async () => {
    const p = await seedProspect({ email: "contact@maint.fr" });
    const campagne = await prisma.campaign.create({
      data: { name: "Test", slug: `test-${Date.now()}`, fromEmail: "contact@amyn.agency", fromName: "AMYN" },
    });
    await prisma.campaignMember.create({
      data: { campaignId: campagne.id, prospectId: p.id, status: "READY" },
    });
    await prisma.prospect.update({ where: { id: p.id }, data: { status: "OPTOUT" } });

    const r = await jobMaintenance();
    assert.ok(r.itemsChanged >= 1, r.summary);

    const membre = await prisma.campaignMember.findFirstOrThrow({ where: { prospectId: p.id } });
    assert.equal(membre.status, "SKIPPED");
  });

  test("la maintenance désactive un brouillon actif sur un prospect en opposition", async () => {
    const p = await seedProspect({ email: "contact@maint2.fr" });
    await seedDraft(p.id);
    await prisma.prospect.update({ where: { id: p.id }, data: { status: "OPTOUT" } });

    await jobMaintenance();
    const actif = await prisma.emailDraft.count({ where: { prospectId: p.id, isActive: true } });
    assert.equal(actif, 0, "un brouillon reste actif malgré l'opposition");
  });

  test("les exécutions sont consultables", async () => {
    await jobMaintenance();
    const runs = await recentJobs(5);
    assert.ok(runs.length >= 1);
    assert.ok(runs[0].summary);
  });
});

// === RELANCES ===============================================================

describe("Relances", () => {
  beforeEach(async () => { await resetDatabase(); });

  /** Met en place un prospect contacté il y a N jours, sans réponse. */
  async function contacteIlYA(jours: number, email: string) {
    const p = await seedProspect({ name: `Salon ${email.split("@")[0]}`, email, status: "CONTACTED" });
    await seedProvenIssue(p.id);
    const campagne = await prisma.campaign.create({
      data: { name: "Relances", slug: `rel-${Math.random().toString(36).slice(2)}`, fromEmail: "contact@amyn.agency", fromName: "AMYN" },
    });
    await prisma.campaignMember.create({
      data: {
        campaignId: campagne.id, prospectId: p.id, status: "SENT",
        sequenceStep: 0, lastSentAt: new Date(Date.now() - jours * 86400000),
      },
    });
    return { prospect: p, campagne };
  }

  test("une relance est préparée quand le délai est écoulé", async () => {
    await contacteIlYA(10, "contact@rel1.fr");
    const r = await jobDueFollowUps();
    assert.equal(r.itemsChanged, 1, r.summary);

    const draft = await prisma.emailDraft.findFirst({
      where: { sequenceStep: 1, isActive: true },
    });
    assert.ok(draft, "aucune relance rédigée");
    assert.equal(draft!.approvedAt, null, "la relance a été pré-approuvée");
  });

  test("aucune relance avant le délai, et la raison est dite", async () => {
    await contacteIlYA(1, "contact@rel2.fr");
    const r = await jobDueFollowUps();
    assert.equal(r.itemsChanged, 0, "une relance est partie trop tôt");

    // Le délai est vérifié à deux endroits : par findFollowUpCandidates (qui
    // applique le délai de la campagne) puis par le job (qui applique celui de
    // la politique). Dans les deux cas, la raison doit être lisible.
    const bloques = (r.details?.bloques ?? []) as Array<{ raison: string }>;
    const ecartes = (r.details?.skipped ?? []) as Array<{ reason: string }>;
    const raisons = [...bloques.map((b) => b.raison), ...ecartes.map((e) => e.reason)];

    assert.ok(raisons.length > 0, "le prospect a disparu sans explication");
    assert.ok(
      raisons.some((x) => /d[ée]lai/i.test(x)),
      `aucune raison de délai : ${JSON.stringify(raisons)}`,
    );
  });

  test("le job de relance ne prépare pas deux fois le même jour", async () => {
    await contacteIlYA(10, "contact@rel3.fr");
    const a = await jobDueFollowUps();
    const b = await jobDueFollowUps();

    assert.equal(a.ran, true);
    assert.equal(b.skipped, true, "le job a retravaillé le même jour");
    assert.equal(await prisma.emailDraft.count({ where: { sequenceStep: 1 } }), 1);
  });

  test("un prospect qui a répondu n'est jamais relancé", async () => {
    const { prospect } = await contacteIlYA(10, "contact@rel4.fr");
    await reponseDe("contact@rel4.fr", "Merci, je regarde ça.");

    const r = await jobDueFollowUps();
    const draft = await prisma.emailDraft.findFirst({
      where: { prospectId: prospect.id, sequenceStep: 1 },
    });
    assert.equal(draft, null, `une relance a été préparée : ${r.summary}`);
  });

  test("un prospect en opposition n'est jamais relancé", async () => {
    const { prospect } = await contacteIlYA(10, "contact@rel5.fr");
    await addToSuppressionList({ email: "contact@rel5.fr", reason: "UNSUBSCRIBED", source: "test" });

    await jobDueFollowUps();
    const draft = await prisma.emailDraft.findFirst({
      where: { prospectId: prospect.id, sequenceStep: 1 },
    });
    assert.equal(draft, null, "une relance a été préparée malgré l'opposition");
  });

  test("la limite de relances est respectée", async () => {
    await setPolicy("maxFollowUps", 1);
    const { prospect, campagne } = await contacteIlYA(20, "contact@rel6.fr");
    await prisma.campaignMember.updateMany({
      where: { campaignId: campagne.id, prospectId: prospect.id },
      data: { sequenceStep: 1 },
    });

    const r = await jobDueFollowUps();
    const bloques = (r.details?.bloques ?? []) as Array<{ raison: string }>;
    assert.ok(
      r.itemsChanged === 0 && bloques.some((b) => /limite/i.test(b.raison)),
      `${r.summary} — ${JSON.stringify(bloques)}`,
    );
  });
});

// === GARANTIES STRUCTURELLES ================================================

describe("Garanties de l'opérateur", () => {
  test("aucun module de l'opérateur n'envoie d'email", async () => {
    for (const f of [
      "lib/operator/decide.ts", "lib/operator/mission.ts",
      "lib/qualification/index.ts", "lib/policy/index.ts",
      "lib/scheduler/index.ts", "lib/scheduler/jobs.ts",
      "lib/email/replies.ts",
    ]) {
      const src = await readFile(join(ROOT, f), "utf8");
      assert.ok(!/from "@\/lib\/mailer/.test(src), `${f} importe le mailer`);
      assert.ok(!/sendOne\(|runCampaign\(|sendMail\(/.test(src), `${f} contient un appel d'envoi`);
    }
  });

  test("les actions de l'interface n'envoient pas non plus", async () => {
    const src = await readFile(join(ROOT, "app/operator/actions.ts"), "utf8");
    assert.ok(!/from "@\/lib\/mailer/.test(src));
    assert.ok(!/sendOne\(|runCampaign\(/.test(src), "le centre de contrôle peut envoyer directement");
  });

  test("la décision consulte la liste d'opposition avant toute autre règle", async () => {
    const src = await readFile(join(ROOT, "lib/operator/decide.ts"), "utf8");
    const opposition = src.indexOf("suppression.findFirst");
    const repondables = src.indexOf("REPONDABLES.includes");
    assert.ok(opposition > 0 && opposition < repondables,
      "la liste d'opposition n'est pas consultée en premier");
  });

  test("une mission ne peut pas envoyer : elle s'arrête à la campagne", async () => {
    const src = await readFile(join(ROOT, "lib/operator/mission.ts"), "utf8");
    assert.ok(!/runCampaign|sendOne/.test(src), "la mission peut déclencher un envoi");
    assert.ok(/prepareCampaign/.test(src), "la mission ne prépare pas de campagne");
  });
});
