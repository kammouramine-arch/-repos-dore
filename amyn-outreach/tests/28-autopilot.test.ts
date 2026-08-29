// ---------------------------------------------------------------------------
// PILOTE AUTOMATIQUE
//
// C'est le seul module du système capable d'envoyer un email sans qu'un
// humain l'ait lu. Ces tests sont donc les plus importants de la suite : ils
// vérifient qu'il refuse de démarrer quand il le doit, qu'il n'atteint jamais
// un prospect protégé, et qu'il se coupe seul quand quelque chose déraille.
//
// Aucun test n'interroge le DNS ni n'envoie quoi que ce soit : DRY_RUN est
// actif pendant toute la suite et la vérification de délivrabilité est
// injectée.
// ---------------------------------------------------------------------------

import { test, describe, before, beforeEach } from "node:test";
import assert from "node:assert/strict";

import { prisma } from "@/lib/db";
import { config } from "@/lib/config";
import { getPolicy, setPolicy } from "@/lib/policy";
import { autopilotGate, runAutopilot } from "@/lib/campaign/autopilot";
import { addToSuppressionList } from "@/lib/campaign/compliance";
import { jobAutoSend } from "@/lib/scheduler/jobs";
import type { DeliverabilityReport } from "@/lib/deliverability";
import { resetDatabase, seedProspect, seedProvenIssue, uid } from "./helpers";

/** Rapport DNS simulé : aucun test ne dépend d'une résolution réelle. */
function dns(options: { dkim: boolean }): () => Promise<DeliverabilityReport> {
  return async () => ({
    domain: "amyn.agency",
    ready: options.dkim,
    summary: options.dkim ? "Tout est en place." : "DKIM manquant.",
    disclaimer: "",
    checks: [
      { id: "mx", label: "Serveurs de réception (MX)", status: "OK", found: [], detail: "4 MX." },
      { id: "spf", label: "SPF", status: "OK", found: [], detail: "SPF correct." },
      { id: "dmarc", label: "DMARC", status: "OK", found: [], detail: "DMARC présent." },
      {
        id: "dkim",
        label: "DKIM",
        status: options.dkim ? "OK" : "MISSING",
        found: [],
        detail: options.dkim ? "Signature active." : "Aucune clé DKIM trouvée.",
      },
    ],
  }) as unknown as Promise<DeliverabilityReport>;
}

/** Une heure ouvrée : mardi 10 h. La fenêtre d'envoi ne doit pas fausser le test. */
const MARDI_10H = new Date("2026-09-01T10:00:00");

const sansAttente = { attendre: async () => {} };

async function prospectPretAEnvoyer(nom?: string) {
  const p = await seedProspect({
    name: nom ?? uid("Entreprise"),
    email: `${uid("contact")}@exemple.fr`,
    status: "READY",
  });
  const issue = await seedProvenIssue(p.id);
  await prisma.prospect.update({
    where: { id: p.id },
    data: { qualification: "QUALIFIED", overallScore: 80 },
  });
  const { generateEmail } = await import("@/lib/email/generate");
  const email = await generateEmail(p.id, { generator: "template" });
  assert.ok(email.verification.passed, "le brouillon de test doit passer la vérification");
  assert.ok(issue.id);
  return p;
}

async function armer() {
  await setPolicy("autoSendEnabled", true);
}

before(async () => { await resetDatabase(); });
beforeEach(async () => {
  await resetDatabase();
  await prisma.setting.deleteMany();
});

describe("Le sas d'entrée", () => {
  test("refuse tant que l'automatisme n'est pas armé", async () => {
    const g = await autopilotGate({ now: MARDI_10H, verifierDns: false });
    assert.equal(g.autorise, false);
    assert.ok(g.checks.find((c) => c.id === "arme")?.ok === false);
  });

  test("l'automatisme est désarmé par défaut", async () => {
    const policy = await getPolicy();
    assert.equal(policy.autoSendEnabled, false, "l'envoi automatique est actif par défaut");
  });

  test("armé, le sas s'ouvre en heure ouvrée", async () => {
    await armer();
    const g = await autopilotGate({ now: MARDI_10H, deliverabilite: dns({ dkim: true }) });
    assert.equal(g.autorise, true, g.blockers.join(" | "));
  });

  test("la fenêtre horaire ferme le sas hors des heures ouvrées", async () => {
    await armer();
    const dimanche = new Date("2026-08-30T10:00:00");
    const g = await autopilotGate({ now: dimanche, deliverabilite: dns({ dkim: true }) });
    assert.equal(g.autorise, false);
    assert.ok(g.checks.find((c) => c.id === "fenetre")?.ok === false);
  });

  test("DKIM absent est CONSTATÉ sans bloquer en simulation", async () => {
    // C'est justement en simulation qu'on veut voir tourner le mécanisme.
    await armer();
    const g = await autopilotGate({ now: MARDI_10H, deliverabilite: dns({ dkim: false }) });
    const dkim = g.checks.find((c) => c.id === "dkim");
    assert.equal(dkim?.ok, true);
    assert.match(dkim!.detail, /Aucune clé DKIM/);
    assert.match(dkim!.detail, /sans bloquer/);
  });

  test("chaque blocage propose son remède", async () => {
    const g = await autopilotGate({ now: MARDI_10H, verifierDns: false });
    assert.ok(g.blockers.length > 0);
    assert.ok(g.remedes.length > 0, "un blocage sans remède laisse l'utilisateur sans issue");
  });

  test("le sas vérifie MX, SPF, DMARC et DKIM", async () => {
    await armer();
    const g = await autopilotGate({ now: MARDI_10H, deliverabilite: dns({ dkim: true }) });
    for (const id of ["mx", "spf", "dmarc", "dkim"]) {
      assert.ok(g.checks.some((c) => c.id === id), `${id} non vérifié par le sas`);
    }
  });
});

describe("Rien ne part si le sas est fermé", () => {
  test("aucun envoi tant que l'automatisme est désarmé", async () => {
    await prospectPretAEnvoyer();
    const r = await runAutopilot({ now: MARDI_10H, verifierDns: false, ...sansAttente });

    assert.equal(r.demarre, false);
    assert.equal(r.envoyes, 0);
    assert.equal(r.simules, 0);
    assert.equal(await prisma.sendLog.count(), 0);
  });

  test("le refus est journalisé, jamais silencieux", async () => {
    await prospectPretAEnvoyer();
    await runAutopilot({ now: MARDI_10H, verifierDns: false, ...sansAttente });

    const trace = await prisma.activityLog.count({ where: { action: "autopilot.refused" } });
    assert.ok(trace >= 1, "un refus d'envoi automatique n'a laissé aucune trace");
  });

  test("aucun email n'est approuvé quand le sas refuse", async () => {
    await prospectPretAEnvoyer();
    await runAutopilot({ now: MARDI_10H, verifierDns: false, ...sansAttente });

    assert.equal(await prisma.emailDraft.count({ where: { approvedAt: { not: null } } }), 0);
  });
});

describe("Les protections restent entières", () => {
  test("un prospect NEEDS_HUMAN n'est JAMAIS envoyé automatiquement", async () => {
    const p = await prospectPretAEnvoyer();
    await prisma.prospect.update({
      where: { id: p.id },
      data: { qualification: "NEEDS_HUMAN" },
    });
    await armer();

    const r = await runAutopilot({ now: MARDI_10H, deliverabilite: dns({ dkim: true }), ...sansAttente });
    assert.equal(r.examines, 0, "un prospect à trancher est entré dans l'envoi automatique");
    assert.equal(await prisma.sendLog.count(), 0);
  });

  test("un prospect en opposition n'est JAMAIS envoyé", async () => {
    const p = await seedProspect({ email: "stop@exemple.fr", status: "READY" });
    await seedProvenIssue(p.id);
    await prisma.prospect.update({
      where: { id: p.id },
      data: { qualification: "QUALIFIED", overallScore: 90 },
    });
    const { generateEmail } = await import("@/lib/email/generate");
    await generateEmail(p.id, { generator: "template" });
    await addToSuppressionList({ email: "stop@exemple.fr", reason: "UNSUBSCRIBED" });
    await armer();

    const r = await runAutopilot({ now: MARDI_10H, deliverabilite: dns({ dkim: true }), ...sansAttente });
    assert.equal(r.envoyes, 0);
    assert.equal(r.simules, 0);
    const envois = await prisma.sendLog.count({ where: { status: { in: ["SENT", "SIMULATED"] } } });
    assert.equal(envois, 0, "un prospect opposé a reçu un email");
  });

  test("un prospect déjà contacté n'est pas relancé par l'automatisme", async () => {
    const p = await prospectPretAEnvoyer();
    await prisma.prospect.update({ where: { id: p.id }, data: { status: "CONTACTED" } });
    await armer();

    const r = await runAutopilot({ now: MARDI_10H, deliverabilite: dns({ dkim: true }), ...sansAttente });
    assert.equal(r.examines, 0);
  });

  test("un prospect sans email vérifié n'est pas retenu", async () => {
    const p = await seedProspect({ email: null, status: "READY" });
    await seedProvenIssue(p.id);
    await prisma.prospect.update({
      where: { id: p.id },
      data: { qualification: "QUALIFIED", overallScore: 90 },
    });
    await armer();

    const r = await runAutopilot({ now: MARDI_10H, deliverabilite: dns({ dkim: true }), ...sansAttente });
    assert.equal(r.examines, 0);
  });

  test("UNE ADRESSE PERSONNELLE N'EST JAMAIS ENVOYÉE AUTOMATIQUEMENT", async () => {
    // « sandrine.delecourt@orange.fr » est la boîte personnelle d'une
    // artisane, pas l'accueil d'une entreprise. L'automatisme s'en abstient ;
    // la décision reste humaine.
    const p = await seedProspect({ email: "sandrine.delecourt@orange.fr", status: "READY" });
    await seedProvenIssue(p.id);
    await prisma.prospect.update({
      where: { id: p.id },
      data: { qualification: "QUALIFIED", overallScore: 90 },
    });
    const { generateEmail } = await import("@/lib/email/generate");
    await generateEmail(p.id, { generator: "template" });
    await armer();

    const r = await runAutopilot({ now: MARDI_10H, deliverabilite: dns({ dkim: true }), ...sansAttente });
    assert.equal(r.envoyes + r.simules, 0, "une adresse personnelle a reçu un envoi automatique");
    assert.ok(
      Object.keys(r.motifs).some((m) => /personnelle/.test(m)),
      "l'écartement n'est pas expliqué",
    );
  });

  test("le prospect écarté reste qualifié et disponible pour un envoi manuel", async () => {
    const p = await seedProspect({ email: "jean.martin@gmail.com", status: "READY" });
    await seedProvenIssue(p.id);
    await prisma.prospect.update({
      where: { id: p.id },
      data: { qualification: "QUALIFIED", overallScore: 90 },
    });
    const { generateEmail } = await import("@/lib/email/generate");
    await generateEmail(p.id, { generator: "template" });
    await armer();
    await runAutopilot({ now: MARDI_10H, deliverabilite: dns({ dkim: true }), ...sansAttente });

    const apres = await prisma.prospect.findUniqueOrThrow({ where: { id: p.id } });
    assert.equal(apres.qualification, "QUALIFIED", "le prospect a été déqualifié au lieu d'être différé");
  });

  test("une adresse de fonction sur le domaine de l'entreprise part normalement", async () => {
    await prospectPretAEnvoyer(); // contact@exemple.fr
    await armer();

    const r = await runAutopilot({ now: MARDI_10H, deliverabilite: dns({ dkim: true }), ...sansAttente });
    assert.equal(r.simules, 1, JSON.stringify(r.details));
  });

  test("une adresse nominative sur le domaine de l'entreprise reste acceptée", async () => {
    // « jean@boulangerie-dupont.fr » est une adresse professionnelle : elle
    // n'a pas à être écartée faute de mieux.
    const { isPersonalMailbox } = await import("@/lib/contact/discover");
    assert.equal(isPersonalMailbox("jean@boulangerie-dupont.fr"), false);
    assert.equal(isPersonalMailbox("jean.dupont@orange.fr"), true);
    assert.equal(isPersonalMailbox("contact@orange.fr"), false);
  });

  test("le plafond quotidien s'applique à l'envoi automatique", async () => {
    for (let i = 0; i < 4; i += 1) await prospectPretAEnvoyer();
    await armer();
    await setPolicy("dailyLimit", 2);

    const r = await runAutopilot({ now: MARDI_10H, deliverabilite: dns({ dkim: true }), ...sansAttente });
    assert.ok(r.examines <= 2, `${r.examines} prospects convoqués pour un plafond de 2`);
  });

  test("le nombre d'envois par exécution est borné", async () => {
    for (let i = 0; i < 5; i += 1) await prospectPretAEnvoyer();
    await armer();
    await setPolicy("autoSendMaxPerRun", 2);
    await setPolicy("dailyLimit", 50);

    const r = await runAutopilot({ now: MARDI_10H, deliverabilite: dns({ dkim: true }), ...sansAttente });
    assert.ok(r.examines <= 2);
  });

  test("le délai entre deux envois est respecté", async () => {
    await prospectPretAEnvoyer();
    await prospectPretAEnvoyer();
    await armer();
    await setPolicy("minDelaySeconds", 180);

    const attentes: number[] = [];
    await runAutopilot({
      now: MARDI_10H,
      deliverabilite: dns({ dkim: true }),
      attendre: async (ms) => { attentes.push(ms); },
    });

    assert.ok(attentes.length >= 1, "aucun délai observé entre deux envois");
    assert.equal(attentes[0], 180_000);
  });
});

describe("En simulation, rien ne part vraiment", () => {
  test("DRY_RUN produit des envois SIMULÉS, jamais SENT", async () => {
    assert.equal(config.dryRun, true, "la suite doit tourner en simulation");
    await prospectPretAEnvoyer();
    await armer();

    const r = await runAutopilot({ now: MARDI_10H, deliverabilite: dns({ dkim: true }), ...sansAttente });
    assert.equal(r.simules, 1, JSON.stringify(r.details));
    assert.equal(r.envoyes, 0);
    assert.equal(await prisma.sendLog.count({ where: { status: "SENT" } }), 0);
  });

  test("chaque envoi automatique est journalisé", async () => {
    await prospectPretAEnvoyer();
    await armer();
    await runAutopilot({ now: MARDI_10H, deliverabilite: dns({ dkim: true }), ...sansAttente });

    assert.equal(await prisma.sendLog.count(), 1);
    const trace = await prisma.activityLog.count({ where: { action: "autopilot.run" } });
    assert.ok(trace >= 1);
  });

  test("un email parti seul porte la trace AUTOPILOT", async () => {
    await prospectPretAEnvoyer();
    await armer();
    await runAutopilot({ now: MARDI_10H, deliverabilite: dns({ dkim: true }), ...sansAttente });

    const draft = await prisma.emailDraft.findFirstOrThrow({ where: { approvedAt: { not: null } } });
    assert.equal(draft.approvedBy, "AUTOPILOT", "impossible de distinguer machine et humain après coup");
  });

  test("l'écriture de approvedAt reste au même endroit unique", async () => {
    const { readFileSync } = await import("node:fs");
    const { resolve } = await import("node:path");
    const { codeSansCommentaires } = await import("./helpers");

    const racine = resolve(import.meta.dirname, "..");
    const autopilote = codeSansCommentaires(
      readFileSync(resolve(racine, "lib/campaign/autopilot.ts"), "utf-8"),
    );
    assert.doesNotMatch(
      autopilote,
      /approvedAt:\s*new Date/,
      "le pilote automatique écrit approvedAt lui-même au lieu de passer par le point unique",
    );
  });
});

describe("Coupe-circuit", () => {
  /** Un envoi qui échoue systématiquement, pour éprouver la protection. */
  const envoiEnPanne = async () => ({
    sent: false, simulated: false, blocked: false,
    reason: "connexion SMTP refusée",
    compliance: { allowed: true, checks: [], blockedBy: [] },
  });

  test("des échecs répétés désactivent l'envoi automatique", async () => {
    for (let i = 0; i < 4; i += 1) await prospectPretAEnvoyer();
    await armer();
    await setPolicy("autoSendMaxConsecutiveFailures", 2);
    await setPolicy("dailyLimit", 50);
    await setPolicy("autoSendMaxPerRun", 10);

    const r = await runAutopilot({
      now: MARDI_10H,
      deliverabilite: dns({ dkim: true }),
      envoyer: envoiEnPanne,
      ...sansAttente,
    });

    assert.equal(r.coupeCircuit, true, "le coupe-circuit ne s'est pas déclenché");
    assert.equal(r.echecs, 2, "l'exécution a continué au-delà du seuil");

    const apres = await getPolicy();
    assert.equal(apres.autoSendEnabled, false, "l'envoi automatique est resté armé après la panne");
  });

  test("la coupure est journalisée en ERREUR", async () => {
    for (let i = 0; i < 3; i += 1) await prospectPretAEnvoyer();
    await armer();
    await setPolicy("autoSendMaxConsecutiveFailures", 2);

    await runAutopilot({
      now: MARDI_10H, deliverabilite: dns({ dkim: true }),
      envoyer: envoiEnPanne, ...sansAttente,
    });

    const trace = await prisma.activityLog.findFirst({
      where: { action: "autopilot.circuit_breaker" },
    });
    assert.ok(trace, "la coupure n'a laissé aucune trace");
    assert.equal(trace!.level, "ERROR");
  });

  test("une fois coupé, un nouveau tour ne repart pas tout seul", async () => {
    for (let i = 0; i < 3; i += 1) await prospectPretAEnvoyer();
    await armer();
    await setPolicy("autoSendMaxConsecutiveFailures", 2);

    await runAutopilot({
      now: MARDI_10H, deliverabilite: dns({ dkim: true }),
      envoyer: envoiEnPanne, ...sansAttente,
    });

    const second = await runAutopilot({
      now: MARDI_10H, deliverabilite: dns({ dkim: true }), ...sansAttente,
    });
    assert.equal(second.demarre, false, "l'automatisme est reparti après une coupure");
  });

  test("un REFUS de conformité ne déclenche pas le coupe-circuit", async () => {
    // Un email bloqué est le système qui fonctionne, pas une panne. Confondre
    // les deux couperait l'automatisme au premier prospect en opposition.
    const refus = async () => ({
      sent: false, simulated: false, blocked: true,
      reason: "opposition",
      compliance: { allowed: false, checks: [], blockedBy: ["CHECK_OPT_OUT"] },
    });

    for (let i = 0; i < 4; i += 1) await prospectPretAEnvoyer();
    await armer();
    await setPolicy("autoSendMaxConsecutiveFailures", 2);

    const r = await runAutopilot({
      now: MARDI_10H, deliverabilite: dns({ dkim: true }),
      envoyer: refus, ...sansAttente,
    });

    assert.equal(r.coupeCircuit, false, "un refus de conformité a été pris pour une panne");
    assert.ok(r.bloques > 0);
    assert.equal((await getPolicy()).autoSendEnabled, true, "l'automatisme a été désarmé à tort");
  });

  test("le réglage du coupe-circuit existe et est strictement positif", async () => {
    const policy = await getPolicy();
    assert.ok(policy.autoSendMaxConsecutiveFailures > 0, "aucun coupe-circuit configuré");
  });
});

describe("Le job du worker", () => {
  test("ne fait rien et le dit quand l'automatisme est désarmé", async () => {
    await prospectPretAEnvoyer();
    const r = await jobAutoSend();

    assert.equal(r.itemsChanged, 0);
    assert.match(r.summary, /désactivé/i);
    assert.equal(await prisma.sendLog.count(), 0);
  });

  test("deux exécutions dans la même minute : la seconde est ignorée", async () => {
    const a = await jobAutoSend();
    const b = await jobAutoSend();
    assert.equal(a.skipped, false);
    assert.equal(b.skipped, true, "le verrou du job d'envoi n'a pas tenu");
  });
});
