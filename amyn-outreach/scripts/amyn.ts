#!/usr/bin/env tsx
/**
 * ---------------------------------------------------------------------------
 * AMYN — ligne de commande
 *
 *   npm run amyn -- "Trouve 20 coiffeurs à Roubaix"
 *   npm run amyn -- status
 *   npm run amyn -- audit <prospectId|--all>
 *   npm run amyn -- campaign approve <slug>
 *   npm run amyn -- campaign send <slug>
 *   npm run amyn -- test-email <adresse>
 *   npm run amyn -- reply <email> "texte de la réponse"
 *   npm run amyn -- client "Nom" PREMIUM
 *   npm run amyn -- optout <email>
 *   npm run amyn -- doctor
 * ---------------------------------------------------------------------------
 */

process.loadEnvFile?.();

import { prisma } from "../lib/db";
import { config, sendingReadiness } from "../lib/config";
import { runAgent } from "../lib/agent";
import { auditProspect } from "../lib/audit/persist";
import { discoverContacts } from "../lib/contact/discover";
import { scoreProspect } from "../lib/scoring";
import { generateEmail } from "../lib/email/generate";
import { approveCampaignMembers, runCampaign, sendTestEmail } from "../lib/campaign";
import { addToSuppressionList } from "../lib/campaign/compliance";
import { recordReply, syncReplies, replyInbox } from "../lib/replies";
import { imapStatus } from "../lib/imap/config";
import { ImapSource } from "../lib/imap/client";
import {
  createClientFromProspect,
  projectStatus,
  receiveOnboardingItem,
  advanceProject,
} from "../lib/crm";
import { pipelineSnapshot } from "../lib/analytics";
import { sourceStatus } from "../lib/research";
import { claudeAvailability } from "../lib/email/claude";
import { mailerStatus, readSmtpConfig } from "../lib/mailer";
import { SmtpMailer } from "../lib/mailer/smtp-mailer";
import { ALL_RULES } from "../lib/audit/rules";

const C = {
  reset: "\x1b[0m", dim: "\x1b[2m", bold: "\x1b[1m",
  gold: "\x1b[38;5;179m", green: "\x1b[32m", red: "\x1b[31m",
  amber: "\x1b[33m", blue: "\x1b[36m",
};

function title(text: string) {
  console.log(`\n${C.gold}${C.bold}${text}${C.reset}`);
  console.log(C.dim + "─".repeat(Math.min(text.length + 8, 72)) + C.reset);
}
function ok(text: string) { console.log(`  ${C.green}✓${C.reset} ${text}`); }
function bad(text: string) { console.log(`  ${C.red}✗${C.reset} ${text}`); }
function warn(text: string) { console.log(`  ${C.amber}!${C.reset} ${text}`); }
function info(text: string) { console.log(`    ${C.dim}${text}${C.reset}`); }

async function main() {
  const args = process.argv.slice(2);
  if (args.length === 0) return help();

  const [command, ...rest] = args;

  switch (command) {
    case "status": return status();
    case "doctor": return doctor();
    case "audit": return audit(rest);
    case "contacts": return contacts(rest);
    case "score": return score(rest);
    case "draft": return draft(rest);
    case "campaign": return campaign(rest);
    case "smtp-check": return smtpCheck();
    case "imap-check": return imapCheck();
    case "sync-replies": return syncRepliesCommand(rest);
    case "inbox": return inbox();
    case "test-email": return testEmail(rest);
    case "reply": return reply(rest);
    case "client": return client(rest);
    case "optout": return optout(rest);
    case "rules": return rules();
    case "help": case "--help": case "-h": return help();
    default:
      // Tout le reste est traite comme une instruction en langage naturel.
      return agent(args.join(" "));
  }
}

// --- INSTRUCTION NATURELLE --------------------------------------------------
async function agent(instruction: string) {
  title(`AMYN AGENT`);
  console.log(`  ${C.dim}Instruction :${C.reset} « ${instruction} »\n`);

  const result = await runAgent(instruction);

  console.log(`  ${C.bold}Intention${C.reset}  ${result.intent} ${C.dim}(confiance ${result.parsed.confidence})${C.reset}`);
  info(result.parsed.explanation);

  if (result.actions.length > 0) {
    console.log(`\n  ${C.bold}Plan exécuté${C.reset}`);
    for (const action of result.actions) {
      const mark =
        action.status === "DONE" ? `${C.green}✓${C.reset}`
        : action.status === "FAILED" ? `${C.red}✗${C.reset}`
        : action.status === "WAITING_APPROVAL" ? `${C.amber}⏸${C.reset}`
        : `${C.dim}·${C.reset}`;
      console.log(`  ${mark} ${action.description}`);
      info(`pourquoi : ${action.rationale}`);
      if (action.error) console.log(`    ${C.red}${action.error}${C.reset}`);
      if (action.result) {
        const summary = JSON.stringify(action.result, null, 2)
          .split("\n").slice(0, 22).join("\n").replace(/^/gm, "    ");
        console.log(C.dim + summary + C.reset);
      }
    }
  }

  console.log(`\n  ${C.bold}Résultat${C.reset}  ${result.summary} ${C.dim}[${result.status}]${C.reset}`);

  if (result.needsFromYou.length > 0) {
    console.log(`\n  ${C.amber}${C.bold}Ce que l'agent attend de vous${C.reset}`);
    for (const need of result.needsFromYou) console.log(`  → ${need}`);
  }
  console.log(`\n  ${C.dim}Trace : AgentRun ${result.runId}${C.reset}\n`);
}

// --- ETAT -------------------------------------------------------------------
async function status() {
  const s = await pipelineSnapshot();
  title("ÉTAT DU PIPELINE");

  console.log(`  ${C.bold}Prospection${C.reset}`);
  console.log(`    total ${s.prospects.total} · avec email ${s.prospects.withContact} · problèmes prouvés ${s.audit.issues}`);
  const statuses = Object.entries(s.prospects.byStatus).filter(([, n]) => n > 0);
  console.log("    " + statuses.map(([k, v]) => `${k} ${v}`).join(" · "));

  console.log(`\n  ${C.bold}Emails${C.reset}`);
  console.log(`    brouillons ${s.emails.drafts} · journalisés ${s.emails.sends} · réellement envoyés ${s.emails.realSends} · bloqués ${s.emails.blockedSends}`);

  console.log(`\n  ${C.bold}Réponses${C.reset}`);
  console.log(`    ${s.replies.total} reçue(s) ${Object.keys(s.replies.byClass).length ? "· " + Object.entries(s.replies.byClass).map(([k, v]) => `${k} ${v}`).join(" · ") : ""}`);

  console.log(`\n  ${C.bold}Clients & projets${C.reset}`);
  console.log(`    clients ${s.clients.total} · CARE actifs ${s.care.active}`);
  console.log(`    projets : ${Object.entries(s.projects).map(([k, v]) => `${k} ${v}`).join(" · ") || "aucun"}`);

  console.log(`\n  ${C.bold}Revenus${C.reset}`);
  console.log(`    signé ${s.revenue.signed} € · récurrent ${s.revenue.recurring} €/mois · encaissé ${s.revenue.paid} € · en attente ${s.revenue.pending} €`);

  console.log(`\n  ${C.bold}Conformité${C.reset}`);
  console.log(`    liste d'opposition ${s.compliance.suppressions} · erreurs journalisées ${s.compliance.errors}\n`);
}

// --- DIAGNOSTIC -------------------------------------------------------------
async function doctor() {
  title("DIAGNOSTIC DE CONFIGURATION");

  const readiness = sendingReadiness();
  console.log(`  ${C.bold}Envoi d'emails${C.reset}`);
  if (readiness.dryRun) ok("DRY_RUN=true — aucun email ne peut partir (état recommandé au démarrage)");
  else warn("DRY_RUN=false — les envois réels sont autorisés");
  console.log(`    transport : ${readiness.transport}`);
  if (readiness.smtpConfigured) ok(`SMTP configuré (${process.env.SMTP_HOST})`);
  else bad(`SMTP incomplet — manquant : ${readiness.missing.join(", ")}`);
  console.log(`    expéditeur : ${config.from.name} <${config.from.email}>`);
  console.log(`    ${readiness.canSendForReal ? C.green + "Envoi réel possible" : C.dim + "Envoi réel impossible en l'état"}${C.reset}`);

  console.log(`\n  ${C.bold}Lecture des réponses${C.reset}`);
  const imap = imapStatus();
  if (imap.configured) {
    ok(`IMAP configuré (${imap.host}:${imap.port}) — boîte ${imap.user}, dossier ${imap.folder}`);
    info("Lecture seule : aucun message n'est supprimé, déplacé ni marqué comme lu.");
    info("Vérifier la connexion : npm run amyn -- imap-check");
  } else {
    bad(`IMAP incomplet — manquant : ${imap.missing.join(", ")}`);
    info("Sans IMAP, les réponses se saisissent à la main : npm run amyn -- reply <email> \"<texte>\"");
  }

  console.log(`\n  ${C.bold}Sources de recherche${C.reset}`);
  for (const s of sourceStatus()) {
    if (s.available) ok(`${s.label} — ${s.note}`);
    else { bad(`${s.label} — manquant : ${s.missing}`); info(s.note); }
  }

  console.log(`\n  ${C.bold}Rédaction${C.reset}`);
  const claude = claudeAvailability();
  if (claude.available) ok(`Claude — ${claude.note}`);
  else { warn(`Claude inactif — manquant : ${claude.missing}`); info(claude.note); }
  ok("Générateur template — actif, aucune dépendance externe");

  console.log(`\n  ${C.bold}Moteur d'audit${C.reset}`);
  ok(`${ALL_RULES.length} règles chargées`);

  const counts = await prisma.prospect.count();
  console.log(`\n  ${C.bold}Base de données${C.reset}`);
  ok(`accessible — ${counts} prospect(s)`);
  console.log();
}

// --- COMMANDES DIRECTES -----------------------------------------------------
async function audit(args: string[]) {
  const targets = args.includes("--all")
    ? await prisma.prospect.findMany({ where: { auditStatus: "PENDING" }, take: 50 })
    : args[0]
      ? [await prisma.prospect.findUniqueOrThrow({ where: { id: args[0] } })]
      : await prisma.prospect.findMany({ where: { auditStatus: "PENDING" }, take: 5 });

  title(`AUDIT — ${targets.length} prospect(s)`);
  for (const p of targets) {
    const result = await auditProspect(p.id);
    const mark = result.report.status === "COMPLETE" ? ok : warn;
    mark(`${p.name} — ${result.report.status} · ${result.issuesCreated} problème(s) prouvé(s) sur ${result.report.stats.rulesRun} vérification(s)`);
    if (result.report.note) info(result.report.note);
  }
  console.log();
}

async function contacts(args: string[]) {
  const limit = Number(args[0] ?? 10);
  const targets = await prisma.prospect.findMany({
    where: { primaryContactId: null, website: { not: null } },
    take: limit,
  });
  title(`RECHERCHE D'EMAILS — ${targets.length} prospect(s)`);
  for (const p of targets) {
    const result = await discoverContacts(p.id);
    if (result.blocked) { warn(`${p.name} — bloqué : ${result.reason}`); }
    else ok(`${p.name} — ${result.found[0].email} (${result.found[0].discoveryMethod})`);
  }
  console.log();
}

async function score(args: string[]) {
  const limit = Number(args[0] ?? 20);
  const targets = await prisma.prospect.findMany({
    where: { auditStatus: { not: "PENDING" } }, take: limit,
  });
  title(`SCORING — ${targets.length} prospect(s)`);
  const rows = [];
  for (const p of targets) {
    const s = await scoreProspect(p.id);
    rows.push({ nom: p.name, global: s.overallScore, fit: s.fitScore, audit: s.auditScore, contact: s.contactScore, offre: s.recommendedOffer ?? "—" });
  }
  rows.sort((a, b) => b.global - a.global);
  console.table(rows);
}

async function draft(args: string[]) {
  const limit = Number(args[0] ?? 5);
  const targets = await prisma.prospect.findMany({
    where: { primaryContactId: { not: null }, issues: { some: {} } },
    orderBy: { overallScore: "desc" },
    take: limit,
  });
  title(`RÉDACTION — ${targets.length} email(s)`);
  for (const p of targets) {
    try {
      const email = await generateEmail(p.id);
      if (email.verification.passed) ok(`${p.name} — « ${email.subject} » [${email.generator}]`);
      else { bad(`${p.name} — vérification échouée`); email.verification.problems.forEach((x) => info(x)); }
    } catch (err) { bad(`${p.name} — ${(err as Error).message}`); }
  }
  console.log();
}

async function campaign(args: string[]) {
  const [sub, slug] = args;
  if (sub === "list" || !sub) {
    const campaigns = await prisma.campaign.findMany({
      include: { _count: { select: { members: true } } }, orderBy: { createdAt: "desc" },
    });
    title("CAMPAGNES");
    console.table(campaigns.map((c) => ({ slug: c.slug, nom: c.name, statut: c.status, membres: c._count.members })));
    return;
  }

  const target = await prisma.campaign.findUnique({ where: { slug } });
  if (!target) { bad(`Campagne « ${slug} » introuvable.`); return; }

  if (sub === "approve") {
    const result = await approveCampaignMembers(target.id, "CLI");
    title(`APPROBATION — ${target.name}`);
    ok(`${result.approved} email(s) approuvé(s) pour envoi.`);
    info(`Envoyer : npm run amyn -- campaign send ${slug}`);
    return;
  }

  if (sub === "send") {
    title(`ENVOI — ${target.name}`);
    if (config.dryRun) warn("DRY_RUN=true : les envois seront SIMULÉS.");
    const result = await runCampaign(target.id);
    ok(`${result.sent} envoyé(s) · ${result.simulated} simulé(s) · ${result.blocked} bloqué(s)`);
    result.details.forEach((d) => info(d));
    return;
  }

  bad(`Sous-commande inconnue : ${sub}. Utiliser list | approve | send.`);
}

/**
 * Verifie la connexion SMTP SANS envoyer d'email.
 *
 * Ouvre une connexion vers le serveur, presente les identifiants (EHLO + AUTH)
 * puis referme. Aucun message n'est transmis, aucun destinataire n'est contacte.
 * Fonctionne donc en DRY_RUN=true : c'est l'etape a faire AVANT de toucher au
 * verrou d'envoi.
 */
async function smtpCheck() {
  title("VERIFICATION DE LA CONNEXION SMTP");
  info("Aucun email n'est envoye : connexion + authentification uniquement.");
  console.log();

  const { config: smtp, missing } = readSmtpConfig();
  if (!smtp) {
    bad(`Configuration incomplete — manquant dans .env : ${missing.join(", ")}`);
    info("Renseignez ces variables dans amyn-outreach/.env, puis relancez cette commande.");
    console.log();
    return;
  }

  ok(`Serveur   : ${smtp.host}:${smtp.port}`);
  ok(`Chiffrement : ${smtp.secure ? "SSL/TLS (implicite)" : "STARTTLS"}`);
  ok(`Identifiant : ${smtp.user}`);
  info("Mot de passe : lu depuis .env, jamais affiche ni journalise.");
  console.log();

  try {
    await new SmtpMailer().verify();
    ok("Connexion et authentification reussies.");
    info("Le serveur OVHcloud accepte ces identifiants.");
    console.log();
    info("Etape suivante : envoyer UN email de test (necessite DRY_RUN=false).");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    bad(`Echec : ${message}`);
    console.log();
    if (/auth|535|password|credentials/i.test(message)) {
      info("Identifiants refuses. Verifiez SMTP_USER (adresse complete) et SMTP_PASSWORD.");
      info("Si votre compte OVHcloud a la double authentification, un mot de passe d'application est requis.");
    } else if (/ENOTFOUND|EAI_AGAIN|getaddrinfo/i.test(message)) {
      info(`Serveur introuvable : verifiez SMTP_HOST (valeur attendue : ssl0.ovh.net).`);
    } else if (/ETIMEDOUT|ECONNREFUSED|timeout/i.test(message)) {
      info("Connexion impossible : le port est peut-etre bloque par votre reseau ou votre hebergeur.");
      info("OVHcloud accepte aussi le port 587 avec SMTP_SECURE=false (STARTTLS).");
    } else if (/certificate|self.signed|SSL|TLS/i.test(message)) {
      info("Probleme de chiffrement : avec le port 465 utilisez SMTP_SECURE=true, avec le port 587 SMTP_SECURE=false.");
    }
    info("DRY_RUN reste inchange : aucun envoi n'est possible tant que ce test n'est pas concluant.");
    console.log();
  }
}

/**
 * Verifie la connexion IMAP SANS lire ni modifier le moindre message.
 * Ouvre le dossier en lecture seule, releve son etat, referme.
 */
async function imapCheck() {
  title("VERIFICATION DE LA CONNEXION IMAP");
  info("Aucun message n'est lu, deplace, marque ni supprime.");
  console.log();

  const status = imapStatus();
  if (!status.configured) {
    bad(`Configuration incomplete — manquant dans .env : ${status.missing.join(", ")}`);
    info("Renseignez ces variables dans amyn-outreach/.env, puis relancez cette commande.");
    console.log();
    return;
  }

  ok(`Serveur     : ${status.host}:${status.port}`);
  ok(`Chiffrement : ${status.secure ? "SSL/TLS (implicite)" : "STARTTLS"}`);
  ok(`Identifiant : ${status.user}`);
  ok(`Dossier lu  : ${status.folder}`);
  info("Mot de passe : lu depuis .env, jamais affiche ni journalise.");
  console.log();

  try {
    const info_ = await new ImapSource().verify();
    ok("Connexion et authentification reussies.");
    ok(`Dossier « ${info_.folder} » ouvert en LECTURE SEULE — ${info_.totalMessages} message(s).`);
    info(`UIDVALIDITY : ${info_.uidValidity}`);
    console.log();
    info("Etape suivante : npm run amyn -- sync-replies");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    bad(`Echec : ${message}`);
    console.log();
    if (/auth|login|invalid credentials|AUTHENTICATIONFAILED/i.test(message)) {
      info("Identifiants refuses. Verifiez IMAP_USER (adresse complete) et IMAP_PASSWORD.");
      info("Si la double authentification est active, un mot de passe d'application est requis.");
    } else if (/ENOTFOUND|EAI_AGAIN|getaddrinfo/i.test(message)) {
      info("Serveur introuvable : verifiez IMAP_HOST (valeur attendue : ssl0.ovh.net).");
    } else if (/ETIMEDOUT|ECONNREFUSED|timeout/i.test(message)) {
      info("Connexion impossible : le port 993 est peut-etre bloque par votre reseau.");
    } else if (/NONEXISTENT|Mailbox does not exist/i.test(message)) {
      info(`Le dossier « ${status.folder} » n'existe pas. Ajustez IMAP_FOLDER dans .env.`);
    }
    console.log();
  }
}

/**
 * Lit les nouveaux messages de la boite et les transforme en reponses
 * exploitables. N'ENVOIE AUCUN EMAIL et ne modifie jamais la boite.
 */
async function syncRepliesCommand(args: string[]) {
  title("LECTURE DES REPONSES");

  const status = imapStatus();
  if (!status.configured) {
    bad(`Configuration IMAP incomplete — manquant dans .env : ${status.missing.join(", ")}`);
    info("Verifiez d'abord la connexion : npm run amyn -- imap-check");
    console.log();
    return;
  }

  const maxArg = args.find((a) => a.startsWith("--max="));
  const max = maxArg ? Number.parseInt(maxArg.slice(6), 10) : undefined;

  info(`Boite ${status.user} · dossier ${status.folder} · lecture seule`);
  info("Aucune reponse automatique ne sera envoyee.");
  console.log();

  const report = await syncReplies(new ImapSource(), { max });

  if (report.error) {
    bad(`Lecture impossible : ${report.error}`);
    console.log();
    return;
  }

  ok(`${report.fetched} message(s) examine(s)`);
  ok(`${report.stored} reponse(s) enregistree(s)`);
  if (report.duplicates > 0) info(`${report.duplicates} deja traite(s) — aucun doublon cree`);
  if (report.skipped.length > 0) info(`${report.skipped.length} ignore(s) (nos propres envois)`);
  if (report.optOuts > 0) warn(`${report.optOuts} opposition(s) — adresse(s) ajoutee(s) a la liste noire`);
  if (report.needsHuman > 0) warn(`${report.needsHuman} necessitant votre intervention`);
  if (report.unmatched > 0) info(`${report.unmatched} expediteur(s) inconnu(s) — enregistres sans prospect`);

  if (report.outcomes.length > 0) {
    console.log();
    console.table(
      report.outcomes.slice(0, 25).map((o) => ({
        de: o.prospectName ?? "(inconnu)",
        classement: o.classification,
        confiance: o.confidence,
        action: o.recommendedAction,
        nouveau: o.duplicate ? "non" : "oui",
      })),
    );
  }
  console.log();
  info("Aucun email n'a ete envoye. Ouvrez /replies pour traiter les reponses.");
  console.log();
}

/** Etat du centre de tri des reponses. */
async function inbox() {
  const state = await replyInbox();
  title("CENTRE DE TRI DES REPONSES");
  console.log(`  total ${state.total} · nouvelles ${state.new} · action requise ${state.actionRequired} · traitees ${state.resolved}`);
  console.log(`  interesses ${state.interested} · oppositions ${state.optOuts} · intervention requise ${state.needsHuman} · non classees ${state.unknown}`);
  console.log(`  recues ces 7 derniers jours : ${state.last7Days}`);
  if (state.lastSyncAt) info(`derniere lecture de la boite : ${state.lastSyncAt.toISOString()}`);
  else info("la boite n'a jamais ete lue (npm run amyn -- sync-replies)");
  if (state.lastSyncError) bad(`derniere erreur : ${state.lastSyncError}`);
  console.log();
}

async function testEmail(args: string[]) {
  const to = args[0] ?? config.from.email;
  title(`TEST D'ENVOI vers ${to}`);
  const status = mailerStatus();
  info(`transport ${status.transport} · DRY_RUN ${status.dryRun}`);
  const result = await sendTestEmail(to);
  if (result.dryRun) warn("Simulé (DRY_RUN=true) — aucun email n'est parti.");
  else if (result.ok) ok(`Envoyé. Identifiant : ${result.messageId}`);
  else bad(`Échec : ${result.error}`);
  console.log();
}

async function reply(args: string[]) {
  const [email, ...bodyParts] = args;
  if (!email) { bad('Usage : npm run amyn -- reply <email> "texte de la réponse"'); return; }
  const contact = await prisma.contact.findFirst({ where: { email: email.toLowerCase() } });
  if (!contact) { bad(`Aucun prospect avec l'adresse ${email}.`); return; }
  const result = await recordReply({
    prospectId: contact.prospectId, fromEmail: email,
    subject: "(réponse saisie en ligne de commande)", body: bodyParts.join(" "),
  });
  title("RÉPONSE ENREGISTRÉE");
  ok(`Classée ${result.classification} (confiance ${result.confidence})`);
  info(result.reason);
  console.log();
}

async function client(args: string[]) {
  const [sub, ...rest] = args;

  if (sub === "list") {
    const clients = await prisma.client.findMany({
      include: { projects: { select: { id: true, phase: true } } },
      orderBy: { createdAt: "desc" },
    });
    title("CLIENTS");
    if (clients.length === 0) { info("Aucun client."); return; }
    console.table(clients.map((c) => ({
      entreprise: c.companyName, offre: c.offer, prix: `${c.offerPrice} €`,
      statut: c.status, phase: c.projects[0]?.phase ?? "—", projet: c.projects[0]?.id ?? "—",
    })));
    return;
  }

  if (sub === "project") {
    const [projectId] = rest;
    if (!projectId) { bad("Usage : npm run amyn -- client project <projectId>"); return; }
    const st = await projectStatus(projectId);
    title(`PROJET — ${st.project.name}`);
    info(`Phase ${st.project.phase} · ${st.tasksDone}/${st.tasksTotal} tâches (${st.progress} %)`);
    if (st.missingRequired.length > 0) {
      warn(`${st.missingRequired.length} information(s) obligatoire(s) manquante(s) :`);
      st.missingRequired.forEach((m) => info(`${m.key} — ${m.label}`));
    } else {
      ok("Toutes les informations obligatoires sont reçues.");
    }
    st.blocked.forEach((t) => warn(`Bloqué : ${t.title} — ${t.blockedReason ?? "raison non enregistrée"}`));
    console.log();
    return;
  }

  if (sub === "onboarding") {
    const [projectId, key, ...valueParts] = rest;
    const value = valueParts.join(" ");
    if (!projectId || !key || !value) {
      bad('Usage : npm run amyn -- client onboarding <projectId> <clé> "valeur"');
      return;
    }
    const result = await receiveOnboardingItem(projectId, key, value);
    title("ONBOARDING");
    ok(`${result.item.label} enregistré.`);
    if (result.readyToProduce) ok("Toutes les informations obligatoires sont réunies : la production peut démarrer.");
    else info(`Reste ${result.missing.length} information(s) obligatoire(s) : ${result.missing.map((m) => m.key).join(", ")}`);
    console.log();
    return;
  }

  if (sub === "advance") {
    const [projectId] = rest;
    if (!projectId) { bad("Usage : npm run amyn -- client advance <projectId>"); return; }
    const result = await advanceProject(projectId);
    title("AVANCEMENT DU PROJET");
    if (result.advanced) ok(`Nouvelle phase : ${result.phase}. ${result.reason}`);
    else warn(`Phase inchangée (${result.phase}). ${result.reason}`);
    console.log();
    return;
  }

  // Par defaut : creation d'un client.
  const [name, offer = "PREMIUM", email] = sub === "new" ? rest : args;
  if (!name) {
    bad('Usage : npm run amyn -- client "Nom entreprise" PREMIUM [email]');
    info("Autres : client list | client project <id> | client onboarding <id> <clé> \"valeur\" | client advance <id>");
    return;
  }
  title(`NOUVEAU CLIENT — ${name}`);
  const result = await createClientFromProspect({
    companyName: name,
    offer: offer as never,
    contactEmail: email,
  }).catch((error: unknown) => {
    bad(error instanceof Error ? error.message : String(error));
    info('Si le prospect n\'a pas d\'email connu, passez-le : client "Nom" PREMIUM contact@exemple.fr');
    return null;
  });
  if (!result) return;
  if (!result.created) { warn("Ce client existe déjà."); return; }
  ok(`Client créé : ${result.client.companyName} — ${result.client.offer} (${result.client.offerPrice} €)`);
  const tasks = await prisma.task.count({ where: { projectId: result.project!.id } });
  const missing = await prisma.onboardingItem.count({ where: { projectId: result.project!.id, required: true } });
  ok(`Projet créé avec ${tasks} tâche(s)`);
  ok(`${missing} information(s) à demander au client`);
  info(`Suivi : npm run amyn -- client project ${result.project!.id}`);
  console.log();
}

async function optout(args: string[]) {
  const [email] = args;
  if (!email) { bad("Usage : npm run amyn -- optout <email>"); return; }
  await addToSuppressionList({ email, reason: "MANUAL", source: "Ligne de commande" });
  title("LISTE D'OPPOSITION");
  ok(`${email} ajouté. Ne sera plus jamais contacté.`);
  console.log();
}

async function rules() {
  title(`RÈGLES D'AUDIT — ${ALL_RULES.length}`);
  console.table(ALL_RULES.map((r) => ({ id: r.id, catégorie: r.category, libellé: r.label })));
}

function help() {
  title("AMYN OUTREACH — commandes");
  console.log(`
  ${C.bold}Instruction en langage naturel${C.reset}
    npm run amyn -- "Trouve 20 coiffeurs à Roubaix"
    npm run amyn -- "Audite les prospects"
    npm run amyn -- "Prépare une campagne pour les restaurants à Lille"
    npm run amyn -- "Vérifie les nouvelles réponses"
    npm run amyn -- "Nouveau client. Entreprise : Salon Éclat. Offre : PREMIUM"

  ${C.bold}Commandes directes${C.reset}
    status                     état du pipeline
    doctor                     diagnostic de configuration
    audit [id|--all]           lancer les audits
    contacts [n]               chercher les emails publics
    score [n]                  calculer les scores
    draft [n]                  rédiger les emails
    campaign list              lister les campagnes
    campaign approve <slug>    approuver les emails d'une campagne
    campaign send <slug>       envoyer (simulé si DRY_RUN=true)
    smtp-check                 vérifier la connexion SMTP (sans rien envoyer)
    imap-check                 vérifier la connexion IMAP (sans rien lire)
    sync-replies [--max=N]     lire les nouvelles réponses de la boîte
    inbox                      état du centre de tri des réponses
    test-email <adresse>       envoyer un email de test (simulé si DRY_RUN=true)
    reply <email> "<texte>"    enregistrer et classer une réponse à la main
    client "<nom>" <OFFRE> [email]
                               créer un dossier client
    client list                lister les clients et leurs projets
    client project <id>        avancement, blocages, informations manquantes
    client onboarding <id> <clé> "<valeur>"
                               enregistrer une information client
    client advance <id>        passer le projet à la phase suivante
    optout <email>             ajouter à la liste d'opposition
    rules                      lister les règles d'audit

  Démonstration
    npm run demo               rejoue tout le parcours sur une base jetable
`);
}

main()
  .catch((err) => { console.error(`\n${C.red}Erreur :${C.reset} ${err.message}\n`); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
