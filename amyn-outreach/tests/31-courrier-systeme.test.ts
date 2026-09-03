// ---------------------------------------------------------------------------
// COURRIER SYSTÈME ET RÉPONSES NON RATTACHÉES
//
// Les deux cas réels qui ont motivé ce travail :
//
//   • noreply-dmarc-support@google.com — un rapport DMARC quotidien, compté
//     comme une réponse de prospect ;
//   • mrfitman99@gmail.com — un expéditeur inconnu, sans prospect ni envoi
//     permettant de le rattacher, compté comme une réponse commerciale.
//
// Aucun des deux n'était une réponse. Comptés comme telles, ils gonflent un
// chiffre qui sert à décider et remontent en « Action requise », où ils
// noient les vraies réponses.
//
// RIEN N'EST SUPPRIMÉ : ces messages restent enregistrés et consultables.
// ---------------------------------------------------------------------------

import { test, describe, before, beforeEach } from "node:test";
import assert from "node:assert/strict";

import { prisma } from "@/lib/db";
import { detecterCourrierSysteme, reclasserReponses } from "@/lib/replies/system-mail";
import { ingestReply } from "@/lib/replies/ingest";
import { resetDatabase, seedProspect } from "./helpers";

before(async () => { await resetDatabase(); });
beforeEach(async () => { await resetDatabase(); });

describe("Reconnaissance des rapports DMARC", () => {
  test("LE CAS RÉEL : noreply-dmarc-support@google.com", () => {
    const v = detecterCourrierSysteme({
      fromEmail: "noreply-dmarc-support@google.com",
      subject: "Report domain: amyn.agency Submitter: google.com Report-ID: 123456",
    });
    assert.equal(v.isSystem, true);
    assert.equal(v.kind, "DMARC_REPORT");
    assert.ok(v.signals.length > 0, "aucun signal expliquant la reconnaissance");
  });

  test("un rapport d'un autre fournisseur est reconnu aussi", () => {
    const v = detecterCourrierSysteme({
      fromEmail: "dmarcreport@microsoft.com",
      subject: "Report Domain: amyn.agency Submitter: microsoft.com",
    });
    assert.equal(v.kind, "DMARC_REPORT");
  });

  test("l'en-tête X-Report-Type suffit, même sans sujet parlant", () => {
    const v = detecterCourrierSysteme({
      fromEmail: "reports@exemple.fr",
      subject: "Votre rapport",
      headers: { "X-Report-Type": "dmarc" },
    });
    assert.equal(v.kind, "DMARC_REPORT");
  });
});

describe("Reconnaissance des rebonds et messages automatiques", () => {
  test("un avis de non-remise est reconnu", () => {
    const v = detecterCourrierSysteme({
      fromEmail: "MAILER-DAEMON@ssl0.ovh.net",
      subject: "Undelivered Mail Returned to Sender",
    });
    assert.equal(v.kind, "BOUNCE");
  });

  test("l'en-tête de rapport de remise est décisif", () => {
    const v = detecterCourrierSysteme({
      fromEmail: "postmaster@exemple.fr",
      subject: "Notification",
      headers: { "Content-Type": "multipart/report; report-type=delivery-status" },
    });
    assert.equal(v.kind, "BOUNCE");
  });

  test("une absence du bureau est reconnue", () => {
    const v = detecterCourrierSysteme({
      fromEmail: "marie@boulangerie.fr",
      subject: "Réponse automatique : absence du bureau",
    });
    assert.equal(v.kind, "AUTO_REPLY");
  });

  test("l'en-tête Auto-Submitted est décisif, quel que soit le sujet", () => {
    const v = detecterCourrierSysteme({
      fromEmail: "marie@boulangerie.fr",
      subject: "Re: votre message",
      headers: { "Auto-Submitted": "auto-replied" },
    });
    assert.equal(v.kind, "AUTO_REPLY");
  });

  test("une liste de diffusion n'est pas une réponse", () => {
    const v = detecterCourrierSysteme({
      fromEmail: "news@plateforme.fr",
      subject: "Nouveautés du mois",
      headers: { "List-Id": "<news.plateforme.fr>" },
    });
    assert.equal(v.kind, "SYSTEM");
  });

  test("une adresse no-reply est un message de service", () => {
    assert.equal(
      detecterCourrierSysteme({ fromEmail: "noreply@plateforme.fr", subject: "Confirmation" }).kind,
      "SYSTEM",
    );
    assert.equal(
      detecterCourrierSysteme({ fromEmail: "ne-pas-repondre@banque.fr", subject: "Relevé" }).kind,
      "SYSTEM",
    );
  });

  test("UNE VRAIE RÉPONSE N'EST PAS PRISE POUR DU SYSTÈME", () => {
    // Le risque symétrique, et il est pire : écarter une vraie réponse.
    for (const cas of [
      { fromEmail: "marie@boulangerie-dupont.fr", subject: "Re: votre message" },
      { fromEmail: "contact@garage-martin.fr", subject: "Intéressé par votre proposition" },
      { fromEmail: "j.durand@cabinet.fr", subject: "Quel est votre tarif ?" },
    ]) {
      const v = detecterCourrierSysteme(cas);
      assert.equal(v.isSystem, false, `${cas.fromEmail} écarté à tort : ${v.reason}`);
    }
  });

  test("le mot « rapport » dans un sujet ordinaire ne suffit pas", () => {
    const v = detecterCourrierSysteme({
      fromEmail: "marie@boulangerie.fr",
      subject: "Merci pour votre rapport d'audit",
    });
    assert.equal(v.isSystem, false);
  });
});

describe("À l'ingestion : ce qui compte comme réponse", () => {
  test("UN RAPPORT DMARC N'EST PAS UNE RÉPONSE DE PROSPECT", async () => {
    const r = await ingestReply({
      fromEmail: "noreply-dmarc-support@google.com",
      subject: "Report domain: amyn.agency Submitter: google.com Report-ID: 987",
      body: "Ceci est un rapport agrégé au format XML.",
      source: "IMAP",
      messageId: "<dmarc-1@google.com>",
    });

    assert.equal(r.stored, true, "le message doit rester enregistré");
    assert.equal(r.isSystem, true);
    assert.equal(r.systemKind, "DMARC_REPORT");
    assert.equal(r.isProspectReply, false);
    assert.equal(r.reviewStatus, "SYSTEM");
    assert.notEqual(r.reviewStatus, "ACTION_REQUIRED");
  });

  test("UN EXPÉDITEUR INCONNU N'EST PAS UNE RÉPONSE COMMERCIALE", async () => {
    const r = await ingestReply({
      fromEmail: "mrfitman99@gmail.com",
      subject: "Bonjour",
      body: "Je suis intéressé par vos services, pouvez-vous me rappeler ?",
      source: "IMAP",
      messageId: "<inconnu-1@gmail.com>",
    });

    assert.equal(r.stored, true, "le message doit rester enregistré");
    assert.equal(r.isSystem, false, "ce n'est pas un courrier système, juste un inconnu");
    assert.equal(r.prospectId, null);
    assert.equal(r.matchedBy, "NONE");
    assert.equal(r.isProspectReply, false);
    assert.equal(r.reviewStatus, "UNMATCHED");
    assert.notEqual(
      r.reviewStatus,
      "ACTION_REQUIRED",
      "un inconnu ne doit pas remonter en tête du centre de tri",
    );
  });

  test("une réponse rattachée à un prospect remonte bien en Action requise", async () => {
    // Le contrôle symétrique : le filtre ne doit pas étouffer les vraies
    // réponses.
    const p = await seedProspect({ email: "marie@boulangerie-dupont.fr" });
    assert.ok(p.id);

    const r = await ingestReply({
      fromEmail: "marie@boulangerie-dupont.fr",
      subject: "Re: votre message",
      body: "Bonjour, votre proposition m'intéresse. Quel est le tarif ?",
      source: "IMAP",
      messageId: "<vraie-1@boulangerie-dupont.fr>",
    });

    assert.equal(r.isProspectReply, true);
    assert.equal(r.matchedBy, "CONTACT");
    assert.equal(r.reviewStatus, "ACTION_REQUIRED");
  });

  test("un rattachement par envoi effectué suffit", async () => {
    const p = await seedProspect({ email: null });
    await prisma.sendLog.create({
      data: {
        prospectId: p.id, transport: "smtp", status: "SENT", dryRun: false,
        toEmail: "patron@garage.fr", subject: "Votre site",
      },
    });

    const r = await ingestReply({
      fromEmail: "patron@garage.fr",
      subject: "Re: Votre site",
      body: "Intéressé, rappelez-moi.",
      source: "IMAP",
      messageId: "<via-envoi@garage.fr>",
    });

    assert.equal(r.matchedBy, "SEND_LOG");
    assert.equal(r.isProspectReply, true);
    assert.equal(r.reviewStatus, "ACTION_REQUIRED");
  });

  test("UNE OPPOSITION RESTE PRIORITAIRE, même dans un message automatique", async () => {
    // La protection du destinataire ne cède devant aucun filtre.
    const r = await ingestReply({
      fromEmail: "noreply@boulangerie.fr",
      subject: "Réponse automatique",
      body: "STOP, ne me contactez plus.",
      source: "IMAP",
      messageId: "<optout-auto@boulangerie.fr>",
    });

    assert.equal(r.classification, "OPT_OUT");
    assert.equal(r.optedOut, true);
    const oppose = await prisma.suppression.findFirst({
      where: { email: "noreply@boulangerie.fr" },
    });
    assert.ok(oppose, "l'opposition n'a pas été enregistrée");
  });

  test("un rebond reste un rebond : il bloque l'adresse", async () => {
    const r = await ingestReply({
      fromEmail: "MAILER-DAEMON@ssl0.ovh.net",
      subject: "Undelivered Mail Returned to Sender",
      body: "550 5.1.1 user unknown",
      source: "IMAP",
      messageId: "<bounce-1@ovh.net>",
    });

    assert.equal(r.classification, "BOUNCE");
    assert.equal(r.isSystem, true);
    assert.equal(r.systemKind, "BOUNCE");
  });

  test("un courrier automatique n'arrête pas une séquence de relance", async () => {
    const p = await seedProspect({ email: "marie@boulangerie-dupont.fr", status: "CONTACTED" });
    const campagne = await prisma.campaign.create({
      data: { name: "Test", slug: `test-${Date.now()}`, fromEmail: "contact@amyn.agency", fromName: "AMYN" },
    });
    await prisma.campaignMember.create({
      data: { campaignId: campagne.id, prospectId: p.id, status: "SENT" },
    });

    await ingestReply({
      fromEmail: "marie@boulangerie-dupont.fr",
      subject: "Réponse automatique : absence du bureau",
      body: "Je suis absente jusqu'au 15.",
      source: "IMAP",
      messageId: "<absence@boulangerie-dupont.fr>",
      headers: { "Auto-Submitted": "auto-replied" },
    });

    const membre = await prisma.campaignMember.findFirstOrThrow({
      where: { campaignId: campagne.id, prospectId: p.id },
    });
    assert.notEqual(
      membre.status,
      "REPLIED",
      "une absence du bureau a été prise pour une réponse et a arrêté la séquence",
    );
  });

  test("un courrier système ne fait pas avancer le prospect", async () => {
    const p = await seedProspect({ email: "marie@boulangerie-dupont.fr", status: "CONTACTED" });

    await ingestReply({
      fromEmail: "marie@boulangerie-dupont.fr",
      subject: "Réponse automatique : congés annuels",
      body: "Absente.",
      source: "IMAP",
      messageId: "<conges@boulangerie-dupont.fr>",
    });

    const apres = await prisma.prospect.findUniqueOrThrow({ where: { id: p.id } });
    assert.equal(apres.status, "CONTACTED", "le statut a avancé sur un message automatique");
  });
});

describe("Requalification des messages déjà enregistrés", () => {
  test("les deux cas réels sont remis à leur place, sans être supprimés", async () => {
    await prisma.reply.create({
      data: {
        fromEmail: "noreply-dmarc-support@google.com",
        subject: "Report domain: amyn.agency Submitter: google.com",
        body: "rapport", classification: "UNKNOWN", matchedBy: "NONE",
        reviewStatus: "ACTION_REQUIRED", source: "IMAP", messageId: "<vieux-dmarc@google.com>",
      },
    });
    await prisma.reply.create({
      data: {
        fromEmail: "mrfitman99@gmail.com", subject: "Bonjour",
        body: "message", classification: "QUESTION", matchedBy: "NONE",
        reviewStatus: "ACTION_REQUIRED", source: "IMAP", messageId: "<vieux-inconnu@gmail.com>",
      },
    });

    const r = await reclasserReponses();
    assert.equal(r.systeme, 1);
    assert.equal(r.nonRattachees, 1);

    // AUCUN message supprimé.
    assert.equal(await prisma.reply.count(), 2, "un message a été supprimé");

    const dmarc = await prisma.reply.findFirstOrThrow({
      where: { messageId: "<vieux-dmarc@google.com>" },
    });
    assert.equal(dmarc.reviewStatus, "SYSTEM");
    assert.equal(dmarc.isSystem, true);

    const inconnu = await prisma.reply.findFirstOrThrow({
      where: { messageId: "<vieux-inconnu@gmail.com>" },
    });
    assert.equal(inconnu.reviewStatus, "UNMATCHED");
    assert.equal(inconnu.isSystem, false);

    assert.equal(
      await prisma.reply.count({ where: { reviewStatus: "ACTION_REQUIRED" } }),
      0,
      "du bruit subsiste en Action requise",
    );
  });

  test("une réponse légitime n'est pas déclassée", async () => {
    const p = await seedProspect({ email: "marie@boulangerie-dupont.fr" });
    await prisma.reply.create({
      data: {
        prospectId: p.id, fromEmail: "marie@boulangerie-dupont.fr",
        subject: "Re: votre message", body: "Intéressée",
        classification: "INTERESTED", matchedBy: "CONTACT",
        reviewStatus: "ACTION_REQUIRED", source: "IMAP", messageId: "<legitime@bd.fr>",
      },
    });

    await reclasserReponses();
    const apres = await prisma.reply.findFirstOrThrow({ where: { messageId: "<legitime@bd.fr>" } });
    assert.equal(apres.reviewStatus, "ACTION_REQUIRED", "une vraie réponse a été déclassée");
  });

  test("la simulation n'écrit rien", async () => {
    await prisma.reply.create({
      data: {
        fromEmail: "noreply-dmarc-support@google.com", subject: "Report domain: amyn.agency",
        body: "x", classification: "UNKNOWN", matchedBy: "NONE",
        reviewStatus: "ACTION_REQUIRED", source: "IMAP", messageId: "<sim@google.com>",
      },
    });

    const r = await reclasserReponses({ dryRun: true });
    assert.equal(r.systeme, 1, "la simulation doit tout de même rapporter ce qu'elle ferait");

    const inchange = await prisma.reply.findFirstOrThrow({ where: { messageId: "<sim@google.com>" } });
    assert.equal(inchange.reviewStatus, "ACTION_REQUIRED", "la simulation a écrit");
  });

  test("une opposition déjà enregistrée n'est pas touchée", async () => {
    await prisma.reply.create({
      data: {
        fromEmail: "stop@exemple.fr", subject: "STOP", body: "Désinscrivez-moi",
        classification: "OPT_OUT", matchedBy: "NONE",
        reviewStatus: "RESOLVED", source: "IMAP", messageId: "<opt@exemple.fr>",
      },
    });

    await reclasserReponses();
    const apres = await prisma.reply.findFirstOrThrow({ where: { messageId: "<opt@exemple.fr>" } });
    assert.equal(apres.reviewStatus, "RESOLVED");
  });
});
