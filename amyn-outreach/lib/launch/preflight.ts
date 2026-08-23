// ---------------------------------------------------------------------------
// CONTRÔLE AVANT LANCEMENT RÉEL
//
// Un seul endroit qui répond à la question : « peut-on envoyer pour de vrai,
// maintenant, sans risque de bêtise ? »
//
// Le principe est celui d'une checklist d'avant décollage : chaque point est
// vérifié séparément, et un seul point rouge empêche le départ. Mieux vaut
// refuser un envoi légitime que laisser partir une campagne mal configurée —
// une réputation de domaine se perd en une journée et se reconstruit en mois.
// ---------------------------------------------------------------------------

import { prisma } from "@/lib/db";
import { config } from "@/lib/config";
import { readSmtpConfig } from "@/lib/mailer";
import { imapStatus } from "@/lib/imap/config";
import { getPolicy, checkSendWindow, remainingToday, type Policy } from "@/lib/policy";

export type CheckLevel = "OK" | "WARN" | "BLOCK";

export type PreflightCheck = {
  id: string;
  label: string;
  level: CheckLevel;
  detail: string;
  /** Ce qu'il faut faire quand ce n'est pas au vert. */
  fix?: string;
};

export type Preflight = {
  /** Un envoi réel est-il possible en l'état ? */
  canSendForReal: boolean;
  /** Le système est-il cohérent, même en simulation ? */
  coherent: boolean;
  mode: "SIMULATION" | "RÉEL";
  checks: PreflightCheck[];
  blockers: PreflightCheck[];
  warnings: PreflightCheck[];
  summary: string;
};

/** Le premier envoi réel doit rester petit. Au-delà, on refuse. */
export const PILOT_MAX_PROSPECTS = 5;
/** Tant que ce nombre d'envois réels n'est pas atteint, on est en phase pilote. */
export const PILOT_THRESHOLD = 20;

export async function preflight(): Promise<Preflight> {
  const policy = await getPolicy();
  const checks: PreflightCheck[] = [];

  // === 1. VERROU PRINCIPAL ================================================
  checks.push(
    config.dryRun
      ? {
          id: "dry_run",
          label: "Mode d'envoi",
          level: "OK",
          detail: "DRY_RUN=true — les emails sont simulés et journalisés. Rien ne peut partir.",
        }
      : {
          id: "dry_run",
          label: "Mode d'envoi",
          level: "WARN",
          detail: "DRY_RUN=false — les envois réels sont autorisés.",
          fix: "Repasser à DRY_RUN=true dans .env pour revenir en simulation.",
        },
  );

  // === 2. TRANSPORT =======================================================
  const smtp = readSmtpConfig();
  const transportCoherent = config.mailTransport === "smtp" || config.mailTransport === "dry-run";

  if (!transportCoherent) {
    checks.push({
      id: "transport",
      label: "Transport",
      level: "BLOCK",
      detail: `MAIL_TRANSPORT="${config.mailTransport}" est inconnu.`,
      fix: 'Valeurs acceptées : "dry-run" ou "smtp".',
    });
  } else if (config.mailTransport === "smtp" && smtp.missing.length > 0) {
    checks.push({
      id: "transport",
      label: "Transport",
      level: "BLOCK",
      detail: `MAIL_TRANSPORT=smtp mais la configuration est incomplète : ${smtp.missing.join(", ")}.`,
      fix: "Renseigner ces variables dans .env, puis : npm run amyn -- smtp-check",
    });
  } else if (config.mailTransport === "smtp") {
    checks.push({
      id: "transport",
      label: "Transport",
      level: "OK",
      detail: `SMTP configuré (${process.env.SMTP_HOST}:${smtp.config?.port}).`,
    });
  } else {
    checks.push({
      id: "transport",
      label: "Transport",
      level: !config.dryRun ? "BLOCK" : "OK",
      detail: !config.dryRun
        ? 'DRY_RUN=false mais MAIL_TRANSPORT="dry-run" : configuration incohérente, rien ne partirait.'
        : 'Transport "dry-run" — cohérent avec le mode simulation.',
      fix: !config.dryRun ? "Passer MAIL_TRANSPORT=smtp, ou remettre DRY_RUN=true." : undefined,
    });
  }

  // === 3. EXPÉDITEUR ======================================================
  const from = config.from.email;
  const smtpUser = process.env.SMTP_USER;
  if (!/^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/.test(from)) {
    checks.push({
      id: "from",
      label: "Adresse d'expédition",
      level: "BLOCK",
      detail: `MAIL_FROM_EMAIL="${from}" n'est pas une adresse valide.`,
      fix: "Corriger MAIL_FROM_EMAIL dans .env.",
    });
  } else if (smtpUser && smtpUser.toLowerCase() !== from.toLowerCase()) {
    // Envoyer depuis une adresse différente de celle authentifiée fait
    // échouer SPF/DKIM chez la plupart des hébergeurs.
    checks.push({
      id: "from",
      label: "Adresse d'expédition",
      level: "BLOCK",
      detail: `L'expéditeur (${from}) diffère du compte SMTP (${smtpUser}) : les vérifications SPF/DKIM échoueront.`,
      fix: "Aligner MAIL_FROM_EMAIL et SMTP_USER sur la même adresse.",
    });
  } else {
    checks.push({
      id: "from",
      label: "Adresse d'expédition",
      level: "OK",
      detail: `${config.from.name} <${from}>${smtpUser ? " — alignée sur le compte SMTP." : ""}`,
    });
  }

  // === 4. RÉCEPTION =======================================================
  const imap = imapStatus();
  checks.push(
    imap.configured
      ? {
          id: "imap",
          label: "Lecture des réponses",
          level: "OK",
          detail: `IMAP configuré (${imap.host}), boîte ${imap.user}, dossier ${imap.folder}.`,
        }
      : {
          id: "imap",
          label: "Lecture des réponses",
          level: !config.dryRun ? "BLOCK" : "WARN",
          detail: !config.dryRun
            ? `Envoi réel sans lecture des réponses : une opposition ne serait jamais vue. Manquant : ${imap.missing.join(", ")}.`
            : `IMAP non configuré (${imap.missing.join(", ")}). Les réponses devront être saisies à la main.`,
          fix: "Renseigner IMAP_HOST, IMAP_USER, IMAP_PASSWORD, puis : npm run amyn -- imap-check",
        },
  );

  // === 5. POLITIQUE COHÉRENTE =============================================
  const incoherences = verifierPolitique(policy);
  checks.push(
    incoherences.length === 0
      ? {
          id: "policy",
          label: "Politique d'envoi",
          level: "OK",
          detail:
            `${policy.dailyLimit} envois/jour · ${policy.minDelaySeconds} s entre deux · ` +
            `fenêtre ${policy.sendWindowStartHour}–${policy.sendWindowEndHour} h · ` +
            `${policy.maxFollowUps} relance(s) max.`,
        }
      : {
          id: "policy",
          label: "Politique d'envoi",
          level: "BLOCK",
          detail: incoherences.join(" "),
          fix: "Corriger avec : npm run amyn -- policy <clé> <valeur>",
        },
  );

  // === 6. VOLUME DU PREMIER LANCEMENT =====================================
  const envoisReels = await prisma.sendLog.count({ where: { status: "SENT" } });
  const enPhasePilote = envoisReels < PILOT_THRESHOLD;

  if (enPhasePilote && policy.dailyLimit > PILOT_MAX_PROSPECTS && !config.dryRun) {
    checks.push({
      id: "pilot_volume",
      label: "Volume de démarrage",
      level: "BLOCK",
      detail:
        `Seulement ${envoisReels} envoi(s) réel(s) à ce jour, mais le plafond est à ${policy.dailyLimit}. ` +
        `Tant que ${PILOT_THRESHOLD} envois réels ne sont pas atteints, le plafond doit rester à ${PILOT_MAX_PROSPECTS} ou moins.`,
      fix: `npm run amyn -- policy dailyLimit ${PILOT_MAX_PROSPECTS}`,
    });
  } else {
    checks.push({
      id: "pilot_volume",
      label: "Volume de démarrage",
      level: "OK",
      detail: enPhasePilote
        ? `Phase pilote : ${envoisReels}/${PILOT_THRESHOLD} envois réels, plafond ${policy.dailyLimit}.`
        : `Phase pilote terminée (${envoisReels} envois réels). Le volume peut être augmenté progressivement.`,
    });
  }

  // === 7. RÉPONSE AUTOMATIQUE =============================================
  checks.push(
    policy.autoReplyEnabled
      ? {
          id: "auto_reply",
          label: "Réponse automatique",
          level: "WARN",
          detail: "Activée : l'agent peut répondre seul aux cas nets et à confiance haute.",
          fix: "npm run amyn -- policy autoReplyEnabled false",
        }
      : {
          id: "auto_reply",
          label: "Réponse automatique",
          level: "OK",
          detail: "Désactivée : toute réponse rédigée attend votre validation.",
        },
  );

  // === 8. TEST D'ENVOI PRÉALABLE ==========================================
  const testFait = await prisma.activityLog.findFirst({
    where: { action: "send.test" },
    orderBy: { createdAt: "desc" },
  });
  if (!config.dryRun && !testFait) {
    checks.push({
      id: "test_send",
      label: "Test d'envoi",
      level: "BLOCK",
      detail: "Aucun email de test n'a jamais été envoyé depuis cette installation.",
      fix: "npm run amyn -- test-email contact@amyn.agency",
    });
  } else {
    checks.push({
      id: "test_send",
      label: "Test d'envoi",
      level: testFait ? "OK" : "WARN",
      detail: testFait
        ? `Dernier test : ${testFait.createdAt.toLocaleString("fr-FR")}.`
        : "Aucun test effectué — à faire avant le premier envoi réel.",
      fix: testFait ? undefined : "npm run amyn -- test-email contact@amyn.agency",
    });
  }

  // === 9. FENÊTRE ET QUOTA (informatif) ===================================
  const fenetre = checkSendWindow(policy);
  const quota = await remainingToday(policy);
  checks.push({
    id: "window",
    label: "Fenêtre et quota",
    level: fenetre.open ? "OK" : "WARN",
    detail:
      `${fenetre.reason} Quota du jour : ${quota.used}/${policy.dailyLimit}, ` +
      `${quota.remaining} envoi(s) restant(s).`,
  });

  // === 10. LISTE D'OPPOSITION OPÉRATIONNELLE ==============================
  // Vérifie que le mécanisme répond, pas qu'il contient quelque chose.
  const oppositions = await prisma.suppression.count();
  checks.push({
    id: "suppression",
    label: "Liste d'opposition",
    level: "OK",
    detail: `${oppositions} adresse(s) ou domaine(s) exclus. Le contrôle s'applique avant chaque envoi.`,
  });

  const blockers = checks.filter((c) => c.level === "BLOCK");
  const warnings = checks.filter((c) => c.level === "WARN");
  const coherent = blockers.length === 0;
  const canSendForReal =
    coherent && !config.dryRun && config.mailTransport === "smtp" && smtp.missing.length === 0;

  const summary = !coherent
    ? `${blockers.length} point(s) bloquant(s) : ${blockers.map((b) => b.label.toLowerCase()).join(", ")}.`
    : canSendForReal
      ? `Configuration cohérente. Envoi réel POSSIBLE${warnings.length > 0 ? ` (${warnings.length} avertissement(s))` : ""}.`
      : `Configuration cohérente. Envoi réel impossible : ${config.dryRun ? "DRY_RUN=true" : "SMTP non configuré"}.`;

  return { canSendForReal, coherent, mode: config.dryRun ? "SIMULATION" : "RÉEL", checks, blockers, warnings, summary };
}

/** Une politique incohérente est refusée avant tout envoi. */
function verifierPolitique(p: Policy): string[] {
  const erreurs: string[] = [];

  if (p.dailyLimit < 1) erreurs.push("Le plafond quotidien doit être d'au moins 1.");
  if (p.dailyLimit > 200) {
    erreurs.push(`Plafond de ${p.dailyLimit}/jour : au-delà de 200, la réputation du domaine ne tient pas.`);
  }
  if (p.minDelaySeconds < 30) {
    erreurs.push(`Délai de ${p.minDelaySeconds} s entre deux envois : en dessous de 30 s, c'est une rafale.`);
  }
  if (p.sendWindowStartHour >= p.sendWindowEndHour) {
    erreurs.push(
      `Fenêtre d'envoi vide : ouverture ${p.sendWindowStartHour} h, fermeture ${p.sendWindowEndHour} h.`,
    );
  }
  if (p.sendWindowStartHour < 0 || p.sendWindowEndHour > 24) {
    erreurs.push("Les heures de fenêtre doivent rester entre 0 et 24.");
  }
  if (p.maxFollowUps > 4) {
    erreurs.push(`${p.maxFollowUps} relances : au-delà de 4, c'est du harcèlement.`);
  }
  if (p.followUpDelayDays < 2) {
    erreurs.push(`Relance après ${p.followUpDelayDays} jour(s) : trop tôt, laissez au moins 2 jours.`);
  }
  if (p.recontactCooldownDays < 30) {
    erreurs.push(`Recontact après ${p.recontactCooldownDays} jours : laissez au moins 30 jours.`);
  }

  return erreurs;
}
