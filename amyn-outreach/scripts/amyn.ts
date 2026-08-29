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
    case "preflight": return preflightCommand();
    case "pilot": case "pilote": return pilotCommand(rest);
    case "report": case "rapport": return reportCommand(rest);
    case "dns": case "dns-check": return dnsCommand(rest);
    case "mission": return missionCommand(rest);
    case "territory": case "territoire": return territoryCommand(rest);
    case "national": return nationalCommand();
    case "backfill-keys": return backfillCommand();
    case "sirene-live": return sireneLiveCommand(rest);
    case "tick": case "worker": return tickCommand();
    case "policy": return policyCommand(rest);
    case "qualify": return qualifyCommand(rest);
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
/** Controle complet avant tout envoi reel. */
async function preflightCommand() {
  const { preflight } = await import("../lib/launch/preflight");
  const r = await preflight();

  title(`CONTRÔLE AVANT LANCEMENT — mode ${r.mode}`);
  console.log();

  for (const c of r.checks) {
    const marque = c.level === "OK" ? ok : c.level === "WARN" ? warn : bad;
    marque(`${c.label.padEnd(26)} ${c.detail}`);
    if (c.fix) info(`→ ${c.fix}`);
  }

  console.log();
  if (!r.coherent) {
    bad(r.summary);
    console.log(`\n  ${C.red}${C.bold}ENVOI RÉEL IMPOSSIBLE : configuration incohérente.${C.reset}`);
  } else if (r.canSendForReal) {
    ok(r.summary);
    console.log(`\n  ${C.amber}${C.bold}ENVOI RÉEL POSSIBLE. Chaque email passera malgré tout les 13 contrôles de conformité.${C.reset}`);
  } else {
    ok(r.summary);
    console.log(`\n  ${C.green}${C.bold}Mode simulation : aucun email ne peut partir.${C.reset}`);
  }
  console.log();
}

/** Prepare une campagne pilote : petit volume, plafond en dur. */
async function pilotCommand(args: string[]) {
  const { preparePilot } = await import("../lib/launch/pilot");
  const { PILOT_MAX_PROSPECTS } = await import("../lib/launch/preflight");

  const maxArg = args.find((a) => a.startsWith("--max="));
  const villeArg = args.find((a) => a.startsWith("--ville="));
  const secteurArg = args.find((a) => a.startsWith("--secteur="));

  title("CAMPAGNE PILOTE");
  info(`Plafond en dur : ${PILOT_MAX_PROSPECTS} prospects maximum, quelle que soit la configuration.`);
  console.log();

  const plan = await preparePilot({
    max: maxArg ? Number.parseInt(maxArg.slice(6), 10) : undefined,
    city: villeArg?.slice(8),
    sector: secteurArg?.slice(10),
  });

  plan.blockers.forEach((b) => bad(b));
  plan.warnings.forEach((w) => warn(w));

  if (!plan.ok) {
    console.log();
    bad(plan.summary);
    plan.nextSteps.forEach((n) => info(n));
    console.log();
    return;
  }

  console.log();
  ok(plan.summary);
  console.log();
  console.table(
    plan.selected.map((s) => ({ entreprise: s.name, ville: s.city, email: s.email, score: s.score ?? "—" })),
  );
  if (plan.rejected.length > 0) {
    info(`${plan.rejected.length} prospect(s) écarté(s) :`);
    plan.rejected.slice(0, 5).forEach((r) => info(`  ${r.name} — ${r.reason.slice(0, 80)}`));
  }

  console.log(`\n  ${C.bold}Étapes suivantes${C.reset}`);
  plan.nextSteps.forEach((n, i) => console.log(`  ${i + 1}. ${n}`));
  console.log();
}

/** Rapport chiffre, sans metrique inventee. */
async function reportCommand(args: string[]) {
  const { buildReport } = await import("../lib/reporting");
  const joursArg = args.find((a) => a.startsWith("--jours="));
  const jours = joursArg ? Number.parseInt(joursArg.slice(8), 10) : undefined;
  const depuis = jours ? new Date(Date.now() - jours * 86400000) : undefined;

  const r = await buildReport({ depuis });
  const t = (x: { value: number | null; numerator: number; denominator: number }) =>
    x.value === null ? "indisponible" : `${x.value} % (${x.numerator}/${x.denominator})`;

  title(`RAPPORT — ${r.periode.libelle}`);

  console.log(`\n  ${C.bold}Prospection${C.reset}`);
  console.log(`    trouvés ${r.prospection.trouves} · qualifiés ${r.prospection.qualifies} · à trancher ${r.prospection.aTrancher} · écartés ${r.prospection.ecartes}`);
  console.log(`    avec email ${r.prospection.avecEmail} · taux de qualification ${t(r.prospection.tauxQualification)}`);

  console.log(`\n  ${C.bold}Envois${C.reset}`);
  console.log(`    préparés ${r.envois.prepares} · en attente d'approbation ${r.envois.enAttenteApprobation}`);
  console.log(`    RÉELS ${r.envois.reels} · simulés ${r.envois.simules} · bloqués ${r.envois.bloques} · échecs ${r.envois.echecs}`);

  console.log(`\n  ${C.bold}Réponses${C.reset}`);
  console.log(`    total ${r.reponses.total} · positives ${r.reponses.positives} · rendez-vous ${r.reponses.rendezVous} · questions ${r.reponses.questions}`);
  console.log(`    oppositions ${r.reponses.optOuts} · intervention requise ${r.reponses.needsHuman}`);
  console.log(`    taux de réponse ${t(r.reponses.tauxReponse)} · positif ${t(r.reponses.tauxPositif)} · opposition ${t(r.reponses.tauxOptOut)}`);

  console.log(`\n  ${C.bold}Relances${C.reset}`);
  console.log(`    préparées ${r.relances.preparees} · envoyées ${r.relances.envoyees} · prospects relançables ${r.relances.prospectsRelancables}`);

  console.log(`\n  ${C.bold}Conversion${C.reset}`);
  console.log(`    clients ${r.conversion.clients} · CA signé ${r.conversion.caSigne} € · taux ${t(r.conversion.tauxConversion)}`);

  console.log(`\n  ${C.bold}Santé${C.reset}`);
  console.log(`    erreurs 24 h ${r.sante.erreurs24h} · rebonds ${r.sante.rebonds} ${t(r.sante.tauxRebond)} · jobs en échec ${r.sante.jobsEnEchec}`);
  console.log(`    dernier tour : ${r.sante.dernierTour ? r.sante.dernierTour.toLocaleString("fr-FR") : "jamais"}`);

  console.log(`\n  ${C.bold}Ce que ce rapport ne peut pas dire${C.reset}`);
  r.nonMesure.forEach((n) => info(n));
  console.log();
}

/** Verifie SPF, DKIM et DMARC sur le domaine d'expedition. */
async function dnsCommand(args: string[]) {
  const { checkDeliverability } = await import("../lib/deliverability");
  const domaine = args[0] ?? config.from.email.split("@")[1];

  title(`DÉLIVRABILITÉ — ${domaine}`);
  info("Interrogation DNS en cours…");
  console.log();

  const r = await checkDeliverability(domaine);
  for (const c of r.checks) {
    const marque = c.status === "OK" ? ok : c.status === "WARN" ? warn : bad;
    marque(`${c.label.padEnd(28)} ${c.detail}`);
    c.found.forEach((f) => info(f.slice(0, 110)));
    if (c.fix) {
      info(`À POSER — hôte : ${c.fix.host}`);
      info(`          type : ${c.fix.type}`);
      info(`         valeur : ${c.fix.value}`);
    }
  }

  console.log();
  (r.ready ? ok : warn)(r.summary);
  console.log(`\n  ${C.dim}${r.disclaimer}${C.reset}`);
  console.log();
}

/** Lance une mission de prospection complete. S'arrete avant l'envoi. */
async function missionCommand(args: string[]) {
  const brief = args.join(" ");
  if (!brief) {
    bad('Usage : npm run amyn -- mission "Prospecte les coiffeurs à Lille"');
    return;
  }

  const { parseInstruction } = await import("../lib/agent/intents");
  const { runMission } = await import("../lib/operator/mission");
  const parsed = parseInstruction(brief);

  title("MISSION DE PROSPECTION");
  info(`« ${brief} »`);
  console.log();

  const result = await runMission({
    brief,
    city: parsed.parameters.city as string | undefined,
    sectors: parsed.parameters.sectors as string[] | undefined,
    limit: parsed.parameters.limit as number | undefined,
  });

  for (const step of result.steps) {
    const marque = step.status === "FAILED" ? bad : step.status === "SKIPPED" ? warn : ok;
    marque(`${step.stage.padEnd(9)} ${step.description}`);
    info(step.detail);
  }

  console.log();
  console.log(`  ${C.bold}${result.summary}${C.reset}`);

  if (result.needsFromYou.length > 0) {
    console.log(`\n  ${C.amber}${C.bold}Ce que l'opérateur attend de vous${C.reset}`);
    result.needsFromYou.forEach((n) => console.log(`  → ${n}`));
  }
  info(`\nTrace : Mission ${result.missionId}`);
  console.log();
}

/** Un tour complet de l'operateur : boite, decisions, relances dues, maintenance. */
async function tickCommand() {
  const { runAllJobs } = await import("../lib/scheduler/jobs");
  title("TOUR D'OPÉRATEUR");
  info("Lecture, décisions et préparation. Aucun email n'est envoyé.");
  console.log();

  for (const r of await runAllJobs()) {
    if (r.skipped) warn(`${r.job.padEnd(16)} ignoré — ${r.summary}`);
    else if (r.error) bad(`${r.job.padEnd(16)} ${r.summary}`);
    else ok(`${r.job.padEnd(16)} ${r.summary}`);
  }
  console.log();
}

/** Consulte ou modifie la politique d'envoi. */
async function policyCommand(args: string[]) {
  const { getPolicy, setPolicy, POLICY_LABELS, POLICY_DEFAULTS, checkSendWindow, remainingToday } =
    await import("../lib/policy");
  const [cle, valeur] = args;

  if (cle && valeur !== undefined) {
    if (!(cle in POLICY_DEFAULTS)) {
      bad(`Réglage inconnu : ${cle}`);
      info(`Réglages : ${Object.keys(POLICY_DEFAULTS).join(", ")}`);
      return;
    }
    const attendu = POLICY_DEFAULTS[cle as keyof typeof POLICY_DEFAULTS];
    const converti = typeof attendu === "boolean" ? valeur === "true" : Number.parseInt(valeur, 10);
    await setPolicy(cle as never, converti as never);
    ok(`${POLICY_LABELS[cle as keyof typeof POLICY_LABELS].label} → ${converti}`);
    return;
  }

  const policy = await getPolicy();
  title("POLITIQUE D'ENVOI");
  console.table(
    Object.entries(policy).map(([k, v]) => ({
      réglage: POLICY_LABELS[k as keyof typeof POLICY_LABELS].label,
      valeur: String(v),
      défaut: String(POLICY_DEFAULTS[k as keyof typeof POLICY_DEFAULTS]),
      clé: k,
    })),
  );
  const fenetre = checkSendWindow(policy);
  const quota = await remainingToday(policy);
  info(fenetre.open ? `Fenêtre ouverte. ${fenetre.reason}` : `Fenêtre FERMÉE. ${fenetre.reason}`);
  info(`Quota du jour : ${quota.used}/${policy.dailyLimit} utilisé(s), ${quota.remaining} restant(s).`);
  info('Modifier : npm run amyn -- policy dailyLimit 25');
  console.log();
}

/** Qualifie un ou tous les prospects. */
async function qualifyCommand(args: string[]) {
  const { qualifyProspect } = await import("../lib/qualification");
  const cible = args[0];

  const prospects = cible && cible !== "--all"
    ? await prisma.prospect.findMany({ where: { id: cible } })
    : await prisma.prospect.findMany({ where: { isDemo: false }, take: 100 });

  if (prospects.length === 0) { bad("Aucun prospect à qualifier."); return; }

  title(`QUALIFICATION — ${prospects.length} prospect(s)`);
  const lignes = [];
  for (const p of prospects) {
    const q = await qualifyProspect(p.id);
    lignes.push({ entreprise: p.name, verdict: q.verdict, raison: q.summary.slice(0, 70) });
  }
  console.table(lignes);
  console.log();
}

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


// --- PROSPECTION NATIONALE --------------------------------------------------

function option(args: string[], nom: string): string | undefined {
  const trouve = args.find((a) => a.startsWith(`--${nom}=`));
  return trouve?.split("=").slice(1).join("=") || undefined;
}

function listeOption(args: string[], nom: string): string[] | undefined {
  const brut = option(args, nom);
  if (!brut) return undefined;
  return brut.split(",").map((v) => v.trim()).filter(Boolean);
}

async function territoryCommand(args: string[]) {
  const [sous, ...rest] = args;

  if (sous === "plan") {
    const { planTerritories } = await import("../lib/territory");
    title("PLANIFICATION DU BALAYAGE NATIONAL");

    const source = (option(rest, "source") ?? "ANNUAIRE").toUpperCase() as "ANNUAIRE" | "SIRENE";
    const zones = listeOption(rest, "zone") ?? listeOption(rest, "dept");
    const secteurs = listeOption(rest, "secteur");

    const plan = await planTerritories({ zones, secteurs, source });

    for (const note of plan.notes) info(note);
    console.log();
    ok(`${plan.created} territoire(s) créé(s)`);
    info(`${plan.existing} déjà connu(s) — leur avancement est conservé.`);
    console.log();
    info("Rien n'a été interrogé : la planification n'appelle aucune API.");
    info("Lancer le balayage : npm run amyn -- territory sweep");
    return;
  }

  if (sous === "status" || sous === undefined) {
    const { territoryProgress } = await import("../lib/territory");
    const { prisma: db } = await import("../lib/db");
    title("AVANCEMENT DU BALAYAGE NATIONAL");

    const p = await territoryProgress();
    if (p.total === 0) {
      warn("Aucun territoire planifié.");
      info("npm run amyn -- territory plan");
      return;
    }

    console.log(`  ${C.bold}${p.termines}${C.reset} / ${p.total} territoire(s) — ${p.progression}%`);
    console.log();
    for (const [statut, n] of Object.entries(p.parStatut).sort()) {
      const ligne = `${statut.padEnd(10)} ${String(n).padStart(6)}`;
      if (statut === "SATURATED" || statut === "FAILED") warn(ligne);
      else info(ligne);
    }
    console.log();
    console.log(`  Découvertes : ${p.decouvertes.discovered} vue(s), ${p.decouvertes.created} nouvelle(s), ${p.decouvertes.duplicates} doublon(s).`);

    const limite = Number(option(rest, "limite") ?? 12);
    const actifs = await db.territory.findMany({
      where: { OR: [{ status: "SATURATED" }, { status: "FAILED" }, { discovered: { gt: 0 } }] },
      orderBy: [{ status: "asc" }, { discovered: "desc" }],
      take: limite,
    });

    if (actifs.length > 0) {
      console.log();
      console.log(`  ${C.dim}territoire / secteur — statut — reprise — découvertes${C.reset}`);
      for (const t of actifs) {
        const ligne =
          `${t.label} / ${t.sectorLabel} — ${t.status} — page ${t.nextPage} — ` +
          `${t.discovered} vue(s), ${t.created} nouvelle(s)`;
        if (t.status === "SATURATED") warn(`${ligne}  [id ${t.id}]`);
        else if (t.status === "FAILED") bad(`${ligne} — ${t.lastError ?? ""}`);
        else info(ligne);
      }
    }
    return;
  }

  if (sous === "sweep") {
    const { sweepBatch } = await import("../lib/territory/sweep");
    title("BALAYAGE — reprise depuis les points de sauvegarde");

    const maxTerritories = Number(option(rest, "territoires") ?? 3);
    const maxPages = Number(option(rest, "pages") ?? 4);

    info(`${maxTerritories} territoire(s), ${maxPages} page(s) chacun au maximum.`);
    info("Découverte seule : aucune qualification, aucun email, aucun envoi.");
    console.log();

    const { results, summary } = await sweepBatch({ maxTerritories, maxPages });
    for (const r of results) {
      if (r.error) bad(r.summary);
      else if (r.status === "SATURATED") warn(r.summary);
      else ok(r.summary);
    }
    console.log();
    console.log(`  ${summary}`);
    return;
  }

  if (sous === "subdivide") {
    const { subdivideTerritory } = await import("../lib/territory/sweep");
    const id = rest[0];
    if (!id) { bad("Indiquez l'identifiant du territoire à subdiviser."); return; }
    title("SUBDIVISION D'UN TERRITOIRE SATURÉ");
    const r = await subdivideTerritory(id);
    ok(`${r.created} sous-territoire(s) créé(s).`);
    info(r.note);
    return;
  }

  bad(`Sous-commande inconnue : ${sous}`);
  info("plan | status | sweep | subdivide");
}

async function backfillCommand() {
  const { backfillIdentities } = await import("../lib/dedup");
  title("RATTRAPAGE DES CLÉS DE DÉDUPLICATION");
  info("Les prospects créés avant l'introduction des clés en reçoivent une.");
  info("Traitement par lots : la base n'est jamais chargée en entier.");
  console.log();

  const r = await backfillIdentities();
  ok(`${r.updated} prospect(s) mis à jour sur ${r.examined} examiné(s).`);
  if (r.collisions > 0) {
    warn(`${r.collisions} collision(s) : deux prospects historiques portent la même clé.`);
    info("Aucun n'a été supprimé — fusionner ou écarter reste votre décision.");
  }
}

async function nationalCommand() {
  const { nationalReport } = await import("../lib/reporting/national");
  title("PROSPECTION NATIONALE — TABLEAU DE BORD");

  const rapport = await nationalReport();

  for (const groupe of rapport.groups) {
    console.log(`\n  ${C.bold}${groupe.title}${C.reset}`);
    if (groupe.note) info(groupe.note);
    for (const m of groupe.metrics) {
      if (m.value === null) {
        console.log(`    ${C.dim}${m.label.padEnd(38)}${C.reset} ${C.amber}non mesuré${C.reset}`);
        if (m.indisponible) info(`  ${m.indisponible}`);
      } else {
        console.log(`    ${m.label.padEnd(38)} ${C.bold}${String(m.value).padStart(8)}${C.reset}`);
        if (m.detail) info(`  ${m.detail}`);
      }
    }
  }

  if (rapport.alerts.length > 0) {
    console.log();
    title("À VOTRE ATTENTION");
    for (const a of rapport.alerts) warn(a);
  }

  console.log();
  info(`${rapport.demoExclus} prospect(s) de démonstration exclus de tous les comptages.`);
}

async function sireneLiveCommand(args: string[]) {
  const { runSireneLive } = await import("../lib/research/sirene/live-check");
  title("SIRENE — TEST CONTRE L'API RÉELLE");

  const resultat = await runSireneLive({ departement: option(args, "dept") ?? "59" });

  if (!resultat.cleDisponible) {
    warn("SIRENE_API_KEY absente : aucun appel réel n'a été tenté.");
    info("Créer la clé sur portail-api.insee.fr, puis la renseigner dans .env.");
    info("La clé n'est jamais affichée, ni journalisée, ni versionnée.");
    return;
  }

  for (const c of resultat.checks) {
    if (c.ok) ok(`${c.label} — ${c.detail}`);
    else bad(`${c.label} — ${c.detail}`);
  }
  console.log();
  const reussis = resultat.checks.filter((c) => c.ok).length;
  console.log(`  ${reussis}/${resultat.checks.length} vérification(s) réussie(s).`);
}

function help() {
  title("AMYN OUTREACH — commandes");
  console.log(`
  ${C.bold}Instruction en langage naturel${C.reset}
    npm run amyn -- "Trouve 20 coiffeurs à Roubaix"
    npm run amyn -- "Audite les prospects"
    npm run amyn -- "Prépare une campagne pour les restaurants à Lille"
    npm run amyn -- "Prospecte les coiffeurs à Lille"
    npm run amyn -- "Fais un tour"
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
  ${C.bold}Lancement réel${C.reset}
    preflight                  contrôle complet avant tout envoi réel
    pilot [--max=N --ville=X]  préparer une campagne pilote (5 prospects max)
    dns [domaine]              vérifier SPF, DKIM, DMARC
    report [--jours=N]         rapport chiffré

  ${C.bold}Prospection nationale${C.reset}
    territory plan [--zone=X] [--secteur=Y] [--source=ANNUAIRE|SIRENE]
                               planifier le balayage (France entière par défaut)
    territory status [--limite=N]
                               avancement, points de reprise, saturations
    territory sweep [--territoires=N --pages=N]
                               avancer le balayage depuis les checkpoints
    territory subdivide <id>   découper un territoire saturé
    national                   tableau de bord national
    backfill-keys              recalculer les clés de déduplication manquantes
    sirene-live [--dept=59]    test réel de l'API Sirene (nécessite la clé)

  ${C.bold}Opérateur${C.reset}
    mission "<instruction>"    mission complète : recherche → qualification →
                               audit → contact → score → rédaction → campagne
    tick                       un tour : boîte, décisions, relances, maintenance
    qualify [id|--all]         qualifier des prospects
    policy [clé valeur]        voir ou modifier la politique d'envoi

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
