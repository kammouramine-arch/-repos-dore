// ---------------------------------------------------------------------------
// COPIE DANS LE DOSSIER « ENVOYÉS »
//
// Le défaut que ces tests empêchent de revenir : un email réellement parti,
// accepté par le serveur, journalisé SENT — et introuvable dans la boîte.
// SMTP transmet, il ne range rien ; sans dépôt IMAP explicite, l'expéditeur
// n'a aucune trace de ce qu'il a envoyé.
//
// La règle la plus importante ici n'est pas « la copie doit réussir » mais
// « une copie ratée ne doit JAMAIS ressembler à un envoi raté » — sans quoi
// le message serait renvoyé.
//
// Aucun test ne se connecte à une boîte : la boîte est injectée.
// ---------------------------------------------------------------------------

import { test, describe, before, beforeEach } from "node:test";
import assert from "node:assert/strict";

import { prisma } from "@/lib/db";
import {
  choisirDossier, copierDansEnvoyes, NOMS_ENVOYES, type BoiteEnvoi,
} from "@/lib/mailer/sent-copy";
import { copierEnvoiDansDossier, reprendreCopiesManquantes } from "@/lib/campaign/send";
import { resetDatabase, seedProspect } from "./helpers";

/** Boîte en mémoire : enregistre ce qu'on lui dépose. */
function boiteSimulee(options: {
  dossiers?: Array<{ path: string; specialUse?: string }>;
  contenu?: Map<string, string[]>;
  echouerAuDepot?: boolean;
  echouerAListe?: boolean;
} = {}) {
  const dossiers = options.dossiers ?? [
    { path: "INBOX" },
    { path: "Envoyés", specialUse: "\\Sent" },
    { path: "Corbeille", specialUse: "\\Trash" },
  ];
  // dossier -> messageIds présents
  const contenu = options.contenu ?? new Map<string, string[]>();
  const depots: Array<{ folder: string; raw: Buffer; flags: string[] }> = [];
  let prochainUid = 100;

  const boite: BoiteEnvoi = {
    async list() {
      if (options.echouerAListe) throw new Error("connexion IMAP perdue");
      return dossiers;
    },
    async rechercherMessageId(folder, messageId) {
      const ids = contenu.get(folder) ?? [];
      return ids.includes(messageId) ? [42] : [];
    },
    async deposer(folder, raw, flags) {
      if (options.echouerAuDepot) throw new Error("quota de boîte dépassé");
      depots.push({ folder, raw, flags });
      // Le message déposé devient visible pour les recherches suivantes :
      // c'est ce qui rend le test d'idempotence réaliste.
      const id = /^Message-ID:\s*(.+)$/im.exec(raw.toString())?.[1]?.trim();
      if (id) contenu.set(folder, [...(contenu.get(folder) ?? []), id]);
      return prochainUid++;
    },
  };

  return { boite, depots, contenu };
}

const RAW = (messageId: string, corps = "Bonjour") =>
  Buffer.from(
    [
      "From: AMYN <contact@amyn.agency>",
      "To: contact@hairattitude.fr",
      "Subject: Un point sur votre site",
      `Message-ID: ${messageId}`,
      "Date: Sat, 29 Aug 2026 10:00:00 +0000",
      "MIME-Version: 1.0",
      "Content-Type: text/plain; charset=utf-8",
      "",
      corps,
      "",
    ].join("\r\n"),
    "utf-8",
  );

before(async () => { await resetDatabase(); });
beforeEach(async () => { await resetDatabase(); });

describe("Choix du dossier", () => {
  test("l'usage déclaré par le serveur prime sur le nom", () => {
    const choisi = choisirDossier([
      { path: "INBOX" },
      { path: "Boîte d'envoi perso", specialUse: "\\Sent" },
      { path: "Sent" },
    ]);
    assert.equal(choisi, "Boîte d'envoi perso", "le nom a primé sur l'usage déclaré");
  });

  test("à défaut d'usage déclaré, les noms usuels sont reconnus", () => {
    assert.equal(choisirDossier([{ path: "INBOX" }, { path: "Envoyés" }]), "Envoyés");
    assert.equal(choisirDossier([{ path: "INBOX" }, { path: "Sent" }]), "Sent");
    assert.equal(choisirDossier([{ path: "INBOX.Sent" }]), "INBOX.Sent");
  });

  test("aucun dossier d'envoi : on le dit, on ne devine pas", () => {
    assert.equal(choisirDossier([{ path: "INBOX" }, { path: "Brouillons" }]), null);
  });

  test("la liste des noms usuels couvre le français et l'anglais", () => {
    assert.ok(NOMS_ENVOYES.includes("Envoyés"));
    assert.ok(NOMS_ENVOYES.includes("Sent"));
  });
});

describe("Dépôt de la copie", () => {
  test("le message est déposé dans le dossier d'envoi", async () => {
    const { boite, depots } = boiteSimulee();
    const r = await copierDansEnvoyes(
      { raw: RAW("<a@amyn.agency>"), messageId: "<a@amyn.agency>" },
      boite,
    );

    assert.equal(r.status, "COPIED");
    assert.equal(r.folder, "Envoyés");
    assert.equal(depots.length, 1);
  });

  test("LES OCTETS DÉPOSÉS SONT EXACTEMENT CEUX ENVOYÉS", async () => {
    const raw = RAW("<exact@amyn.agency>", "Corps précis, accentué : à ç é.");
    const { boite, depots } = boiteSimulee();
    await copierDansEnvoyes({ raw, messageId: "<exact@amyn.agency>" }, boite);

    assert.deepEqual(depots[0].raw, raw, "la copie diffère du message envoyé");
  });

  test("le message est marqué comme lu : on n'a pas à lire ce qu'on a écrit", async () => {
    const { boite, depots } = boiteSimulee();
    await copierDansEnvoyes({ raw: RAW("<b@amyn.agency>"), messageId: "<b@amyn.agency>" }, boite);
    assert.ok(depots[0].flags.includes("\\Seen"));
  });

  test("un dossier imposé par configuration est respecté", async () => {
    const { boite, depots } = boiteSimulee();
    await copierDansEnvoyes(
      { raw: RAW("<c@amyn.agency>"), messageId: "<c@amyn.agency>", folder: "INBOX.Sent" },
      boite,
    );
    assert.equal(depots[0].folder, "INBOX.Sent");
  });
});

describe("Anti-doublon", () => {
  test("UN MESSAGE DÉJÀ PRÉSENT N'EST PAS DÉPOSÉ UNE SECONDE FOIS", async () => {
    const contenu = new Map([["Envoyés", ["<deja@amyn.agency>"]]]);
    const { boite, depots } = boiteSimulee({ contenu });

    const r = await copierDansEnvoyes(
      { raw: RAW("<deja@amyn.agency>"), messageId: "<deja@amyn.agency>" },
      boite,
    );

    assert.equal(r.status, "ALREADY_PRESENT");
    assert.equal(depots.length, 0, "une seconde copie a été déposée");
  });

  test("deux appels successifs ne produisent qu'une copie", async () => {
    const { boite, depots } = boiteSimulee();
    const entree = { raw: RAW("<idem@amyn.agency>"), messageId: "<idem@amyn.agency>" };

    const a = await copierDansEnvoyes(entree, boite);
    const b = await copierDansEnvoyes(entree, boite);

    assert.equal(a.status, "COPIED");
    assert.equal(b.status, "ALREADY_PRESENT");
    assert.equal(depots.length, 1);
  });

  test("c'est le SERVEUR qui arbitre, pas notre base", async () => {
    // Une base restaurée ne connaît pas la copie : le serveur doit tout de
    // même empêcher le doublon.
    const contenu = new Map([["Envoyés", ["<serveur@amyn.agency>"]]]);
    const { boite, depots } = boiteSimulee({ contenu });
    await copierDansEnvoyes(
      { raw: RAW("<serveur@amyn.agency>"), messageId: "<serveur@amyn.agency>" },
      boite,
    );
    assert.equal(depots.length, 0);
  });
});

describe("Un échec de copie n'est pas un échec d'envoi", () => {
  test("un dépôt impossible est signalé sans lever d'exception", async () => {
    const { boite } = boiteSimulee({ echouerAuDepot: true });
    const r = await copierDansEnvoyes(
      { raw: RAW("<e@amyn.agency>"), messageId: "<e@amyn.agency>" },
      boite,
    );
    assert.equal(r.status, "FAILED");
    assert.match(r.detail, /L'email est bien parti/);
  });

  test("une boîte injoignable est signalée sans lever d'exception", async () => {
    const { boite } = boiteSimulee({ echouerAListe: true });
    const r = await copierDansEnvoyes(
      { raw: RAW("<f@amyn.agency>"), messageId: "<f@amyn.agency>" },
      boite,
    );
    assert.equal(r.status, "FAILED");
  });

  test("aucun dossier d'envoi : échec explicite, avec le remède", async () => {
    const { boite } = boiteSimulee({ dossiers: [{ path: "INBOX" }] });
    const r = await copierDansEnvoyes(
      { raw: RAW("<g@amyn.agency>"), messageId: "<g@amyn.agency>" },
      boite,
    );
    assert.equal(r.status, "FAILED");
    assert.match(r.detail, /IMAP_SENT_FOLDER/);
  });
});

describe("Le message composé est celui qui part", () => {
  test("le Message-ID est fixé AVANT l'envoi, donc connu", async () => {
    // Sans identifiant connu d'avance, impossible de vérifier si le message
    // se trouve déjà dans « Envoyés » — donc impossible de garantir l'absence
    // de doublon. C'est toute la raison de composer nous-mêmes.
    const { composerMessage } = await import("@/lib/mailer/smtp-mailer");

    const messageId = "<fixe-avant-envoi@amyn.agency>";
    const raw = await composerMessage(
      { to: "contact@exemple.fr", subject: "Objet", text: "Corps" },
      { messageId, date: new Date("2026-08-29T10:00:00Z") },
    );

    const texte = raw.toString();
    assert.ok(texte.includes(messageId), "le Message-ID fixé n'est pas dans le message");
    assert.match(texte, /^Date:/m, "le message doit porter une date");
  });

  test("la composition est déterministe : deux appels donnent les mêmes octets", async () => {
    // C'est ce qui garantit que la copie déposée est identique à l'envoi.
    const { composerMessage } = await import("@/lib/mailer/smtp-mailer");
    const args = [
      { to: "c@exemple.fr", subject: "Objet accentué : à ç é", text: "Corps" },
      { messageId: "<stable@amyn.agency>", date: new Date("2026-08-29T10:00:00Z") },
    ] as const;

    const a = await composerMessage(...args);
    const b = await composerMessage(...args);
    assert.deepEqual(a, b, "la composition varie d'un appel à l'autre");
  });

  test("le moyen d'opposition en un clic est présent dans les en-têtes", async () => {
    const { composerMessage } = await import("@/lib/mailer/smtp-mailer");
    const raw = await composerMessage(
      { to: "c@exemple.fr", subject: "Objet", text: "Corps" },
      { messageId: "<u@amyn.agency>" },
    );
    assert.match(raw.toString(), /List-Unsubscribe:/);
  });
});

describe("Consignation sur le journal d'envoi", () => {
  async function envoiEnregistre(messageId: string, options: { copie?: string } = {}) {
    const p = await seedProspect({ email: "contact@hairattitude.fr" });
    return prisma.sendLog.create({
      data: {
        prospectId: p.id,
        transport: "smtp",
        status: "SENT",
        dryRun: false,
        toEmail: "contact@hairattitude.fr",
        subject: "Un point sur votre site",
        messageId,
        rawMessage: RAW(messageId).toString("utf-8"),
        sentCopyStatus: options.copie ?? "NOT_ATTEMPTED",
      },
    });
  }

  test("le résultat de la copie est écrit sur le journal", async () => {
    const log = await envoiEnregistre("<h@amyn.agency>");
    const { boite } = boiteSimulee();

    await copierEnvoiDansDossier({
      sendLogId: log.id, raw: RAW("<h@amyn.agency>"), messageId: "<h@amyn.agency>", boite,
    });

    const apres = await prisma.sendLog.findUniqueOrThrow({ where: { id: log.id } });
    assert.equal(apres.sentCopyStatus, "COPIED");
    assert.equal(apres.sentCopyFolder, "Envoyés");
    assert.ok(apres.sentCopyUid);
    assert.ok(apres.sentCopyAt);
  });

  test("un envoi déjà copié n'est pas retenté", async () => {
    const log = await envoiEnregistre("<i@amyn.agency>", { copie: "COPIED" });
    const { boite, depots } = boiteSimulee();

    const r = await copierEnvoiDansDossier({
      sendLogId: log.id, raw: RAW("<i@amyn.agency>"), messageId: "<i@amyn.agency>", boite,
    });

    assert.equal(r.status, "COPIED");
    assert.equal(depots.length, 0, "une copie a été retentée alors qu'elle était faite");
  });

  test("L'ÉCHEC DE COPIE NE TOUCHE PAS AU STATUT D'ENVOI", async () => {
    const log = await envoiEnregistre("<j@amyn.agency>");
    const { boite } = boiteSimulee({ echouerAuDepot: true });

    await copierEnvoiDansDossier({
      sendLogId: log.id, raw: RAW("<j@amyn.agency>"), messageId: "<j@amyn.agency>", boite,
    });

    const apres = await prisma.sendLog.findUniqueOrThrow({ where: { id: log.id } });
    assert.equal(apres.status, "SENT", "un échec de copie a dégradé le statut d'envoi");
    assert.equal(apres.sentCopyStatus, "FAILED");
    assert.ok(apres.sentCopyError);
  });
});

describe("Reprise des copies manquantes", () => {
  async function envoiSansCopie(messageId: string, email: string) {
    const p = await seedProspect({ email });
    return prisma.sendLog.create({
      data: {
        prospectId: p.id, transport: "smtp", status: "SENT", dryRun: false,
        toEmail: email, subject: "Objet", messageId,
        rawMessage: RAW(messageId).toString("utf-8"),
        sentCopyStatus: "NOT_ATTEMPTED",
      },
    });
  }

  test("les copies manquantes sont déposées, sans réexpédier", async () => {
    await envoiSansCopie("<k1@amyn.agency>", "a@exemple.fr");
    await envoiSansCopie("<k2@amyn.agency>", "b@exemple.fr");
    const { boite, depots } = boiteSimulee();

    const r = await reprendreCopiesManquantes({ boite });
    assert.equal(r.traites, 2);
    assert.equal(r.copies, 2);
    assert.equal(depots.length, 2);

    // Aucun envoi supplémentaire n'a été créé : rien n'a été réexpédié.
    assert.equal(await prisma.sendLog.count(), 2);
  });

  test("une seconde reprise ne redépose rien", async () => {
    await envoiSansCopie("<l@amyn.agency>", "c@exemple.fr");
    const { boite, depots } = boiteSimulee();

    await reprendreCopiesManquantes({ boite });
    const seconde = await reprendreCopiesManquantes({ boite });

    assert.equal(seconde.traites, 0, "une copie déjà faite a été reprise");
    assert.equal(depots.length, 1);
  });

  test("UN ENVOI SANS MESSAGE CONSERVÉ N'EST PAS REPRIS", async () => {
    // C'est le cas de l'email déjà parti avant cette correction : sans les
    // octets d'origine, une « copie » serait une reconstruction. On s'abstient.
    const p = await seedProspect({ email: "contact@hairattitude.fr" });
    await prisma.sendLog.create({
      data: {
        prospectId: p.id, transport: "smtp", status: "SENT", dryRun: false,
        toEmail: "contact@hairattitude.fr", subject: "Un point sur votre site",
        messageId: null, rawMessage: null, sentCopyStatus: "NOT_ATTEMPTED",
      },
    });

    const { boite, depots } = boiteSimulee();
    const r = await reprendreCopiesManquantes({ boite });

    assert.equal(r.traites, 0, "un envoi sans octets conservés a été reconstruit");
    assert.equal(depots.length, 0);
  });

  test("les simulations ne sont jamais copiées dans la boîte", async () => {
    const p = await seedProspect({ email: "d@exemple.fr" });
    await prisma.sendLog.create({
      data: {
        prospectId: p.id, transport: "dry-run", status: "SIMULATED", dryRun: true,
        toEmail: "d@exemple.fr", subject: "Simulé", messageId: "<sim@amyn.agency>",
        rawMessage: RAW("<sim@amyn.agency>").toString("utf-8"),
        sentCopyStatus: "NOT_ATTEMPTED",
      },
    });

    const { boite, depots } = boiteSimulee();
    const r = await reprendreCopiesManquantes({ boite });
    assert.equal(r.traites, 0, "une simulation a été déposée dans la boîte réelle");
    assert.equal(depots.length, 0);
  });
});
