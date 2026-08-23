// ---------------------------------------------------------------------------
// RÉDACTION DES RÉPONSES AUX PROSPECTS
//
// Le premier email de prospection est écrit par lib/email/generate.ts. Ce
// module écrit la SUITE de la conversation : réponse à un intéressé, à une
// question de prix, à une demande de rendez-vous, à une objection, relance.
//
// TROIS RÈGLES, DANS CET ORDRE :
//   1. On ne cite que ce que le prospect a RÉELLEMENT écrit. Le corps de sa
//      réponse est passé tel quel ; rien n'est reconstitué de mémoire.
//   2. On ne promet rien. Le vérificateur anti-invention (verifyEmail) tranche,
//      exactement comme pour le premier email.
//   3. Rien ne part sans validation. Ce module RÉDIGE, il n'envoie pas.
// ---------------------------------------------------------------------------

import { prisma } from "@/lib/db";
import { config } from "@/lib/config";
import { OFFERS, offerMeta, type ReplyClass } from "@/lib/constants";
import { verifyEmail, catalogNumbers, numbersFromEvidence, type VerificationResult } from "./verify";

export type ReplyKind =
  | "INTERESTED"
  | "PRICING"
  | "MEETING"
  | "QUESTION"
  | "OBJECTION"
  | "FOLLOWUP"
  | "LAST_TOUCH";

export type ComposedReply = {
  kind: ReplyKind;
  subject: string;
  body: string;
  verification: VerificationResult;
  /** Informations qui manquaient et qu'on a volontairement évité d'inventer. */
  avoided: string[];
};

/** Classement de la réponse reçue → type de message à écrire. */
export const KIND_BY_CLASS: Partial<Record<ReplyClass, ReplyKind>> = {
  INTERESTED: "INTERESTED",
  PRICE_REQUEST: "PRICING",
  MEETING_REQUEST: "MEETING",
  QUESTION: "QUESTION",
  POSITIVE: "INTERESTED",
  NOT_INTERESTED: "OBJECTION",
  NEGATIVE: "OBJECTION",
  LATER: "FOLLOWUP",
};

const SIGNATURE = (email: string) => [
  "",
  "Amyn",
  "AMYN — Web & Growth, Lille",
  email,
];

/**
 * Mention d'opposition. Presente sur TOUT message sortant, y compris une
 * reponse dans une conversation : c'est une ligne, et elle garantit qu'on ne
 * peut jamais se retrouver a ecrire a quelqu'un sans lui laisser d'issue.
 */
const OPT_OUT_LINE = [
  "",
  "Si vous ne souhaitez pas d'autre message de ma part, répondez simplement",
  "« STOP » : je vous retire de ma liste et ne vous recontacte plus.",
];

function prenomDe(nomComplet: string | null | undefined): string | null {
  if (!nomComplet) return null;
  const premier = nomComplet.trim().split(/\s+/)[0];
  // Un « prénom » d'une lettre ou tout en majuscules est probablement une
  // civilité ou un acronyme : on ne s'en sert pas.
  if (!premier || premier.length < 3 || premier === premier.toUpperCase()) return null;
  return premier;
}

// ---------------------------------------------------------------------------

type Contexte = {
  entreprise: string;
  ville: string | null;
  prenom: string | null;
  offre: keyof typeof OFFERS | null;
  prix: number | null;
  /** Problèmes PROUVÉS, tels qu'enregistrés. Jamais reformulés en promesse. */
  problemes: Array<{ title: string; summary: string }>;
  /** Ce que le prospect a écrit, mot pour mot. */
  messageRecu: string;
};

function ouverture(ctx: Contexte): string {
  return ctx.prenom ? `Bonjour ${ctx.prenom},` : "Bonjour,";
}

// --- Un rédacteur par type de message ---------------------------------------

function redigeInteresse(ctx: Contexte, avoided: string[]): { subject: string; lines: string[] } {
  const lines = [ouverture(ctx), "", "Merci de votre retour."];

  if (ctx.offre && ctx.prix) {
    const meta = offerMeta(ctx.offre);
    lines.push(
      "",
      `Au vu de ce que j'ai constaté sur votre site, l'offre ${meta?.label ?? ctx.offre} à ${ctx.prix} €`,
      "me paraît adaptée. Je peux vous détailler ce qu'elle comprend.",
    );
  } else {
    avoided.push("Aucune offre recommandée en base : le message ne cite aucun tarif.");
    lines.push("", "Je peux vous détailler ce que je propose et ce que cela impliquerait.");
  }

  lines.push(
    "",
    "Quinze minutes au téléphone suffiraient. Quels jours vous conviennent cette semaine",
    "ou la suivante ?",
  );
  return { subject: `Re: ${ctx.entreprise} — suite de notre échange`, lines };
}

function redigePrix(ctx: Contexte, avoided: string[]): { subject: string; lines: string[] } {
  const lines = [ouverture(ctx), "", "Merci pour votre question."];

  if (ctx.offre && ctx.prix) {
    const meta = offerMeta(ctx.offre);
    lines.push(
      "",
      `Pour une situation comme la vôtre, je pense à l'offre ${meta?.label ?? ctx.offre} : ${ctx.prix} €.`,
    );
  } else {
    avoided.push("Aucune offre recommandée : les trois tarifs sont donnés sans en imposer un.");
    lines.push("", "Voici mes trois formules :");
  }

  lines.push(
    "",
    `• ${OFFERS.ESSENTIAL.label} — ${OFFERS.ESSENTIAL.price} €`,
    `• ${OFFERS.PREMIUM.label} — ${OFFERS.PREMIUM.price} €`,
    `• ${OFFERS.ULTIMATE.label} — ${OFFERS.ULTIMATE.price} €`,
    "",
    `Un suivi mensuel est possible ensuite (${OFFERS.CARE.label}, ${OFFERS.CARE.price} € par mois),`,
    "sans engagement de durée.",
    "",
    "Ces montants sont fermes. Si vous voulez que je précise ce que couvre chaque formule",
    "dans votre cas, dites-le moi.",
  );
  return { subject: `Re: ${ctx.entreprise} — mes tarifs`, lines };
}

function redigeRdv(ctx: Contexte, avoided: string[]): { subject: string; lines: string[] } {
  // On ne propose JAMAIS un créneau précis : l'agent n'a pas accès à l'agenda.
  avoided.push("Aucun accès à votre agenda : le message demande vos disponibilités au lieu d'en proposer.");
  const lines = [
    ouverture(ctx),
    "",
    "Avec plaisir.",
    "",
    "Dites-moi les créneaux qui vous arrangent et je m'organise. Comptez une quinzaine",
    "de minutes, par téléphone ou en visio, comme vous préférez.",
  ];
  if (ctx.ville) lines.push("", `Je peux aussi passer vous voir si c'est plus simple — je suis à Lille.`);
  return { subject: `Re: ${ctx.entreprise} — un créneau`, lines };
}

function redigeQuestion(ctx: Contexte, avoided: string[]): { subject: string; lines: string[] } {
  // On ne devine pas la question : on renvoie au constat prouvé, et on invite
  // à préciser. Toute question hors de ce périmètre part en NEEDS_HUMAN.
  avoided.push("La question n'est pas interprétée : le message reprend le constat prouvé et invite à préciser.");
  const lines = [ouverture(ctx), "", "Merci pour votre message."];

  if (ctx.problemes.length > 0) {
    lines.push(
      "",
      "Pour rappel, voici ce que j'avais constaté sur votre site :",
      ...ctx.problemes.slice(0, 2).map((p) => `• ${p.title}`),
    );
  }

  lines.push(
    "",
    "Je suis à votre disposition pour préciser un point en particulier — dites-moi",
    "lequel et je vous réponds précisément.",
  );
  return { subject: `Re: ${ctx.entreprise}`, lines };
}

function redigeObjection(ctx: Contexte): { subject: string; lines: string[] } {
  // Une objection ne se « traite » pas : on accuse réception et on s'arrête.
  // Insister après un refus, c'est ce qui fait signaler un expéditeur.
  const lines = [
    ouverture(ctx),
    "",
    "Merci de m'avoir répondu, c'est noté.",
    "",
    "Je n'insiste pas. Si votre situation change, vous savez où me trouver.",
    "",
    "Bonne continuation.",
  ];
  return { subject: `Re: ${ctx.entreprise}`, lines };
}

function redigeRelance(ctx: Contexte, etape: number): { subject: string; lines: string[] } {
  const lines = [ouverture(ctx), ""];

  if (etape <= 1) {
    lines.push(
      "Je me permets un rappel au sujet de mon message précédent.",
      "",
    );
    if (ctx.problemes.length > 0) {
      lines.push(`Le point que j'avais relevé : ${ctx.problemes[0].title.toLowerCase()}.`, "");
    }
    lines.push("Si le sujet ne vous concerne pas, dites-le moi et j'arrête là.");
  } else {
    lines.push(
      "Je reviens une dernière fois vers vous.",
      "",
      "Sans réponse de votre part, je ne vous solliciterai plus — je ne veux pas",
      "encombrer votre boîte.",
      "",
      "Si le sujet revient sur la table plus tard, mon adresse reste valable.",
    );
  }
  return { subject: `Re: ${ctx.entreprise} — ${etape <= 1 ? "petit rappel" : "dernier message"}`, lines };
}

// ---------------------------------------------------------------------------

/**
 * Rédige la réponse correspondant à une réponse reçue.
 *
 * `replyId` sert uniquement à relire ce que le prospect a écrit : rien n'est
 * reconstitué de mémoire, tout vient de la base.
 */
export async function composeReply(
  replyId: string,
  options: { kind?: ReplyKind; step?: number } = {},
): Promise<ComposedReply> {
  const reply = await prisma.reply.findUnique({
    where: { id: replyId },
    include: {
      prospect: {
        include: {
          primaryContact: true,
          issues: { select: { id: true, title: true, summary: true, evidenceSnippet: true, evidenceNote: true } },
        },
      },
    },
  });
  if (!reply) throw new Error(`Réponse introuvable : ${replyId}`);
  if (!reply.prospect) {
    throw new Error(
      "Cette réponse n'est rattachée à aucun prospect : impossible de rédiger sans savoir à qui l'on écrit.",
    );
  }

  const kind = options.kind ?? KIND_BY_CLASS[reply.classification as ReplyClass];
  if (!kind) {
    throw new Error(
      `Aucune réponse ne peut être rédigée pour un classement ${reply.classification} : ce cas relève d'une intervention humaine.`,
    );
  }

  const p = reply.prospect;
  const contact = p.primaryContact;

  const ctx: Contexte = {
    entreprise: p.name,
    ville: p.city,
    prenom: prenomDe(reply.fromName ?? [contact?.firstName, contact?.lastName].filter(Boolean).join(" ")),
    offre: (p.recommendedOffer as keyof typeof OFFERS | null) ?? null,
    prix: p.recommendedPrice,
    problemes: p.issues.map((i) => ({ title: i.title, summary: i.summary })),
    messageRecu: reply.body,
  };

  return compose(kind, ctx, p.issues, options.step ?? 0);
}

/** Rédige une relance pour un prospect qui n'a pas répondu. */
export async function composeFollowUp(prospectId: string, step: number): Promise<ComposedReply> {
  const p = await prisma.prospect.findUnique({
    where: { id: prospectId },
    include: {
      primaryContact: true,
      issues: { select: { id: true, title: true, summary: true, evidenceSnippet: true, evidenceNote: true } },
    },
  });
  if (!p) throw new Error(`Prospect introuvable : ${prospectId}`);

  const ctx: Contexte = {
    entreprise: p.name,
    ville: p.city,
    prenom: prenomDe([p.primaryContact?.firstName, p.primaryContact?.lastName].filter(Boolean).join(" ")),
    offre: (p.recommendedOffer as keyof typeof OFFERS | null) ?? null,
    prix: p.recommendedPrice,
    problemes: p.issues.map((i) => ({ title: i.title, summary: i.summary })),
    messageRecu: "",
  };

  return compose(step >= 2 ? "LAST_TOUCH" : "FOLLOWUP", ctx, p.issues, step);
}

/**
 * Quels messages reprennent un constat sur l'entreprise ?
 *
 * Ceux-la doivent citer la preuve. Les autres (tarifs, rendez-vous, accuse de
 * reception) n'affirment rien sur le site du prospect : il n'y a rien a prouver.
 */
const REPREND_UN_CONSTAT: Record<ReplyKind, boolean> = {
  INTERESTED: false,
  PRICING: false,
  MEETING: false,
  QUESTION: true,
  OBJECTION: false,
  FOLLOWUP: true,
  LAST_TOUCH: false,
};

function compose(
  kind: ReplyKind,
  ctx: Contexte,
  issues: Array<{ id?: string; title: string; summary: string; evidenceSnippet: string | null; evidenceNote: string | null }>,
  step: number,
): ComposedReply {
  const avoided: string[] = [];
  if (!ctx.prenom) {
    avoided.push("Prénom inconnu : le message ouvre sur « Bonjour, » plutôt que sur un prénom inventé.");
  }

  let redige: { subject: string; lines: string[] };
  switch (kind) {
    case "INTERESTED": redige = redigeInteresse(ctx, avoided); break;
    case "PRICING": redige = redigePrix(ctx, avoided); break;
    case "MEETING": redige = redigeRdv(ctx, avoided); break;
    case "QUESTION": redige = redigeQuestion(ctx, avoided); break;
    case "OBJECTION": redige = redigeObjection(ctx); break;
    case "FOLLOWUP":
    case "LAST_TOUCH": redige = redigeRelance(ctx, step); break;
  }

  const lines = [...redige.lines, ...SIGNATURE(config.from.email), ...OPT_OUT_LINE];

  const body = lines.join("\n");

  const reprend = REPREND_UN_CONSTAT[kind];
  const idsConnus = issues.map((i) => i.id).filter((id): id is string => Boolean(id));
  // Un message qui reprend un constat cite le problème effectivement enregistré.
  const idsCites = reprend && ctx.problemes.length > 0 ? idsConnus.slice(0, ctx.problemes.length ? 1 : 0) : [];

  const verification = verifyEmail({
    subject: redige.subject,
    body,
    citedIssueIds: idsCites,
    knownIssueIds: idsConnus,
    requiresCitedIssue: reprend,
    allowedNumbers: [
      ...catalogNumbers(),
      ...numbersFromEvidence(issues.flatMap((i) => [i.summary, i.evidenceSnippet, i.evidenceNote])),
      // Durées et repères employés dans les formulations ci-dessus.
      15, 3,
    ],
    companyName: ctx.entreprise,
    senderEmail: config.from.email,
  });

  return { kind, subject: redige.subject, body, verification, avoided };
}
