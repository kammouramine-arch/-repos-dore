// ---------------------------------------------------------------------------
// LA CHAÎNE D'ENRICHISSEMENT ET LA FILE D'APPROBATION
//
// Ce que ces tests protègent : qu'un prospect ne saute aucune étape, qu'aucun
// job ne refasse ce qui est fait, et surtout que le dernier maillon s'arrête
// devant l'approbation humaine au lieu de la franchir.
//
// Aucun test ne sort sur le réseau : les cas choisis n'en ont pas besoin.
// ---------------------------------------------------------------------------

import { test, describe, before, beforeEach } from "node:test";
import assert from "node:assert/strict";

import { prisma } from "@/lib/db";
import {
  jobEnrichSites, jobAuditSites, jobFindEmails,
  jobQualifyProspects, jobPrepareEmails,
} from "@/lib/scheduler/jobs";
import { buildApprovalQueue, approvalQueueStatus } from "@/lib/campaign/queue";
import { addToSuppressionList } from "@/lib/campaign/compliance";
import { resetDatabase, seedProspect, seedProvenIssue, uid } from "./helpers";

/** Les verrous de job sont calés sur la minute : on simule le tour suivant. */
async function tourSuivant() {
  await prisma.jobRun.deleteMany();
}

/**
 * Un nom qui ne produit aucun candidat de domaine : la recherche de site
 * conclut « sans site » sans émettre la moindre requête.
 */
async function prospectSansCandidat(nom = "SA") {
  return prisma.prospect.create({
    data: { name: `${nom}`, sector: "Divers", city: "Lille", websiteStatus: "UNKNOWN" },
  });
}

before(async () => { await resetDatabase(); });
beforeEach(async () => { await resetDatabase(); });

describe("Recherche de site — le job", () => {
  test("ne traite que les prospects dont le site n'a jamais été cherché", async () => {
    await prospectSansCandidat("SA");
    await prisma.prospect.create({
      data: { name: uid("Deja"), sector: "x", city: "Lille", websiteStatus: "NOT_FOUND" },
    });

    const r = await jobEnrichSites({ limit: 10 });
    assert.equal(r.itemsSeen, 1, "un prospect déjà traité a été repris");
  });

  test("relancé, il ne refait rien : il n'y a plus personne à traiter", async () => {
    await prospectSansCandidat("SA");
    await jobEnrichSites({ limit: 10 });
    await tourSuivant();

    const second = await jobEnrichSites({ limit: 10 });
    assert.equal(second.itemsSeen, 0);
    assert.match(second.summary, /Aucun prospect/);
  });

  test("deux exécutions dans la même minute : la seconde est ignorée", async () => {
    await prospectSansCandidat("SA");
    const a = await jobEnrichSites({ limit: 10 });
    const b = await jobEnrichSites({ limit: 10 });
    assert.equal(a.skipped, false);
    assert.equal(b.skipped, true, "le verrou de job n'a pas tenu");
  });

  test("le lot est borné : le worker rend la main", async () => {
    for (let i = 0; i < 5; i += 1) await prospectSansCandidat("SA");
    const r = await jobEnrichSites({ limit: 2 });
    assert.equal(r.itemsSeen, 2);
  });

  test("UN PROSPECT QUI PLANTE NE BLOQUE PAS LA FILE", async () => {
    // Le job traite les plus anciens d'abord. Un prospect qui lève une
    // exception et garde son statut reviendrait à chaque tour, et rien
    // derrière lui n'avancerait jamais.
    const p = await prisma.prospect.create({
      data: { name: "Entreprise Piege", sector: "x", city: "Lille", websiteStatus: "UNKNOWN" },
    });
    // Un site déjà renseigné mais invalide fait échouer new URL() dans le
    // chemin « site fourni » — exactement le genre de donnée abîmée qui
    // traîne dans une base réelle.
    await prisma.prospect.update({ where: { id: p.id }, data: { website: "://casse" } });

    await jobEnrichSites({ limit: 5 });
    const apres = await prisma.prospect.findUniqueOrThrow({ where: { id: p.id } });
    assert.notEqual(apres.websiteStatus, "UNKNOWN", "le prospect en échec reviendra à chaque tour");

    await tourSuivant();
    const second = await jobEnrichSites({ limit: 5 });
    assert.equal(second.itemsSeen, 0, "le prospect en échec a été repris");
  });

  test("un prospect en opposition n'est jamais enrichi", async () => {
    await prisma.prospect.create({
      data: { name: "SA", sector: "x", city: "Lille", websiteStatus: "UNKNOWN", status: "OPTOUT" },
    });
    const r = await jobEnrichSites({ limit: 10 });
    assert.equal(r.itemsSeen, 0, "un prospect opposé a été traité");
  });
});

describe("Audit et emails — les jobs", () => {
  test("l'audit ne prend que les prospects ayant un site", async () => {
    await prisma.prospect.create({
      data: { name: uid("Sans site"), sector: "x", city: "Lille", websiteStatus: "NOT_FOUND" },
    });
    const r = await jobAuditSites({ limit: 10 });
    assert.equal(r.itemsSeen, 0);
    assert.match(r.summary, /Aucun site/);
  });

  test("la recherche d'email exige un site DÉJÀ audité", async () => {
    // Sans audit, il n'y a aucune page connue où lire une adresse — et aucune
    // adresse n'est jamais fabriquée à partir du domaine.
    await prisma.prospect.create({
      data: {
        name: uid("Audit en attente"), sector: "x", city: "Lille",
        website: "https://exemple.test", websiteStatus: "CONFIRMED", auditStatus: "PENDING",
      },
    });
    const r = await jobFindEmails({ limit: 10 });
    assert.equal(r.itemsSeen, 0);
  });

  test("un prospect ayant déjà un contact n'est pas re-fouillé", async () => {
    const p = await seedProspect({ email: "contact@exemple.fr" });
    await prisma.prospect.update({
      where: { id: p.id },
      data: { websiteStatus: "CONFIRMED", auditStatus: "COMPLETE" },
    });
    const r = await jobFindEmails({ limit: 10 });
    assert.equal(r.itemsSeen, 0);
  });
});

describe("Qualification — le job", () => {
  test("ne juge personne avant que l'enrichissement ait été tenté", async () => {
    await prisma.prospect.create({
      data: { name: uid("Neuf"), sector: "x", city: "Lille", websiteStatus: "UNKNOWN" },
    });
    const r = await jobQualifyProspects({ limit: 10 });
    assert.equal(r.itemsSeen, 0, "un prospect a été jugé avant d'avoir été enrichi");
  });

  test("un prospect sans site ni email est jugé, et écarté", async () => {
    await prisma.prospect.create({
      data: {
        name: uid("Sans presence"), sector: "x", city: "Lille",
        websiteStatus: "NOT_FOUND", websiteCheckedAt: new Date(),
      },
    });
    const r = await jobQualifyProspects({ limit: 10 });
    assert.equal(r.itemsSeen, 1);

    const p = await prisma.prospect.findFirstOrThrow();
    assert.notEqual(p.qualification, "PENDING", "le prospect est resté sans verdict");
    assert.notEqual(p.qualification, "QUALIFIED", "qualifié sans email vérifiable");
  });

  test("un prospect sans email vérifiable ne peut pas être QUALIFIED", async () => {
    const p = await seedProspect({ email: null, website: null });
    await prisma.prospect.update({
      where: { id: p.id },
      data: { websiteStatus: "NOT_FOUND", websiteCheckedAt: new Date() },
    });
    await jobQualifyProspects({ limit: 10 });

    const apres = await prisma.prospect.findUniqueOrThrow({ where: { id: p.id } });
    assert.notEqual(apres.qualification, "QUALIFIED");
  });

  test("relancé, il ne rejuge pas ce qui est déjà tranché", async () => {
    await prisma.prospect.create({
      data: {
        name: uid("Juge"), sector: "x", city: "Lille",
        websiteStatus: "NOT_FOUND", websiteCheckedAt: new Date(),
      },
    });
    await jobQualifyProspects({ limit: 10 });
    await tourSuivant();

    const second = await jobQualifyProspects({ limit: 10 });
    assert.equal(second.itemsSeen, 0);
  });
});

describe("Rédaction — le job", () => {
  async function prospectQualifie() {
    const p = await seedProspect({ email: "contact@exemple.fr", status: "AUDITED" });
    await seedProvenIssue(p.id);
    await prisma.prospect.update({
      where: { id: p.id },
      data: { qualification: "QUALIFIED", websiteStatus: "CONFIRMED", auditStatus: "COMPLETE" },
    });
    return p;
  }

  test("rédige un email pour un prospect qualifié", async () => {
    await prospectQualifie();
    const r = await jobPrepareEmails({ limit: 10 });
    assert.equal(r.itemsChanged, 1, r.summary);
    assert.equal(await prisma.emailDraft.count({ where: { isActive: true } }), 1);
  });

  test("L'EMAIL RÉDIGÉ N'EST JAMAIS APPROUVÉ", async () => {
    await prospectQualifie();
    await jobPrepareEmails({ limit: 10 });

    const draft = await prisma.emailDraft.findFirstOrThrow();
    assert.equal(draft.approvedAt, null, "le job a approuvé un email");
  });

  test("aucun envoi n'est effectué par la rédaction", async () => {
    await prospectQualifie();
    await jobPrepareEmails({ limit: 10 });
    assert.equal(await prisma.sendLog.count(), 0);
  });

  test("un prospect sans constat prouvé est refusé, avec sa raison", async () => {
    const p = await seedProspect({ email: "contact@exemple.fr" });
    await prisma.prospect.update({ where: { id: p.id }, data: { qualification: "QUALIFIED" } });

    const r = await jobPrepareEmails({ limit: 10 });
    assert.equal(r.itemsChanged, 0);
    const details = r.details as { refuses: string[] };
    assert.ok(details.refuses.length > 0, "un refus sans explication");
  });

  test("un prospect ayant déjà un brouillon actif n'est pas repris", async () => {
    await prospectQualifie();
    await jobPrepareEmails({ limit: 10 });
    await tourSuivant();

    const second = await jobPrepareEmails({ limit: 10 });
    assert.equal(second.itemsSeen, 0);
  });
});

describe("File d'approbation", () => {
  async function prospectPret(nom?: string) {
    const p = await seedProspect({ name: nom, email: `${uid("c")}@exemple.fr`, status: "AUDITED" });
    await seedProvenIssue(p.id);
    await prisma.prospect.update({
      where: { id: p.id },
      data: { qualification: "QUALIFIED", overallScore: 70 },
    });
    await jobPrepareEmails({ limit: 10 });
    await tourSuivant();
    return p;
  }

  test("un prospect qualifié entre dans la file", async () => {
    await prospectPret();
    const r = await buildApprovalQueue();
    assert.equal(r.ajoutes, 1);
    assert.equal(r.prets, 1, JSON.stringify(r.motifsBlocage));
  });

  test("LA FILE N'APPROUVE RIEN", async () => {
    await prospectPret();
    await buildApprovalQueue();

    const approuves = await prisma.emailDraft.count({ where: { approvedAt: { not: null } } });
    assert.equal(approuves, 0, "la constitution de la file a approuvé des emails");
    const membres = await prisma.campaignMember.count({ where: { status: "APPROVED" } });
    assert.equal(membres, 0);
  });

  test("aucun envoi n'est déclenché", async () => {
    await prospectPret();
    await buildApprovalQueue();
    assert.equal(await prisma.sendLog.count(), 0);
  });

  test("UNE ADRESSE EN OPPOSITION N'ENTRE PAS DANS LA FILE", async () => {
    const p = await seedProspect({ email: "stop@exemple.fr", status: "AUDITED" });
    await seedProvenIssue(p.id);
    await prisma.prospect.update({
      where: { id: p.id },
      data: { qualification: "QUALIFIED", overallScore: 90 },
    });
    await jobPrepareEmails({ limit: 10 });
    await addToSuppressionList({ email: "stop@exemple.fr", reason: "UNSUBSCRIBED" });

    const r = await buildApprovalQueue();
    assert.equal(r.ajoutes, 0, "un prospect en opposition est entré dans la file");

    // Deux protections se recouvrent volontairement : l'enregistrement de
    // l'opposition passe aussi le prospect en OPTOUT, si bien qu'il est déjà
    // hors sélection. Le test suivant vérifie la seconde couche isolément.
    const prospect = await prisma.prospect.findUniqueOrThrow({ where: { id: p.id } });
    assert.equal(prospect.status, "OPTOUT");
  });

  test("le contrôle d'opposition de la file tient MÊME si le statut n'a pas suivi", async () => {
    const p = await seedProspect({ email: "silencieux@exemple.fr", status: "AUDITED" });
    await seedProvenIssue(p.id);
    await prisma.prospect.update({
      where: { id: p.id },
      data: { qualification: "QUALIFIED", overallScore: 90 },
    });
    await jobPrepareEmails({ limit: 10 });

    // Opposition écrite directement : le prospect garde son statut AUDITED.
    // C'est le cas d'une base restaurée à moitié, ou d'une écriture manuelle.
    // La file doit refuser d'elle-même, sans dépendre du statut.
    await prisma.suppression.create({
      data: { email: "silencieux@exemple.fr", reason: "UNSUBSCRIBED" },
    });

    const r = await buildApprovalQueue();
    assert.equal(r.ajoutes, 0, "la file a ignoré une opposition enregistrée");
    assert.ok(
      r.ecartes.some((e) => /Opposition/.test(e.raison)),
      "l'opposition n'est pas nommée dans les écartements",
    );
  });

  test("un domaine en opposition écarte aussi ses adresses", async () => {
    const p = await seedProspect({ email: "contact@interdit.fr", status: "AUDITED" });
    await seedProvenIssue(p.id);
    await prisma.prospect.update({
      where: { id: p.id },
      data: { qualification: "QUALIFIED", overallScore: 90 },
    });
    await jobPrepareEmails({ limit: 10 });
    await addToSuppressionList({ domain: "interdit.fr", reason: "COMPLAINT" });

    const r = await buildApprovalQueue();
    assert.equal(r.ajoutes, 0);
  });

  test("un prospect contacté récemment reste hors de la file", async () => {
    const p = await prospectPret();
    await prisma.prospect.update({
      where: { id: p.id },
      data: { lastInteractionAt: new Date() },
    });

    const r = await buildApprovalQueue();
    assert.equal(r.ajoutes, 0);
    assert.ok(r.ecartes.some((e) => /délai/.test(e.raison)));
  });

  test("la file est bornée et prend les meilleurs scores d'abord", async () => {
    const faible = await prospectPret("Faible");
    const fort = await prospectPret("Fort");
    await prisma.prospect.update({ where: { id: faible.id }, data: { overallScore: 40 } });
    await prisma.prospect.update({ where: { id: fort.id }, data: { overallScore: 95 } });

    const r = await buildApprovalQueue({ max: 1 });
    assert.equal(r.ajoutes, 1);

    const membre = await prisma.campaignMember.findFirstOrThrow({ include: { prospect: true } });
    assert.equal(membre.prospect.id, fort.id, "le prospect au score le plus faible a été retenu");
  });

  test("relancer la constitution ne crée pas de doublon", async () => {
    await prospectPret();
    await buildApprovalQueue();
    const second = await buildApprovalQueue();

    assert.equal(second.ajoutes, 0, "un prospect déjà en file a été réintroduit");
    assert.equal(await prisma.campaignMember.count(), 1);
  });

  test("l'état de la file est lisible", async () => {
    await prospectPret();
    await buildApprovalQueue();

    const s = await approvalQueueStatus();
    assert.equal(s.enAttente, 1);
    assert.equal(s.approuves, 0);
    assert.ok(s.campagnes.length >= 1);
  });

  test("la commande d'approbation est explicite et jamais exécutée seule", async () => {
    await prospectPret();
    const r = await buildApprovalQueue();
    assert.match(r.commandeApprobation, /campaign approve/);
    assert.equal(await prisma.campaignMember.count({ where: { status: "APPROVED" } }), 0);
  });
});
