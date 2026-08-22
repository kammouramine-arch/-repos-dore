// ---------------------------------------------------------------------------
// WORKFLOW COMPLET, DE BOUT EN BOUT
//
//   prospect → audit prouvé → email rédigé → campagne → approbation →
//   envoi (SIMULÉ, DRY_RUN) → réponse du prospect dans la boîte →
//   lecture IMAP → classification → mise à jour CRM → action suivante
//
// Chaque étape passe par les VRAIS modules de production. Seuls deux éléments
// sont simulés : le transport d'envoi (dry-run) et la boîte mail (en mémoire).
// Aucun email réel, aucun accès réseau.
// ---------------------------------------------------------------------------

import { test, describe, before, beforeEach, after } from "node:test";
import assert from "node:assert/strict";

import { prisma } from "@/lib/db";
import { config } from "@/lib/config";
import { generateEmail } from "@/lib/email/generate";
import {
  createCampaign,
  addProspectsToCampaign,
  prepareCampaign,
  approveCampaignMembers,
  runCampaign,
} from "@/lib/campaign";
import { runComplianceChecks } from "@/lib/campaign/compliance";
import { findFollowUpCandidates } from "@/lib/campaign/followup";
import { syncReplies, replyInbox } from "@/lib/replies/sync";
import { RECOMMENDED_ACTION } from "@/lib/constants";
import { resetDatabase, seedProspect, seedProvenIssue } from "./helpers";
import { FakeMailbox, QUOTED_ORIGINAL, type FakeMessage } from "./fake-mailbox";

/** Corps de réponse réalistes, tels qu'un gérant les écrirait vraiment. */
const REPONSES = {
  interesse: [
    "Bonjour,",
    "",
    "Merci pour votre message. Effectivement notre site date un peu et on en parle",
    "régulièrement avec mon associée. Ça m'intéresse d'en savoir plus.",
    "Vous êtes disponible en fin de semaine pour en discuter ?",
    "",
    "Cordialement,",
    "Sophie Lemaire",
  ].join("\n"),

  prix: [
    "Bonjour,",
    "",
    "Merci de votre message. Quel est votre tarif pour ce genre de prestation ?",
    "",
    "Bien à vous",
  ].join("\n"),

  refus: [
    "Bonjour,",
    "",
    "Merci mais nous avons déjà quelqu'un qui s'occupe de notre site.",
    "Non merci donc.",
    "",
    "Cordialement",
  ].join("\n"),

  optOut: [
    "Bonjour,",
    "",
    "Merci de me désinscrire de votre liste, je ne souhaite plus recevoir",
    "de messages commerciaux.",
    "",
    "Cordialement",
  ].join("\n"),

  ambigu: [
    "Bonjour,",
    "",
    "Merci beaucoup pour votre analyse, c'est intéressant. Mais non merci,",
    "ce n'est pas le moment. Rappelez-moi peut-être dans six mois.",
  ].join("\n"),

  absence: [
    "Je suis absent du 15 au 30 août.",
    "Pour toute urgence, contactez le 03 20 00 00 00.",
    "Votre message m'intéresse, je vous réponds à mon retour.",
  ].join("\n"),

  inconnu: [
    "Bonjour,",
    "",
    "Je suis tombé sur votre site, pouvez-vous me rappeler ?",
    "",
    "Merci",
  ].join("\n"),
};

/** Rebond serveur, tel qu'un MTA le renvoie. */
const REBOND = [
  "This is the mail system at host mx1.ovh.net.",
  "",
  "I'm sorry to have to inform you that your message could not be delivered.",
  "",
  "<contact@salon-ferme.fr>: host mx.salon-ferme.fr said:",
  "  550 5.1.1 <contact@salon-ferme.fr>: Recipient address rejected: User unknown",
].join("\n");

type Acteur = {
  nom: string;
  email: string;
  prospectId: string;
};

/** Crée un prospect complet : audit prouvé + contact vérifié + email rédigé. */
async function prospectPret(nom: string, email: string): Promise<Acteur> {
  const prospect = await seedProspect({ name: nom, email, status: "AUDITED" });
  await seedProvenIssue(prospect.id);
  await generateEmail(prospect.id);
  return { nom, email, prospectId: prospect.id };
}

describe("Workflow complet : envoi → réponse → CRM → action suivante", () => {
  let campagneId = "";
  let acteurs: Record<string, Acteur> = {};

  before(async () => {
    await resetDatabase();

    // --- Un panel réaliste : sept salons de la métropole lilloise ----------
    acteurs = {
      interesse: await prospectPret("Salon Lemaire", "contact@salon-lemaire.fr"),
      prix: await prospectPret("Coiffure Delatte", "bonjour@coiffure-delatte.fr"),
      refus: await prospectPret("Atelier Vandamme", "contact@atelier-vandamme.fr"),
      optOut: await prospectPret("Institut Merlin", "info@institut-merlin.fr"),
      ambigu: await prospectPret("Salon Dubois", "contact@salon-dubois.fr"),
      absent: await prospectPret("Coiffure Leroy", "contact@coiffure-leroy.fr"),
      silencieux: await prospectPret("Salon Fontaine", "contact@salon-fontaine.fr"),
    };
  });

  after(async () => { await prisma.$disconnect(); });

  // === ÉTAPE 1 — PRÉPARATION ==============================================

  test("étape 1 · chaque email rédigé s'appuie sur un problème prouvé", async () => {
    for (const acteur of Object.values(acteurs)) {
      const draft = await prisma.emailDraft.findFirstOrThrow({
        where: { prospectId: acteur.prospectId, isActive: true },
      });
      const cites: string[] = JSON.parse(draft.citedIssueIds);
      assert.ok(cites.length > 0, `${acteur.nom} : email sans problème cité`);

      const connus = await prisma.issue.findMany({
        where: { prospectId: acteur.prospectId },
        select: { id: true },
      });
      for (const id of cites) {
        assert.ok(connus.some((i) => i.id === id), `${acteur.nom} : problème cité inexistant`);
      }
      assert.equal(draft.verificationPassed, true, `${acteur.nom} : email non vérifié`);
    }
  });

  // === ÉTAPE 2 — CAMPAGNE ET APPROBATION ==================================

  test("étape 2 · la campagne refuse d'envoyer avant approbation", async () => {
    const campagne = await createCampaign({
      name: "Coiffeurs Lille — août",
      targetCriteria: { city: "Lille", sectors: ["coiffeur"] },
    });
    campagneId = campagne.id;

    await addProspectsToCampaign(campagneId, Object.values(acteurs).map((a) => a.prospectId));
    const prepare = await prepareCampaign(campagneId);
    assert.equal(prepare.prepared, 7, `${prepare.prepared} email(s) préparé(s) au lieu de 7`);

    const avant = await runCampaign(campagneId);
    assert.equal(avant.sent, 0, "un email est parti sans approbation");
    assert.equal(avant.simulated, 0, "un email a été traité sans approbation");
    assert.equal(avant.blocked, 7, "les envois non approuvés n'ont pas tous été bloqués");
  });

  test("étape 3 · après approbation, les 7 envois sont SIMULÉS, aucun réel", async () => {
    const approbation = await approveCampaignMembers(campagneId, "TEST");
    assert.equal(approbation.approved, 7);

    const resultat = await runCampaign(campagneId);
    assert.equal(resultat.sent, 0, "UN EMAIL RÉEL EST PARTI — le verrou DRY_RUN a échoué");
    assert.equal(resultat.simulated, 7);

    const journaux = await prisma.sendLog.findMany({ where: { campaignId: campagneId } });
    assert.equal(journaux.length, 7);
    for (const j of journaux) {
      assert.equal(j.status, "SIMULATED");
      assert.equal(j.dryRun, true);
      assert.equal(j.transport, "dry-run");

      const rapport = JSON.parse(j.complianceReport!);
      assert.equal(rapport.allowed, true);
      assert.ok(rapport.checks.every((c: { passed: boolean }) => c.passed), "un contrôle a échoué");
    }
  });

  // === ÉTAPE 4 — LES RÉPONSES ARRIVENT DANS LA BOÎTE ======================

  test("étape 4 · les réponses sont lues, classées et rattachées", async () => {
    const hier = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const boite: FakeMessage[] = [
      {
        uid: 101, from: acteurs.interesse.email, fromName: "Sophie Lemaire",
        subject: "Re: Salon Lemaire — votre site",
        body: REPONSES.interesse + QUOTED_ORIGINAL, receivedAt: hier,
        messageId: "<CAF1@salon-lemaire.fr>",
      },
      {
        uid: 102, from: acteurs.prix.email, fromName: "M. Delatte",
        subject: "Re: Coiffure Delatte — votre site",
        body: REPONSES.prix + QUOTED_ORIGINAL, receivedAt: hier,
        messageId: "<CAF2@coiffure-delatte.fr>",
      },
      {
        uid: 103, from: acteurs.refus.email,
        subject: "Re: Atelier Vandamme — votre site",
        body: REPONSES.refus + QUOTED_ORIGINAL, receivedAt: hier,
        messageId: "<CAF3@atelier-vandamme.fr>",
      },
      {
        uid: 104, from: acteurs.optOut.email,
        subject: "Re: Institut Merlin — votre site",
        body: REPONSES.optOut + QUOTED_ORIGINAL, receivedAt: hier,
        messageId: "<CAF4@institut-merlin.fr>",
      },
      {
        uid: 105, from: acteurs.ambigu.email,
        subject: "Re: Salon Dubois — votre site",
        body: REPONSES.ambigu + QUOTED_ORIGINAL, receivedAt: hier,
        messageId: "<CAF5@salon-dubois.fr>",
      },
      {
        uid: 106, from: acteurs.absent.email,
        subject: "Réponse automatique : absence du bureau",
        body: REPONSES.absence, receivedAt: hier,
        messageId: "<AUTO6@coiffure-leroy.fr>",
        headers: { "auto-submitted": "auto-replied" },
      },
      {
        uid: 107, from: "gerant@boulangerie-inconnue.fr", fromName: "Paul Mercier",
        subject: "Question",
        body: REPONSES.inconnu, receivedAt: hier,
        messageId: "<CAF7@boulangerie-inconnue.fr>",
      },
      {
        uid: 108, from: "mailer-daemon@mx1.ovh.net",
        subject: "Undelivered Mail Returned to Sender",
        body: REBOND, receivedAt: hier,
        messageId: "<BOUNCE8@mx1.ovh.net>",
      },
    ];

    const rapport = await syncReplies(new FakeMailbox(boite));

    assert.equal(rapport.error, undefined);
    assert.equal(rapport.fetched, 8);
    assert.equal(rapport.stored, 8);
    assert.equal(rapport.optOuts, 1, "l'opposition n'a pas été comptée");
    assert.equal(rapport.needsHuman, 1, "la réponse ambiguë n'a pas été signalée");
    assert.equal(rapport.unmatched, 2, "l'inconnu et le rebond auraient dû rester non rattachés");
  });

  test("étape 5 · le prospect intéressé passe en INTERESTED avec l'action qui va avec", async () => {
    const reponse = await prisma.reply.findUniqueOrThrow({
      where: { messageId: "<CAF1@salon-lemaire.fr>" },
    });

    assert.ok(
      ["INTERESTED", "MEETING_REQUEST"].includes(reponse.classification),
      `classée ${reponse.classification}`,
    );
    assert.equal(reponse.prospectId, acteurs.interesse.prospectId);
    assert.equal(reponse.matchedBy, "CONTACT");
    assert.equal(reponse.reviewStatus, "ACTION_REQUIRED");
    assert.equal(reponse.recommendedAction, RECOMMENDED_ACTION[reponse.classification as "INTERESTED"]);

    const prospect = await prisma.prospect.findUniqueOrThrow({
      where: { id: acteurs.interesse.prospectId },
    });
    assert.ok(["INTERESTED", "MEETING"].includes(prospect.status), prospect.status);
    assert.ok(prospect.nextAction && prospect.nextAction.length > 5);
    assert.ok(prospect.lastInteractionAt, "aucune date de dernière interaction");

    const historique = await prisma.statusEvent.findMany({
      where: { prospectId: acteurs.interesse.prospectId },
      orderBy: { createdAt: "asc" },
    });
    assert.ok(historique.length >= 1, "aucun historique de statut");
    assert.ok(
      historique.some((e) => ["INTERESTED", "MEETING"].includes(e.toStatus)),
      "le passage en intéressé n'est pas tracé",
    );
  });

  test("étape 5 bis · la demande de prix propose d'envoyer le devis", async () => {
    const reponse = await prisma.reply.findUniqueOrThrow({
      where: { messageId: "<CAF2@coiffure-delatte.fr>" },
    });
    assert.equal(reponse.classification, "PRICE_REQUEST");
    assert.match(reponse.recommendedAction ?? "", /devis/i);

    const prospect = await prisma.prospect.findUniqueOrThrow({
      where: { id: acteurs.prix.prospectId },
    });
    assert.equal(prospect.status, "INTERESTED");
  });

  test("étape 5 ter · le refus arrête la séquence et passe le prospect en LOST", async () => {
    const reponse = await prisma.reply.findUniqueOrThrow({
      where: { messageId: "<CAF3@atelier-vandamme.fr>" },
    });
    assert.equal(reponse.classification, "NOT_INTERESTED");
    assert.match(reponse.recommendedAction ?? "", /arrêter la séquence/i);

    const prospect = await prisma.prospect.findUniqueOrThrow({
      where: { id: acteurs.refus.prospectId },
    });
    assert.equal(prospect.status, "LOST");

    const membre = await prisma.campaignMember.findFirstOrThrow({
      where: { campaignId: campagneId, prospectId: acteurs.refus.prospectId },
    });
    assert.equal(membre.status, "REPLIED");
    assert.equal(membre.nextSendAt, null);
  });

  test("étape 6 · l'opposition met en liste noire et rend tout envoi futur impossible", async () => {
    const reponse = await prisma.reply.findUniqueOrThrow({
      where: { messageId: "<CAF4@institut-merlin.fr>" },
    });
    assert.equal(reponse.classification, "OPT_OUT");
    assert.equal(reponse.confidence, "HIGH");
    assert.match(reponse.recommendedAction ?? "", /blacklist/i);
    assert.equal(reponse.reviewStatus, "RESOLVED", "une opposition n'appelle aucune action");

    const opposition = await prisma.suppression.findUniqueOrThrow({
      where: { email: acteurs.optOut.email },
    });
    assert.equal(opposition.reason, "UNSUBSCRIBED");

    const prospect = await prisma.prospect.findUniqueOrThrow({
      where: { id: acteurs.optOut.prospectId },
    });
    assert.equal(prospect.status, "OPTOUT");

    // La preuve concrète : un nouvel envoi est refusé.
    const draft = await prisma.emailDraft.findFirstOrThrow({
      where: { prospectId: acteurs.optOut.prospectId, isActive: true },
    });
    await prisma.emailDraft.update({ where: { id: draft.id }, data: { approvedAt: new Date() } });
    const controle = await runComplianceChecks({
      prospectId: acteurs.optOut.prospectId,
      draftId: draft.id,
      step: 1,
    });
    assert.equal(controle.allowed, false, "un envoi reste possible après une opposition");
    assert.ok(controle.blockedBy.includes("CHECK_OPT_OUT"));
  });

  test("étape 7 · la réponse ambiguë demande une intervention humaine", async () => {
    const reponse = await prisma.reply.findUniqueOrThrow({
      where: { messageId: "<CAF5@salon-dubois.fr>" },
    });
    assert.equal(reponse.classification, "NEEDS_HUMAN");
    assert.equal(reponse.confidence, "LOW");
    assert.equal(reponse.reviewStatus, "ACTION_REQUIRED");
    assert.match(reponse.recommendedAction ?? "", /intervention humaine/i);

    // Ni intéressé ni perdu : le système n'a rien décidé à votre place.
    const prospect = await prisma.prospect.findUniqueOrThrow({
      where: { id: acteurs.ambigu.prospectId },
    });
    assert.equal(prospect.status, "REPLIED");
  });

  test("étape 8 · l'absence du bureau ne fait pas passer le prospect en intéressé", async () => {
    const reponse = await prisma.reply.findUniqueOrThrow({
      where: { messageId: "<AUTO6@coiffure-leroy.fr>" },
    });
    assert.equal(reponse.classification, "UNKNOWN");

    const prospect = await prisma.prospect.findUniqueOrThrow({
      where: { id: acteurs.absent.prospectId },
    });
    assert.notEqual(prospect.status, "INTERESTED", "un message d'absence a été lu comme un intérêt");
  });

  test("étape 9 · l'expéditeur inconnu est conservé sans être rattaché au hasard", async () => {
    const reponse = await prisma.reply.findUniqueOrThrow({
      where: { messageId: "<CAF7@boulangerie-inconnue.fr>" },
    });
    assert.equal(reponse.prospectId, null);
    assert.equal(reponse.matchedBy, "NONE");
    assert.equal(reponse.fromName, "Paul Mercier");
    assert.ok(reponse.body.includes("rappeler"), "le message n'a pas été conservé");
  });

  test("étape 10 · le rebond bloque l'adresse et marque l'envoi", async () => {
    const reponse = await prisma.reply.findUniqueOrThrow({
      where: { messageId: "<BOUNCE8@mx1.ovh.net>" },
    });
    assert.equal(reponse.classification, "BOUNCE");

    const opposition = await prisma.suppression.findUnique({
      where: { email: "mailer-daemon@mx1.ovh.net" },
    });
    assert.ok(opposition, "l'adresse de rebond n'a pas été bloquée");
    assert.equal(opposition!.reason, "BOUNCED");
  });

  // === ÉTAPE 11 — RELANCES ================================================

  test("étape 11 · seul le prospect silencieux reste éligible à une relance", async () => {
    // On place tous les membres dans l'état « envoyé il y a 10 jours ».
    await prisma.campaignMember.updateMany({
      where: { campaignId: campagneId, status: { in: ["APPROVED", "SENT", "PENDING"] } },
      data: {
        status: "SENT",
        sequenceStep: 0,
        lastSentAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
      },
    });

    const { candidates, skipped } = await findFollowUpCandidates(campagneId);
    const noms = candidates.map((c) => c.prospectName);

    assert.ok(noms.includes("Salon Fontaine"), "le prospect silencieux devrait être relançable");
    for (const nom of ["Salon Lemaire", "Coiffure Delatte", "Atelier Vandamme", "Institut Merlin"]) {
      assert.ok(!noms.includes(nom), `${nom} a répondu : il ne doit pas être relancé`);
    }
    assert.ok(skipped.some((s) => /répondu/i.test(s.reason)));
  });

  // === ÉTAPE 12 — ÉTAT FINAL ==============================================

  test("étape 12 · le centre de tri donne des chiffres exacts", async () => {
    const inbox = await replyInbox();
    assert.equal(inbox.total, 8);
    assert.equal(inbox.optOuts, 1);
    assert.equal(inbox.needsHuman, 1);
    assert.equal(inbox.interested, 2, "intéressé + demande de prix");
    assert.ok(inbox.actionRequired >= 3);
    assert.ok(inbox.lastSyncAt);
  });

  test("étape 12 bis · chaque réponse porte une action recommandée", async () => {
    const reponses = await prisma.reply.findMany();
    for (const r of reponses) {
      assert.ok(r.recommendedAction, `${r.fromEmail} : aucune action recommandée`);
      assert.ok(r.recommendedAction!.length > 5);
    }
  });

  test("étape 13 · une relecture de la boîte ne crée aucun doublon", async () => {
    const avant = await prisma.reply.count();
    const memeBoite = new FakeMailbox([
      { uid: 101, from: acteurs.interesse.email, subject: "Re:", body: REPONSES.interesse, messageId: "<CAF1@salon-lemaire.fr>" },
    ], { uidValidity: "9999" }); // force une relecture complète

    const rapport = await syncReplies(memeBoite);
    assert.equal(rapport.duplicates, 1, "le message relu n'a pas été reconnu");
    assert.equal(rapport.stored, 0);
    assert.equal(await prisma.reply.count(), avant, "un doublon a été créé");
  });

  // === GARANTIE FINALE ====================================================

  test("GARANTIE · aucun email réel n'est parti de tout le workflow", async () => {
    assert.equal(config.dryRun, true, "DRY_RUN n'est plus actif");

    const reels = await prisma.sendLog.count({ where: { status: "SENT" } });
    assert.equal(reels, 0, `${reels} email(s) réellement envoyé(s)`);

    const horsSimulation = await prisma.sendLog.count({ where: { dryRun: false } });
    assert.equal(horsSimulation, 0, "un envoi a été effectué hors mode simulation");

    const transports = await prisma.sendLog.groupBy({ by: ["transport"], _count: { _all: true } });
    for (const t of transports) {
      assert.equal(t.transport, "dry-run", `transport inattendu : ${t.transport}`);
    }
  });

  test("GARANTIE · aucune réponse automatique n'a été envoyée aux prospects", async () => {
    // Les seuls envois enregistrés sont les 7 emails initiaux de la campagne.
    // Si le système avait répondu tout seul, il y en aurait davantage.
    const total = await prisma.sendLog.count();
    assert.equal(total, 7, `${total} envois enregistrés au lieu des 7 emails initiaux`);

    const apresReponses = await prisma.sendLog.count({
      where: { sequenceStep: { gt: 0 } },
    });
    assert.equal(apresReponses, 0, "un email a été envoyé en réaction à une réponse");
  });

  test("GARANTIE · chaque étape a laissé une trace au journal", async () => {
    const modules = await prisma.activityLog.groupBy({ by: ["module"], _count: { _all: true } });
    const noms = modules.map((m) => m.module);
    for (const attendu of ["EMAIL", "SEND", "REPLIES"]) {
      assert.ok(noms.includes(attendu), `aucune trace du module ${attendu} : ${noms.join(", ")}`);
    }

    const lecture = await prisma.activityLog.findFirst({ where: { action: "replies.sync" } });
    assert.ok(lecture, "la lecture de la boîte n'est pas tracée");
    assert.match(lecture!.summary, /aucun email envoyé/i);
  });
});

// ---------------------------------------------------------------------------
// Le même parcours vu du côté du prospect qui répond DEUX fois.
// ---------------------------------------------------------------------------

describe("Conversation en plusieurs échanges", () => {
  beforeEach(async () => { await resetDatabase(); });

  test("une deuxième réponse met à jour le prospect sans écraser l'historique", async () => {
    const acteur = await prospectPret("Salon Suite", "contact@salon-suite.fr");

    await syncReplies(
      new FakeMailbox([
        {
          uid: 200, from: acteur.email, subject: "Re: votre message",
          body: "Merci, je regarde ça et je reviens vers vous.",
          messageId: "<suite-1@salon-suite.fr>",
          receivedAt: new Date(Date.now() - 3 * 86400000),
        },
      ]),
    );

    const apresPremier = await prisma.prospect.findUniqueOrThrow({ where: { id: acteur.prospectId } });

    await syncReplies(
      new FakeMailbox([
        {
          uid: 201, from: acteur.email, subject: "Re: votre message",
          body: "C'est bon pour moi, ça m'intéresse. On peut se voir la semaine prochaine ?",
          messageId: "<suite-2@salon-suite.fr>",
          receivedAt: new Date(),
        },
      ], { uidValidity: "1000" }),
    );

    const apresSecond = await prisma.prospect.findUniqueOrThrow({ where: { id: acteur.prospectId } });

    assert.ok(["INTERESTED", "MEETING"].includes(apresSecond.status), apresSecond.status);
    assert.notEqual(apresSecond.status, apresPremier.status, "le second message n'a rien changé");

    // Les deux réponses sont conservées : rien n'est écrasé.
    const reponses = await prisma.reply.findMany({
      where: { prospectId: acteur.prospectId },
      orderBy: { receivedAt: "asc" },
    });
    assert.equal(reponses.length, 2, "l'historique des réponses a été écrasé");
    assert.ok(reponses[0].receivedAt < reponses[1].receivedAt);
  });

  test("une opposition après un intérêt annule l'intérêt", async () => {
    const acteur = await prospectPret("Salon Revirement", "contact@salon-revirement.fr");

    await syncReplies(
      new FakeMailbox([
        { uid: 300, from: acteur.email, subject: "Re:", body: "Ça m'intéresse !", messageId: "<rev-1@x.fr>" },
      ]),
    );
    const interesse = await prisma.prospect.findUniqueOrThrow({ where: { id: acteur.prospectId } });
    assert.ok(["INTERESTED", "MEETING"].includes(interesse.status));

    await syncReplies(
      new FakeMailbox([
        { uid: 301, from: acteur.email, subject: "Re:", body: "Finalement non, désinscrivez-moi.", messageId: "<rev-2@x.fr>" },
      ], { uidValidity: "1000" }),
    );

    const final = await prisma.prospect.findUniqueOrThrow({ where: { id: acteur.prospectId } });
    assert.equal(final.status, "OPTOUT", "l'opposition n'a pas annulé l'intérêt");
    assert.ok(await prisma.suppression.findUnique({ where: { email: acteur.email } }));
  });
});
