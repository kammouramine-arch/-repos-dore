// LECTURE DES REPONSES — classification, opt-out prioritaire, rattachement,
// deduplication, et absence totale d'envoi automatique.
import { test, describe, beforeEach, after } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { join, resolve } from "node:path";

import { prisma } from "@/lib/db";
import { classifyReply } from "@/lib/replies/classify";
import { matchProspect } from "@/lib/replies/match";
import { ingestReply } from "@/lib/replies/ingest";
import { syncReplies, replyInbox } from "@/lib/replies/sync";
import { stripQuotedReply, looksAutomatic } from "@/lib/imap/parse";
import { readImapConfig, imapStatus } from "@/lib/imap/config";
import { RECOMMENDED_ACTION, REPLY_CLASSES, REVIEW_STATUSES } from "@/lib/constants";
import { resetDatabase, seedProspect } from "./helpers";
import { FakeMailbox, QUOTED_ORIGINAL, type FakeMessage } from "./fake-mailbox";

const ROOT = resolve(import.meta.dirname, "..");

// --- CLASSIFICATION ---------------------------------------------------------

describe("Classification des réponses entrantes", () => {
  test("email positif → catégorie favorable et action de rappel", () => {
    const r = classifyReply({
      subject: "Re: votre message",
      body: "Bonjour, ça m'intéresse beaucoup, on peut en parler cette semaine ?",
    });
    assert.ok(["INTERESTED", "MEETING_REQUEST", "PRICE_REQUEST"].includes(r.classification), r.classification);
    assert.ok(RECOMMENDED_ACTION[r.classification].length > 5);
  });

  test("email négatif → NOT_INTERESTED, action « arrêter la séquence »", () => {
    const r = classifyReply({ subject: "Re:", body: "Non merci, cela ne nous intéresse pas." });
    assert.equal(r.classification, "NOT_INTERESTED");
    assert.match(RECOMMENDED_ACTION[r.classification], /arrêter la séquence/i);
  });

  test("question → QUESTION ou demande de prix, action « préparer une réponse »", () => {
    const r = classifyReply({ subject: "Re:", body: "Pouvez-vous me préciser ce que vous entendez par là ?" });
    assert.ok(["QUESTION", "PRICE_REQUEST"].includes(r.classification), r.classification);
  });

  test("réponse ambiguë → NEEDS_HUMAN, jamais une invention", () => {
    // Signaux favorables ET défavorables, aucun ne l'emporte : on ne tranche pas.
    const r = classifyReply({
      subject: "Re:",
      body: "C'est très intéressant et bien vu, mais non merci.",
    });
    assert.equal(r.classification, "NEEDS_HUMAN");
    assert.equal(r.confidence, "LOW");
    assert.match(r.reason, /humain/i);
  });

  test("un refus poli reste un refus, pas une ambiguïté", () => {
    // « merci » est une formule de politesse, pas un signe favorable.
    const r = classifyReply({ subject: "Re:", body: "Merci beaucoup, mais non merci." });
    assert.equal(r.classification, "NOT_INTERESTED");
  });

  test("message incompréhensible → UNKNOWN, jamais INTERESTED", () => {
    const r = classifyReply({ subject: "", body: "qsdf lkjh 12345" });
    assert.equal(r.classification, "UNKNOWN");
    assert.equal(r.matchedSignals.length, 0);
  });

  test("toute classe produite appartient au catalogue", () => {
    const bodies = [
      "ça m'intéresse", "non merci", "stop", "quel prix ?", "merci beaucoup",
      "désolé pas le temps", "mise en demeure de mon avocat", "azerty",
      "550 5.1.1 User unknown", "rappelez-moi en septembre",
    ];
    for (const body of bodies) {
      const r = classifyReply({ subject: "Re:", body });
      assert.ok((REPLY_CLASSES as readonly string[]).includes(r.classification), r.classification);
    }
  });
});

// --- OPT-OUT : PRIORITE ABSOLUE ---------------------------------------------

describe("Opt-out prioritaire", () => {
  test("toutes les formulations exigées sont reconnues", () => {
    const phrases = [
      "désinscrivez-moi", "Désinscrivez moi de votre liste", "ne me contactez plus",
      "STOP", "stop", "remove me", "Remove me from your list", "unsubscribe",
      "please unsubscribe me", "je m'oppose à ce traitement", "désabonnez-moi",
      "arrêtez de m'écrire", "do not contact me",
    ];
    for (const body of phrases) {
      const r = classifyReply({ subject: "Re:", body });
      assert.equal(r.classification, "OPT_OUT", `« ${body} » n'a pas été reconnu comme opposition`);
      assert.equal(r.confidence, "HIGH");
    }
  });

  test("l'opposition l'emporte sur un contenu par ailleurs positif", () => {
    const r = classifyReply({
      subject: "Re:",
      body: "Merci beaucoup, c'est très intéressant, mais désinscrivez-moi de votre liste.",
    });
    assert.equal(r.classification, "OPT_OUT");
    assert.match(r.reason, /prioritaire/i);
  });

  test("l'opposition l'emporte même sur une demande de rendez-vous", () => {
    const r = classifyReply({
      subject: "Re:",
      body: "On peut se voir mardi ? Non en fait, ne me contactez plus.",
    });
    assert.equal(r.classification, "OPT_OUT");
  });
});

// --- NETTOYAGE DES CITATIONS ------------------------------------------------

describe("Nettoyage du message cité", () => {
  test("notre propre « Répondez STOP » n'est jamais pris pour une opposition", () => {
    const raw = `Bonjour,\n\nMerci, ça m'intéresse.${QUOTED_ORIGINAL}`;
    const clean = stripQuotedReply(raw);

    assert.ok(!/STOP/i.test(clean), "la citation de notre email n'a pas été retirée");
    const r = classifyReply({ subject: "Re: votre message", body: clean });
    assert.notEqual(r.classification, "OPT_OUT", "notre propre pied de page a été lu comme une opposition");
  });

  test("les lignes citées avec « > » sont retirées", () => {
    const clean = stripQuotedReply("Ma réponse.\n> votre texte d'origine\n> deuxième ligne");
    assert.equal(clean, "Ma réponse.");
  });

  test("une réponse automatique est détectée", () => {
    assert.equal(looksAutomatic({ subject: "Réponse automatique : absence du bureau" }), true);
    assert.equal(
      looksAutomatic({ subject: "Re: votre message", headers: { "auto-submitted": "auto-replied" } }),
      true,
    );
    assert.equal(looksAutomatic({ subject: "Re: votre message" }), false);
  });
});

// --- RATTACHEMENT AU CRM ----------------------------------------------------

describe("Rattachement au prospect", () => {
  beforeEach(async () => { await resetDatabase(); });
  after(async () => { await prisma.$disconnect(); });

  test("une adresse enregistrée dans une fiche est rattachée", async () => {
    const prospect = await seedProspect({ email: "contact@salon-connu.fr" });
    const match = await matchProspect("contact@salon-connu.fr");
    assert.equal(match.prospectId, prospect.id);
    assert.equal(match.matchedBy, "CONTACT");
  });

  test("une adresse à laquelle on a écrit est rattachée", async () => {
    const prospect = await seedProspect({ email: null });
    await prisma.sendLog.create({
      data: {
        prospectId: prospect.id, transport: "dry-run", status: "SIMULATED",
        dryRun: true, toEmail: "gerant@salon-ecrit.fr", subject: "Un point sur votre site",
      },
    });
    const match = await matchProspect("gerant@salon-ecrit.fr");
    assert.equal(match.prospectId, prospect.id);
    assert.equal(match.matchedBy, "SEND_LOG");
  });

  test("un expéditeur inconnu n'est rattaché à personne", async () => {
    await seedProspect({ email: "contact@salon-connu.fr" });
    const match = await matchProspect("quelqun@parfaitement-inconnu.fr");
    assert.equal(match.prospectId, null);
    assert.equal(match.matchedBy, "NONE");
    assert.match(match.reason, /aucune trace/i);
  });

  test("une adresse Gmail ne rattache jamais par domaine", async () => {
    await prisma.prospect.create({
      data: { name: "Salon Gmail", sector: "coiffeur", city: "Lille", website: "https://gmail.com/x" },
    });
    const match = await matchProspect("inconnu@gmail.com");
    assert.equal(match.prospectId, null);
  });

  test("un domaine partagé par deux prospects est refusé plutôt que deviné", async () => {
    for (const n of ["A", "B"]) {
      await prisma.prospect.create({
        data: { name: `Salon ${n}`, sector: "coiffeur", city: "Lille", website: "https://groupe-partage.fr" },
      });
    }
    const match = await matchProspect("contact@groupe-partage.fr");
    assert.equal(match.prospectId, null);
    assert.match(match.reason, /plusieurs prospects/i);
  });
});

// --- INGESTION --------------------------------------------------------------

describe("Ingestion d'une réponse", () => {
  beforeEach(async () => { await resetDatabase(); });

  test("une opposition est mise en liste noire immédiatement", async () => {
    const prospect = await seedProspect({ email: "contact@stop-imap.fr" });
    const outcome = await ingestReply({
      fromEmail: "contact@stop-imap.fr",
      subject: "Re:",
      body: "Désinscrivez-moi, ne me recontactez plus.",
      messageId: "<optout-1@test.invalid>",
      source: "IMAP",
    });

    assert.equal(outcome.classification, "OPT_OUT");
    assert.equal(outcome.optedOut, true);

    const suppression = await prisma.suppression.findUnique({ where: { email: "contact@stop-imap.fr" } });
    assert.ok(suppression, "l'adresse n'a pas été ajoutée à la liste d'opposition");
    assert.equal(suppression!.reason, "UNSUBSCRIBED");

    const after = await prisma.prospect.findUniqueOrThrow({ where: { id: prospect.id } });
    assert.equal(after.status, "OPTOUT");
  });

  test("une opposition d'un expéditeur inconnu est quand même blacklistée", async () => {
    const outcome = await ingestReply({
      fromEmail: "inconnu@ailleurs.fr",
      subject: "Re:",
      body: "unsubscribe",
      messageId: "<optout-2@test.invalid>",
      source: "IMAP",
    });

    assert.equal(outcome.prospectId, null, "aucun prospect ne devait être rattaché");
    assert.equal(outcome.optedOut, true, "la protection ne doit pas dépendre du rattachement");
    assert.ok(await prisma.suppression.findUnique({ where: { email: "inconnu@ailleurs.fr" } }));
  });

  test("un email d'un inconnu est conservé sans prospect plutôt que perdu", async () => {
    const outcome = await ingestReply({
      fromEmail: "curieux@nulle-part.fr",
      subject: "Bonjour",
      body: "Bonjour, qui êtes-vous ?",
      messageId: "<inconnu-1@test.invalid>",
      source: "IMAP",
    });

    assert.equal(outcome.stored, true);
    assert.equal(outcome.prospectId, null);
    assert.equal(outcome.matchedBy, "NONE");

    const reply = await prisma.reply.findUniqueOrThrow({ where: { messageId: "<inconnu-1@test.invalid>" } });
    assert.equal(reply.prospectId, null);
  });

  test("le même Message-ID n'est jamais traité deux fois", async () => {
    await seedProspect({ email: "contact@doublon-imap.fr" });
    const input = {
      fromEmail: "contact@doublon-imap.fr",
      subject: "Re:",
      body: "Quel est votre tarif ?",
      messageId: "<doublon@test.invalid>",
      source: "IMAP" as const,
    };

    const first = await ingestReply(input);
    const second = await ingestReply(input);

    assert.equal(first.duplicate, false);
    assert.equal(second.duplicate, true);
    assert.equal(second.stored, false);
    assert.equal(await prisma.reply.count(), 1, "un doublon a été créé");
  });

  test("le CRM est mis à jour : statut, dernière réponse, action, historique", async () => {
    const prospect = await seedProspect({ email: "contact@interesse.fr", status: "CONTACTED" });
    const received = new Date("2026-08-18T09:00:00Z");

    await ingestReply({
      fromEmail: "contact@interesse.fr",
      subject: "Re: votre message",
      body: "Bonjour, ça m'intéresse, on peut en parler ?",
      receivedAt: received,
      messageId: "<crm-1@test.invalid>",
      source: "IMAP",
    });

    const after = await prisma.prospect.findUniqueOrThrow({ where: { id: prospect.id } });
    assert.ok(["INTERESTED", "MEETING"].includes(after.status), after.status);
    assert.equal(after.lastInteractionAt?.toISOString(), received.toISOString());
    assert.ok(after.nextAction && after.nextAction.length > 5, "aucune action enregistrée");

    const events = await prisma.statusEvent.findMany({ where: { prospectId: prospect.id } });
    assert.ok(events.length > 0, "aucun historique de statut");

    const reply = await prisma.reply.findUniqueOrThrow({ where: { messageId: "<crm-1@test.invalid>" } });
    assert.equal(reply.reviewStatus, "ACTION_REQUIRED");
    assert.ok(reply.recommendedAction);
  });

  test("chaque réponse conserve texte, date, catégorie, confiance et prospect", async () => {
    const prospect = await seedProspect({ email: "contact@trace-imap.fr" });
    await ingestReply({
      fromEmail: "contact@trace-imap.fr",
      subject: "Re: proposition",
      body: "Quel est votre tarif ?",
      receivedAt: new Date("2026-08-18T11:30:00Z"),
      messageId: "<trace-1@test.invalid>",
      source: "IMAP",
    });

    const reply = await prisma.reply.findUniqueOrThrow({ where: { messageId: "<trace-1@test.invalid>" } });
    assert.equal(reply.body, "Quel est votre tarif ?");
    assert.equal(reply.receivedAt.toISOString(), "2026-08-18T11:30:00.000Z");
    assert.equal(reply.classification, "PRICE_REQUEST");
    assert.ok(reply.confidence);
    assert.equal(reply.prospectId, prospect.id);
    assert.ok(JSON.parse(reply.matchedSignals ?? "[]").length > 0);
  });

  test("une réponse automatique ne fait pas avancer le prospect", async () => {
    const prospect = await seedProspect({ email: "contact@absent.fr", status: "CONTACTED" });
    const outcome = await ingestReply({
      fromEmail: "contact@absent.fr",
      subject: "Réponse automatique : absence du bureau",
      body: "Je suis absent jusqu'au 30 août. Votre message m'intéresse, je reviens vers vous.",
      messageId: "<auto-1@test.invalid>",
      source: "IMAP",
      isAutoReply: true,
    });

    assert.equal(outcome.classification, "UNKNOWN");
    const after = await prisma.prospect.findUniqueOrThrow({ where: { id: prospect.id } });
    assert.notEqual(after.status, "INTERESTED");
  });

  test("une opposition en réponse automatique reste traitée comme une opposition", async () => {
    const outcome = await ingestReply({
      fromEmail: "contact@auto-stop.fr",
      subject: "Réponse automatique",
      body: "Cette adresse n'est plus utilisée. Désinscrivez-moi.",
      messageId: "<auto-2@test.invalid>",
      source: "IMAP",
      isAutoReply: true,
    });
    assert.equal(outcome.classification, "OPT_OUT");
    assert.equal(outcome.optedOut, true);
  });
});

// --- SYNCHRONISATION --------------------------------------------------------

describe("Synchronisation de la boîte", () => {
  beforeEach(async () => { await resetDatabase(); });

  const messages: FakeMessage[] = [
    { uid: 10, from: "contact@interesse-sync.fr", subject: "Re: votre message", body: `Bonjour, ça m'intéresse !${QUOTED_ORIGINAL}` },
    { uid: 11, from: "contact@refus-sync.fr", subject: "Re:", body: "Non merci." },
    { uid: 12, from: "contact@stop-sync.fr", subject: "Re:", body: "Désinscrivez-moi." },
    { uid: 13, from: "inconnu@nulle-part.fr", subject: "Bonjour", body: "Qui êtes-vous ?" },
    { uid: 14, from: "contact@ambigu-sync.fr", subject: "Re:", body: "C'est très intéressant et bien vu, mais non merci." },
  ];

  test("lit tous les messages, les classe et rend des chiffres exacts", async () => {
    await seedProspect({ name: "Salon Intéressé", email: "contact@interesse-sync.fr" });
    await seedProspect({ name: "Salon Refus", email: "contact@refus-sync.fr" });
    await seedProspect({ name: "Salon Stop", email: "contact@stop-sync.fr" });
    await seedProspect({ name: "Salon Ambigu", email: "contact@ambigu-sync.fr" });

    const mailbox = new FakeMailbox(messages);
    const report = await syncReplies(mailbox);

    assert.equal(report.error, undefined);
    assert.equal(report.fetched, 5);
    assert.equal(report.stored, 5);
    assert.equal(report.optOuts, 1);
    assert.equal(report.needsHuman, 1);
    assert.equal(report.unmatched, 1, "l'expéditeur inconnu doit être compté comme non rattaché");
    assert.ok(report.interested >= 1);
  });

  test("une seconde lecture ne retraite rien", async () => {
    await seedProspect({ email: "contact@interesse-sync.fr" });
    const mailbox = new FakeMailbox(messages);

    await syncReplies(mailbox);
    const second = await syncReplies(mailbox);

    assert.equal(second.fetched, 0, "les messages déjà lus ont été relus");
    assert.equal(second.stored, 0);
    assert.equal(await prisma.reply.count(), 5, "des doublons ont été créés");
  });

  test("l'avancement est mémorisé par dossier", async () => {
    const mailbox = new FakeMailbox(messages);
    await syncReplies(mailbox);

    const state = await prisma.imapSyncState.findUniqueOrThrow({ where: { folder: "INBOX" } });
    assert.equal(state.lastSeenUid, 14);
    assert.equal(state.uidValidity, "1000");
    assert.ok(state.lastRunAt);
    assert.equal(state.lastError, null);
  });

  test("un changement d'UIDVALIDITY relit tout sans créer de doublon", async () => {
    await syncReplies(new FakeMailbox(messages, { uidValidity: "1000" }));
    const report = await syncReplies(new FakeMailbox(messages, { uidValidity: "2000" }));

    assert.equal(report.fetched, 5, "la boîte aurait dû être relue depuis le début");
    assert.equal(report.duplicates, 5, "les messages relus auraient dû être reconnus comme doublons");
    assert.equal(await prisma.reply.count(), 5);
  });

  test("nos propres envois présents dans la boîte sont ignorés", async () => {
    const mailbox = new FakeMailbox([
      { uid: 20, from: "contact@amyn.agency", subject: "Un point sur votre site", body: "Bonjour, ..." },
    ]);
    const report = await syncReplies(mailbox);
    assert.equal(report.stored, 0);
    assert.equal(report.skipped.length, 1);
  });

  test("une panne de la boîte est signalée sans faire tomber le système", async () => {
    const broken = new FakeMailbox([]);
    broken.fetch = async () => { throw new Error("ECONNREFUSED"); };

    const report = await syncReplies(broken);
    assert.ok(report.error);
    assert.equal(report.stored, 0);

    const state = await prisma.imapSyncState.findUniqueOrThrow({ where: { folder: "INBOX" } });
    assert.match(state.lastError ?? "", /ECONNREFUSED/);
  });

  test("le compteur du centre de tri reflète la réalité", async () => {
    await seedProspect({ email: "contact@interesse-sync.fr" });
    await syncReplies(new FakeMailbox(messages));

    const inbox = await replyInbox();
    assert.equal(inbox.total, 5);
    assert.equal(inbox.optOuts, 1);
    assert.equal(inbox.needsHuman, 1);
    assert.ok(inbox.lastSyncAt);
  });
});

// --- SECURITE ---------------------------------------------------------------

describe("Sécurité de la lecture", () => {
  beforeEach(async () => { await resetDatabase(); });

  test("une adresse blacklistée ne peut plus recevoir d'email", async () => {
    const { runComplianceChecks } = await import("@/lib/campaign/compliance");
    const { seedProvenIssue, seedDraft } = await import("./helpers");

    const prospect = await seedProspect({ email: "contact@blacklist-imap.fr", status: "READY_TO_SEND" });
    const issue = await seedProvenIssue(prospect.id);
    const draft = await seedDraft(prospect.id, { issueIds: [issue.id] });
    await prisma.emailDraft.update({ where: { id: draft.id }, data: { approvedAt: new Date() } });

    await ingestReply({
      fromEmail: "contact@blacklist-imap.fr",
      subject: "Re:",
      body: "STOP",
      messageId: "<bl-1@test.invalid>",
      source: "IMAP",
    });

    const report = await runComplianceChecks({ prospectId: prospect.id, draftId: draft.id, step: 0 });
    assert.equal(report.allowed, false, "un envoi reste possible après une opposition");
    assert.ok(report.blockedBy.includes("CHECK_OPT_OUT"));
  });

  test("la lecture n'envoie AUCUN email : les modules ne connaissent pas le mailer", async () => {
    for (const file of ["lib/replies/sync.ts", "lib/replies/ingest.ts", "lib/imap/client.ts"]) {
      const source = await readFile(join(ROOT, file), "utf8");
      assert.ok(!/from "@\/lib\/mailer/.test(source), `${file} importe le mailer`);
      assert.ok(!/sendMail|sendOne\(|runCampaign\(/.test(source), `${file} contient un appel d'envoi`);
    }
  });

  test("une lecture complète ne produit aucun envoi en base", async () => {
    await seedProspect({ email: "contact@interesse-sync.fr" });
    await syncReplies(
      new FakeMailbox([
        { uid: 30, from: "contact@interesse-sync.fr", subject: "Re:", body: "Ça m'intéresse !" },
      ]),
    );
    assert.equal(await prisma.sendLog.count(), 0, "un envoi a été enregistré pendant une lecture");
  });

  test("le client IMAP ouvre la boîte en lecture seule et ne supprime rien", async () => {
    const source = await readFile(join(ROOT, "lib/imap/client.ts"), "utf8");
    assert.ok(source.includes("readOnly: true"), "la boîte n'est pas ouverte en lecture seule");
    for (const forbidden of ["messageDelete", "messageMove", "messageFlagsAdd", "messageFlagsSet"]) {
      assert.ok(!source.includes(forbidden), `le client peut modifier la boîte : ${forbidden}`);
    }
  });

  test("le mot de passe IMAP n'est jamais exposé par l'état de configuration", () => {
    // On injecte une valeur reconnaissable et on verifie qu'elle n'apparait
    // nulle part dans l'etat expose a l'interface et au CLI.
    const secret = "MOT-DE-PASSE-TEMOIN-9f3a";
    const previous = process.env.IMAP_PASSWORD;
    process.env.IMAP_PASSWORD = secret;
    try {
      const status = imapStatus();
      const serialized = JSON.stringify(status);
      assert.ok(!serialized.includes(secret), "le mot de passe apparaît dans l'état exposé");
      assert.equal(status.passwordPresent, true, "la présence du mot de passe doit rester visible");
      // Le NOM de la variable peut apparaitre (c'est une aide de configuration),
      // mais jamais sa VALEUR.
    } finally {
      if (previous === undefined) delete process.env.IMAP_PASSWORD;
      else process.env.IMAP_PASSWORD = previous;
    }
  });

  test("le journal d'imapflow reste désactivé (il reproduirait le mot de passe)", async () => {
    const source = await readFile(join(ROOT, "lib/imap/client.ts"), "utf8");
    assert.match(source, /logger:\s*false/, "le journal IMAP n'est pas désactivé");
  });

  test("aucun secret IMAP n'est écrit en dur", async () => {
    for (const file of ["lib/imap/config.ts", "lib/imap/client.ts", ".env.example"]) {
      const source = await readFile(join(ROOT, file), "utf8");
      assert.ok(
        !/IMAP_PASSWORD\s*[:=]\s*["'][^"'\s]+["']/.test(source),
        `mot de passe IMAP en dur dans ${file}`,
      );
    }
  });

  test("la configuration manquante est signalée, pas devinée", () => {
    const { config, missing } = readImapConfig();
    if (!config) {
      assert.ok(missing.length > 0);
      assert.ok(missing.every((m) => m.startsWith("IMAP_")));
    }
  });
});

// --- CONTRAT ----------------------------------------------------------------

describe("Contrat du centre de tri", () => {
  test("chaque catégorie a une action recommandée explicite", () => {
    for (const cls of REPLY_CLASSES) {
      assert.ok(RECOMMENDED_ACTION[cls], `aucune action pour ${cls}`);
      assert.ok(RECOMMENDED_ACTION[cls].length > 3);
    }
  });

  test("les actions exigées correspondent aux catégories clés", () => {
    assert.match(RECOMMENDED_ACTION.INTERESTED, /appel/i);
    assert.match(RECOMMENDED_ACTION.QUESTION, /préparer une réponse/i);
    assert.match(RECOMMENDED_ACTION.NOT_INTERESTED, /arrêter la séquence/i);
    assert.match(RECOMMENDED_ACTION.OPT_OUT, /aucune action|blacklist/i);
    assert.match(RECOMMENDED_ACTION.NEEDS_HUMAN, /intervention humaine/i);
  });

  test("les quatre états de traitement existent", () => {
    assert.deepEqual([...REVIEW_STATUSES], ["NEW", "REVIEWED", "ACTION_REQUIRED", "RESOLVED"]);
  });

  test("les catégories exigées sont toutes présentes", () => {
    for (const required of [
      "INTERESTED", "NOT_INTERESTED", "OPT_OUT", "QUESTION",
      "POSITIVE", "NEGATIVE", "NEEDS_HUMAN", "UNKNOWN",
    ]) {
      assert.ok((REPLY_CLASSES as readonly string[]).includes(required), `catégorie manquante : ${required}`);
    }
  });
});
