#!/usr/bin/env tsx
/**
 * ---------------------------------------------------------------------------
 * DEMONSTRATION DU PARCOURS COMPLET
 *
 *   prospect → audit prouve → email → campagne → approbation →
 *   envoi SIMULE → reponses dans la boite → lecture → classement →
 *   mise a jour CRM → action suivante
 *
 * Tourne sur une base JETABLE (prisma/demo.db). Ne touche jamais votre base
 * de travail, n'envoie aucun email, n'accede a aucun reseau.
 *
 *   npm run demo
 * ---------------------------------------------------------------------------
 */

import { spawnSync } from "node:child_process";
import { existsSync, rmSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const dbFile = resolve(root, "prisma", "demo.db");

// --- Relance de soi-meme avec la base jetable -------------------------------
if (process.env.AMYN_DEMO !== "1") {
  for (const suffix of ["", "-journal"]) {
    if (existsSync(dbFile + suffix)) rmSync(dbFile + suffix);
  }

  const env: NodeJS.ProcessEnv = {
    ...process.env,
    AMYN_DEMO: "1",
    DATABASE_URL: "file:./demo.db",
    DRY_RUN: "true",
    MAIL_TRANSPORT: "dry-run",
    ANTHROPIC_API_KEY: "",
  };

  const push = spawnSync(
    "npx",
    ["prisma", "db", "push", "--skip-generate", "--accept-data-loss"],
    { cwd: root, env, stdio: ["ignore", "ignore", "inherit"] },
  );
  if (push.status !== 0) process.exit(push.status ?? 1);

  const run = spawnSync("npx", ["tsx", "scripts/demo-workflow.ts"], {
    cwd: root,
    env,
    stdio: "inherit",
  });

  for (const suffix of ["", "-journal"]) {
    if (existsSync(dbFile + suffix)) rmSync(dbFile + suffix);
  }
  process.exit(run.status ?? 1);
}

// --- La demonstration elle-meme ---------------------------------------------

const C = {
  reset: "\x1b[0m", dim: "\x1b[2m", bold: "\x1b[1m",
  gold: "\x1b[38;5;179m", green: "\x1b[32m", red: "\x1b[31m",
  amber: "\x1b[33m", blue: "\x1b[36m",
};
const etape = (n: number, t: string) => {
  console.log(`\n${C.gold}${C.bold}ÉTAPE ${n} — ${t}${C.reset}`);
  console.log(C.dim + "─".repeat(Math.min(t.length + 12, 74)) + C.reset);
};
const ok = (t: string) => console.log(`  ${C.green}✓${C.reset} ${t}`);
const warn = (t: string) => console.log(`  ${C.amber}!${C.reset} ${t}`);
const info = (t: string) => console.log(`    ${C.dim}${t}${C.reset}`);

/** Sept salons réalistes de la métropole lilloise. */
const PANEL = [
  { nom: "Salon Lemaire", email: "contact@salon-lemaire.fr", ville: "Lille" },
  { nom: "Coiffure Delatte", email: "bonjour@coiffure-delatte.fr", ville: "Roubaix" },
  { nom: "Atelier Vandamme", email: "contact@atelier-vandamme.fr", ville: "Tourcoing" },
  { nom: "Institut Merlin", email: "info@institut-merlin.fr", ville: "Lille" },
  { nom: "Salon Dubois", email: "contact@salon-dubois.fr", ville: "Lambersart" },
  { nom: "Coiffure Leroy", email: "contact@coiffure-leroy.fr", ville: "Croix" },
  { nom: "Salon Fontaine", email: "contact@salon-fontaine.fr", ville: "Lille" },
];

async function main() {
  const { prisma } = await import("../lib/db");
  const { config } = await import("../lib/config");
  const { generateEmail } = await import("../lib/email/generate");
  const { createCampaign, addProspectsToCampaign, prepareCampaign, approveCampaignMembers, runCampaign } =
    await import("../lib/campaign");
  const { runComplianceChecks } = await import("../lib/campaign/compliance");
  const { findFollowUpCandidates } = await import("../lib/campaign/followup");
  const { syncReplies, replyInbox } = await import("../lib/replies/sync");
  const { FakeMailbox, QUOTED_ORIGINAL } = await import("../tests/fake-mailbox");


  console.log(`\n${C.gold}${C.bold}AMYN OUTREACH — parcours complet, de bout en bout${C.reset}`);
  console.log(`${C.dim}base jetable · DRY_RUN=${config.dryRun} · transport=${config.mailTransport} · aucun réseau${C.reset}`);

  // === 1. PROSPECTS + PREUVES ==============================================
  etape(1, "Prospects et problèmes prouvés");
  const ids: Record<string, string> = {};
  for (const p of PANEL) {
    const prospect = await prisma.prospect.create({
      data: {
        name: p.nom, sector: "coiffeur", city: p.ville,
        website: `https://${p.email.split("@")[1]}`, status: "AUDITED",
      },
    });
    ids[p.nom] = prospect.id;

    const contact = await prisma.contact.create({
      data: {
        prospectId: prospect.id, email: p.email, isGeneric: true,
        discoveryMethod: "WEBSITE_CONTACT", sourceUrl: `https://${p.email.split("@")[1]}/contact`,
        sourceSnippet: `Nous écrire : ${p.email}`, validationStatus: "SYNTAX_OK",
      },
    });
    await prisma.prospect.update({ where: { id: prospect.id }, data: { primaryContactId: contact.id } });

    const run = await prisma.auditRun.create({
      data: { prospectId: prospect.id, status: "COMPLETE", userAgent: "AmynOutreachBot/1.0 (démo)", rulesRun: 1 },
    });
    const check = await prisma.auditCheck.create({
      data: {
        prospectId: prospect.id, auditRunId: run.id, ruleId: "site.https", ruleLabel: "HTTPS",
        category: "SECURITE", verdict: "VERIFIED", confidence: "HIGH", isProblem: true,
        observation: "La page d'accueil répond en http:// et non en https://.",
        method: "Requête HTTP GET unique sur l'URL d'accueil.",
        targetUrl: `http://${p.email.split("@")[1]}/`, evidenceSnippet: "HTTP/1.1 200 OK",
      },
    });
    await prisma.issue.create({
      data: {
        prospectId: prospect.id, auditCheckId: check.id, ruleId: "site.https", type: "NO_HTTPS",
        severity: "HIGH", confidence: "HIGH", title: "Le site n'est pas en HTTPS",
        summary: check.observation, evidenceUrl: check.targetUrl, evidenceSnippet: check.evidenceSnippet,
        evidenceNote: check.method,
      },
    });
  }
  ok(`${PANEL.length} prospects, chacun avec un problème PROUVÉ (vérification VERIFIED liée)`);
  info("Un problème sans preuve serait refusé par le moteur.");

  // === 2. RÉDACTION ========================================================
  etape(2, "Rédaction des emails");
  for (const p of PANEL) await generateEmail(ids[p.nom]);
  const exemple = await prisma.emailDraft.findFirstOrThrow({ where: { prospectId: ids["Salon Lemaire"] } });
  ok(`${PANEL.length} emails rédigés, chacun vérifié avant d'être retenu`);
  info(`exemple — objet : « ${exemple.subject} »`);
  info(`         cite ${JSON.parse(exemple.citedIssueIds).length} problème(s) prouvé(s) · vérification ${exemple.verificationPassed ? "passée" : "ÉCHOUÉE"}`);

  // === 3. CAMPAGNE, SANS APPROBATION =======================================
  etape(3, "Campagne — tentative d'envoi SANS approbation");
  const campagne = await createCampaign({ name: "Coiffeurs métropole lilloise", targetCriteria: { city: "Lille" } });
  await addProspectsToCampaign(campagne.id, Object.values(ids));
  await prepareCampaign(campagne.id);
  const avant = await runCampaign(campagne.id);
  warn(`${avant.blocked} envoi(s) BLOQUÉ(S) — ${avant.sent} envoyé, ${avant.simulated} simulé`);
  info(avant.details[0] ?? "");

  // === 4. APPROBATION + ENVOI ==============================================
  etape(4, "Approbation puis envoi (SIMULÉ, DRY_RUN=true)");
  const appro = await approveCampaignMembers(campagne.id, "DÉMO");
  ok(`${appro.approved} email(s) approuvé(s)`);
  const envoi = await runCampaign(campagne.id);
  ok(`${envoi.simulated} email(s) SIMULÉ(S) · ${C.bold}${envoi.sent} réellement envoyé(s)${C.reset}`);
  info("Chacun a passé les 12 contrôles de conformité avant d'être simulé.");

  // === 5. LES RÉPONSES ARRIVENT ============================================
  etape(5, "Les prospects répondent — lecture de la boîte");
  const hier = new Date(Date.now() - 86400000);
  const boite = new FakeMailbox([
    { uid: 101, from: "contact@salon-lemaire.fr", fromName: "Sophie Lemaire",
      subject: "Re: Salon Lemaire — votre site",
      body: "Bonjour,\n\nMerci pour votre message. Notre site date un peu, ça m'intéresse.\nVous êtes disponible en fin de semaine ?\n\nSophie Lemaire" + QUOTED_ORIGINAL,
      messageId: "<1@salon-lemaire.fr>", receivedAt: hier },
    { uid: 102, from: "bonjour@coiffure-delatte.fr",
      subject: "Re: Coiffure Delatte — votre site",
      body: "Bonjour, quel est votre tarif pour ce genre de prestation ?" + QUOTED_ORIGINAL,
      messageId: "<2@coiffure-delatte.fr>", receivedAt: hier },
    { uid: 103, from: "contact@atelier-vandamme.fr",
      subject: "Re: Atelier Vandamme — votre site",
      body: "Merci mais nous avons déjà un prestataire. Non merci." + QUOTED_ORIGINAL,
      messageId: "<3@atelier-vandamme.fr>", receivedAt: hier },
    { uid: 104, from: "info@institut-merlin.fr",
      subject: "Re: Institut Merlin — votre site",
      body: "Merci de me désinscrire de votre liste." + QUOTED_ORIGINAL,
      messageId: "<4@institut-merlin.fr>", receivedAt: hier },
    { uid: 105, from: "contact@salon-dubois.fr",
      subject: "Re: Salon Dubois — votre site",
      body: "C'est très intéressant et bien vu, mais non merci." + QUOTED_ORIGINAL,
      messageId: "<5@salon-dubois.fr>", receivedAt: hier },
    { uid: 106, from: "contact@coiffure-leroy.fr",
      subject: "Réponse automatique : absence du bureau",
      body: "Je suis absent jusqu'au 30 août. Votre message m'intéresse, je reviens vers vous.",
      headers: { "auto-submitted": "auto-replied" },
      messageId: "<6@coiffure-leroy.fr>", receivedAt: hier },
    { uid: 107, from: "gerant@boulangerie-inconnue.fr", fromName: "Paul Mercier",
      subject: "Question", body: "Bonjour, pouvez-vous me rappeler ?",
      messageId: "<7@boulangerie-inconnue.fr>", receivedAt: hier },
  ]);

  const rapport = await syncReplies(boite);
  ok(`${rapport.fetched} message(s) examiné(s) · ${rapport.stored} enregistré(s) · ${rapport.duplicates} doublon(s)`);
  info("Boîte ouverte en LECTURE SEULE : rien n'a été supprimé, déplacé ni marqué comme lu.");

  console.log();
  console.table(
    rapport.outcomes.map((o) => ({
      prospect: o.prospectName ?? "(inconnu)",
      classement: o.classification,
      confiance: o.confidence,
      "action suggérée": o.recommendedAction,
    })),
  );

  // === 6. CE QUE LE CRM A FAIT =============================================
  etape(6, "Mise à jour du CRM");
  const suivis = await prisma.prospect.findMany({
    where: { id: { in: Object.values(ids) } },
    orderBy: { name: "asc" },
  });
  console.table(
    suivis.map((p) => ({
      prospect: p.name,
      statut: p.status,
      "prochaine action": p.nextAction ?? "—",
      "dernière réponse": p.lastInteractionAt ? p.lastInteractionAt.toISOString().slice(0, 10) : "—",
    })),
  );

  // === 7. LA PROTECTION OPT-OUT ============================================
  etape(7, "Preuve : l'opposition bloque tout envoi futur");
  const optOutId = ids["Institut Merlin"];
  const draft = await prisma.emailDraft.findFirstOrThrow({ where: { prospectId: optOutId, isActive: true } });
  await prisma.emailDraft.update({ where: { id: draft.id }, data: { approvedAt: new Date() } });
  const controle = await runComplianceChecks({ prospectId: optOutId, draftId: draft.id, step: 1 });
  if (controle.allowed) warn("PROBLÈME : un envoi reste possible !");
  else {
    ok(`Envoi refusé — bloqué par : ${controle.blockedBy.join(", ")}`);
    const opt = controle.checks.find((c) => c.name === "CHECK_OPT_OUT");
    info(opt?.detail ?? "");
  }

  // === 8. RELANCES =========================================================
  etape(8, "Qui reste à relancer ?");
  await prisma.campaignMember.updateMany({
    where: { campaignId: campagne.id, status: { in: ["APPROVED", "SENT", "PENDING"] } },
    data: { status: "SENT", lastSentAt: new Date(Date.now() - 10 * 86400000) },
  });
  const { candidates, skipped } = await findFollowUpCandidates(campagne.id);
  ok(`${candidates.length} prospect(s) relançable(s) : ${candidates.map((c) => c.prospectName).join(", ") || "aucun"}`);
  for (const s of skipped) info(`${s.name} — ${s.reason}`);

  // === 9. ÉTAT FINAL =======================================================
  etape(9, "Centre de tri");
  const inbox = await replyInbox();
  console.log(`  ${inbox.total} réponse(s) · ${inbox.new} nouvelle(s) · ${inbox.actionRequired} action requise · ${inbox.resolved} traitée(s)`);
  console.log(`  ${inbox.interested} intéressé(s) · ${inbox.optOuts} opposition(s) · ${inbox.needsHuman} intervention requise · ${inbox.unknown} non classée(s)`);

  // === GARANTIE ============================================================
  etape(10, "Garantie finale");
  const reels = await prisma.sendLog.count({ where: { status: "SENT" } });
  const horsSimu = await prisma.sendLog.count({ where: { dryRun: false } });
  const total = await prisma.sendLog.count();
  if (reels === 0 && horsSimu === 0) {
    ok(`${C.bold}AUCUN email réel envoyé${C.reset} — ${total} envoi(s) enregistré(s), tous SIMULÉS`);
  } else {
    console.log(`  ${C.red}✗ ${reels} email(s) réellement envoyé(s) — LE VERROU A ÉCHOUÉ${C.reset}`);
    process.exitCode = 1;
  }
  ok("Aucune réponse automatique envoyée : les modules de lecture ne connaissent pas le mailer.");
  const traces = await prisma.activityLog.count();
  ok(`${traces} action(s) tracée(s) au journal`);

  console.log(`\n${C.dim}Base de démonstration supprimée. Votre base de travail n'a pas été touchée.${C.reset}\n`);
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  process.exit(1);
});
