// ---------------------------------------------------------------------------
// POLITIQUE D'ENVOI — un seul endroit pour toutes les règles de cadence
//
// Avant ce module, les limites vivaient dans lib/config.ts (donc dans .env,
// donc modifiables seulement au redémarrage). Elles sont désormais lues depuis
// la table Setting, avec .env comme valeur de repli : on peut ajuster la
// cadence à chaud, sans redéploiement.
//
// CE MODULE NE DÉCIDE JAMAIS D'ENVOYER. Il dit ce que la politique autorise ;
// les contrôles de conformité (lib/campaign/compliance.ts) restent le dernier
// mot, et le verrou DRY_RUN passe avant tout.
// ---------------------------------------------------------------------------

import { prisma } from "@/lib/db";
import { config } from "@/lib/config";
import { logActivity } from "@/lib/activity";

const PREFIX = "policy.";

export type Policy = {
  /** Plafond d'emails par jour, toutes campagnes confondues. */
  dailyLimit: number;
  /** Délai minimum entre deux envois, en secondes. */
  minDelaySeconds: number;
  /** Heure d'ouverture de la fenêtre d'envoi (0-23), heure locale. */
  sendWindowStartHour: number;
  /** Heure de fermeture (0-23). */
  sendWindowEndHour: number;
  /** Envoyer le week-end ? */
  sendOnWeekends: boolean;
  /** Nombre maximum de relances après le premier email. */
  maxFollowUps: number;
  /** Délai en jours avant la première relance. */
  followUpDelayDays: number;
  /** Délai en jours entre deux relances suivantes. */
  followUpIntervalDays: number;
  /** Jours pendant lesquels un prospect déjà contacté ne peut pas l'être à nouveau. */
  recontactCooldownDays: number;
  /** Score minimum pour qu'un prospect soit retenu par une mission. */
  minScoreToContact: number;
  /**
   * L'agent peut-il envoyer une réponse rédigée sans validation ?
   * false = tout passe par vous. C'est la valeur par défaut, volontairement.
   */
  autoReplyEnabled: boolean;

  /**
   * L'agent peut-il envoyer les emails de prospection SANS relecture ?
   *
   * false par défaut, et ce défaut est le bon : passer à true supprime le
   * dernier moment où un humain lit ce qui part en son nom. Tous les autres
   * contrôles subsistent — opposition, plafond, délai, fenêtre, conformité —
   * mais plus personne ne relit le texte avant qu'il ne parte.
   *
   * L'activation reste une décision explicite, jamais un effet de bord.
   */
  autoSendEnabled: boolean;

  /**
   * L'envoi automatique exige-t-il une signature DKIM valide ?
   *
   * true par défaut. Sans DKIM, une part importante des messages finit en
   * indésirables — et une campagne automatique amplifie ce défaut à chaque
   * envoi, en abîmant durablement la réputation du domaine. Le verrou peut
   * être levé en connaissance de cause ; il ne se lève pas tout seul.
   */
  autoSendRequiresDkim: boolean;

  /** Envois automatiques par exécution. Borne le rythme, en plus du plafond. */
  autoSendMaxPerRun: number;

  /**
   * Échecs consécutifs après lesquels l'envoi automatique se coupe seul.
   *
   * Un pilote automatique sans coupe-circuit transforme une panne en incident :
   * un serveur SMTP qui refuse tout produirait des centaines de tentatives
   * avant que quiconque s'en aperçoive.
   */
  autoSendMaxConsecutiveFailures: number;
};

export const POLICY_DEFAULTS: Policy = {
  dailyLimit: config.limits.dailySend,
  minDelaySeconds: config.limits.minDelaySeconds,
  sendWindowStartHour: 9,
  sendWindowEndHour: 18,
  sendOnWeekends: false,
  maxFollowUps: 2,
  followUpDelayDays: 4,
  followUpIntervalDays: 7,
  recontactCooldownDays: 90,
  minScoreToContact: 40,
  autoReplyEnabled: false,
  autoSendEnabled: false,
  autoSendRequiresDkim: true,
  autoSendMaxPerRun: 5,
  autoSendMaxConsecutiveFailures: 3,
};

/** Description lisible de chaque réglage, pour l'interface. */
export const POLICY_LABELS: Record<keyof Policy, { label: string; hint: string; unit?: string }> = {
  dailyLimit: { label: "Envois par jour", hint: "Plafond quotidien, toutes campagnes confondues.", unit: "emails" },
  minDelaySeconds: { label: "Délai entre deux envois", hint: "Évite les rafales qui font tomber en spam.", unit: "s" },
  sendWindowStartHour: { label: "Ouverture de la fenêtre", hint: "Aucun envoi avant cette heure.", unit: "h" },
  sendWindowEndHour: { label: "Fermeture de la fenêtre", hint: "Aucun envoi après cette heure.", unit: "h" },
  sendOnWeekends: { label: "Envoi le week-end", hint: "Un email professionnel le dimanche se remarque, rarement en bien." },
  maxFollowUps: { label: "Relances maximum", hint: "Au-delà, la séquence s'arrête définitivement." },
  followUpDelayDays: { label: "Délai avant 1re relance", hint: "Compté depuis l'envoi initial.", unit: "jours" },
  followUpIntervalDays: { label: "Intervalle entre relances", hint: "Compté depuis la relance précédente.", unit: "jours" },
  recontactCooldownDays: { label: "Délai de recontact", hint: "Un prospect déjà contacté est laissé tranquille pendant ce délai.", unit: "jours" },
  minScoreToContact: { label: "Score minimum", hint: "En dessous, le prospect n'est pas retenu par une mission.", unit: "/100" },
  autoReplyEnabled: { label: "Réponse automatique", hint: "Désactivée : toute réponse rédigée attend votre validation." },
  autoSendEnabled: {
    label: "Envoi automatique",
    hint: "Désactivé : chaque email attend votre relecture. Activé, les emails qualifiés partent seuls — tous les autres contrôles restent en place.",
  },
  autoSendRequiresDkim: {
    label: "Exiger DKIM pour l'envoi automatique",
    hint: "Sans signature DKIM, une campagne automatique abîme la réputation du domaine à chaque envoi.",
  },
  autoSendMaxPerRun: {
    label: "Envois automatiques par exécution",
    hint: "Borne le rythme d'un tour de worker, en plus du plafond quotidien.",
    unit: "emails",
  },
  autoSendMaxConsecutiveFailures: {
    label: "Échecs avant coupure automatique",
    hint: "Au-delà, l'envoi automatique se désactive seul et vous prévient.",
    unit: "échecs",
  },
};

function parse(key: keyof Policy, raw: string): Policy[keyof Policy] {
  const fallback = POLICY_DEFAULTS[key];
  if (typeof fallback === "boolean") return raw.trim().toLowerCase() === "true";
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) ? n : (fallback as number);
}

/** Lit la politique effective : réglages en base, sinon valeurs par défaut. */
export async function getPolicy(): Promise<Policy> {
  const rows = await prisma.setting.findMany({ where: { key: { startsWith: PREFIX } } });
  const policy = { ...POLICY_DEFAULTS };

  for (const row of rows) {
    const key = row.key.slice(PREFIX.length) as keyof Policy;
    if (key in policy) {
      (policy as Record<string, unknown>)[key] = parse(key, row.value);
    }
  }
  return policy;
}

/** Modifie un réglage à chaud. Toute modification est tracée. */
export async function setPolicy<K extends keyof Policy>(key: K, value: Policy[K]) {
  const before = await getPolicy();
  await prisma.setting.upsert({
    where: { key: `${PREFIX}${key}` },
    update: { value: String(value) },
    create: { key: `${PREFIX}${key}`, value: String(value) },
  });

  await logActivity({
    actor: "HUMAN",
    module: "POLICY",
    action: "policy.update",
    summary: `Réglage « ${POLICY_LABELS[key].label} » : ${before[key]} → ${value}.`,
    details: { key, from: before[key], to: value },
  });

  return getPolicy();
}

/** Quels réglages ont été modifiés par rapport aux valeurs par défaut ? */
export async function policyOverrides(): Promise<Array<keyof Policy>> {
  const rows = await prisma.setting.findMany({ where: { key: { startsWith: PREFIX } } });
  return rows
    .map((r) => r.key.slice(PREFIX.length) as keyof Policy)
    .filter((k) => k in POLICY_DEFAULTS);
}

// --- Fenêtre d'envoi --------------------------------------------------------

export type WindowCheck = {
  open: boolean;
  reason: string;
  /** Prochain moment où la fenêtre s'ouvre, si elle est fermée. */
  nextOpening?: Date;
};

/**
 * La fenêtre d'envoi est-elle ouverte ?
 *
 * Purement calculatoire : aucune écriture, aucun effet de bord. On peut donc
 * l'appeler pour afficher un état sans rien déclencher.
 */
export function checkSendWindow(policy: Policy, now = new Date()): WindowCheck {
  const day = now.getDay(); // 0 = dimanche
  const hour = now.getHours();

  if (!policy.sendOnWeekends && (day === 0 || day === 6)) {
    const next = new Date(now);
    next.setDate(next.getDate() + (day === 0 ? 1 : 2));
    next.setHours(policy.sendWindowStartHour, 0, 0, 0);
    return {
      open: false,
      reason: `Week-end : les envois sont suspendus (${day === 0 ? "dimanche" : "samedi"}).`,
      nextOpening: next,
    };
  }

  if (hour < policy.sendWindowStartHour) {
    const next = new Date(now);
    next.setHours(policy.sendWindowStartHour, 0, 0, 0);
    return {
      open: false,
      reason: `Trop tôt : la fenêtre d'envoi ouvre à ${policy.sendWindowStartHour} h.`,
      nextOpening: next,
    };
  }

  if (hour >= policy.sendWindowEndHour) {
    const next = new Date(now);
    next.setDate(next.getDate() + 1);
    next.setHours(policy.sendWindowStartHour, 0, 0, 0);
    return {
      open: false,
      reason: `Trop tard : la fenêtre d'envoi ferme à ${policy.sendWindowEndHour} h.`,
      nextOpening: next,
    };
  }

  return {
    open: true,
    reason: `Fenêtre ouverte (${policy.sendWindowStartHour} h – ${policy.sendWindowEndHour} h).`,
  };
}

/** Combien d'envois restent autorisés aujourd'hui ? */
export async function remainingToday(policy: Policy): Promise<{ used: number; remaining: number }> {
  const debut = new Date();
  debut.setHours(0, 0, 0, 0);

  // Cohérent avec CHECK_RATE_LIMIT : seuls les envois réels consomment le
  // quota. Les simulations n'engagent rien.
  const used = await prisma.sendLog.count({
    where: { createdAt: { gte: debut }, status: "SENT" },
  });
  return { used, remaining: Math.max(0, policy.dailyLimit - used) };
}
