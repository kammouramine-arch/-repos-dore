import 'server-only';
import type { FollowUpStatus } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { AppError, notFound } from '@/lib/errors';
import { appUrl } from '@/lib/env';
import { buildTemplateFollowUp, getAIProvider, wrapUntrusted, followUpDraftSchema } from '@/lib/ai';
import { FOLLOW_UP_SYSTEM, FOLLOW_UP_TONE_INSTRUCTIONS } from '@/lib/ai/prompts';
import type { FollowUpTone } from '@devisia/shared';
import { followUpEmail, getEmailProvider } from '@/lib/email';
import { formatCents } from '@/lib/money';
import { fullName } from '@/lib/utils';
import { notify } from './notificationService';
import { recordAudit } from './auditService';
import { trackEvent } from './analyticsService';
import { assertWithinPlan, incrementUsage } from './usageService';

/**
 * Moteur de relance.
 *
 * Les relances sont d'abord SUGGEREE : rien n'est envoyé sans validation, sauf
 * si l'entreprise a explicitement désactivé l'approbation sur une automatisation.
 */
export async function scheduleFollowUpsForQuote(organizationId: string, quoteId: string) {
  const [settings, automations, quote] = await Promise.all([
    prisma.settings.findUnique({ where: { organizationId } }),
    prisma.automation.findMany({ where: { organizationId, isActive: true } }),
    prisma.quote.findFirst({
      where: { id: quoteId, organizationId },
      include: { customer: true, organization: { include: { businessProfile: true } } },
    }),
  ]);

  if (!quote || !settings?.followUpsEnabled) return [];

  const relevant = automations.filter((automation) =>
    ['DEVIS_NON_CONSULTE', 'DEVIS_CONSULTE_SANS_REPONSE', 'DEVIS_SANS_REPONSE'].includes(
      automation.trigger,
    ),
  );
  if (relevant.length === 0) return [];

  const base = quote.sentAt ?? new Date();
  const created = [];

  for (const [index, automation] of relevant.entries()) {
    const scheduledFor = new Date(base.getTime() + automation.delayHours * 60 * 60 * 1000);
    const existing = await prisma.followUp.findFirst({
      where: { quoteId, automationId: automation.id, status: { in: ['SUGGEREE', 'PLANIFIEE'] } },
      select: { id: true },
    });
    if (existing) continue;

    const draft = buildTemplateFollowUp({
      customerName: fullName(quote.customer.firstName, quote.customer.lastName, quote.customer.companyName),
      quoteNumber: quote.number,
      quoteTitle: quote.title,
      totalCents: quote.totalCents,
      attempt: index + 1,
      viewed: quote.viewCount > 0,
      companyName: quote.organization.businessProfile?.legalName ?? quote.organization.name,
      signature: quote.organization.businessProfile?.ownerName,
    });

    created.push(
      await prisma.followUp.create({
        data: {
          organizationId,
          quoteId,
          automationId: automation.id,
          channel: automation.channel,
          status: 'PLANIFIEE',
          attempt: index + 1,
          subject: draft.objet,
          body: draft.message,
          scheduledFor,
        },
      }),
    );
  }

  return created;
}

/**
 * Rédige une relance : IA si disponible, gabarit professionnel sinon.
 *
 * Le ton est choisi par l'utilisateur ; le contexte transmis au modèle ne
 * contient que des données réelles du devis.
 */
export async function draftFollowUpMessage(
  organizationId: string,
  quoteId: string,
  attempt = 1,
  tone: FollowUpTone = 'professionnel',
) {
  const quote = await prisma.quote.findFirst({
    where: { id: quoteId, organizationId, deletedAt: null },
    include: { customer: true, organization: { include: { businessProfile: true, settings: true } } },
  });
  if (!quote) throw notFound('Devis introuvable.');

  const customerName = fullName(
    quote.customer.firstName,
    quote.customer.lastName,
    quote.customer.companyName,
  );
  const companyName = quote.organization.businessProfile?.legalName ?? quote.organization.name;

  const fallback = buildTemplateFollowUp({
    customerName,
    quoteNumber: quote.number,
    quoteTitle: quote.title,
    totalCents: quote.totalCents,
    attempt,
    viewed: quote.viewCount > 0,
    companyName,
    signature: quote.organization.settings?.aiSignature ?? quote.organization.businessProfile?.ownerName,
  });

  const provider = getAIProvider();
  if (!provider) return { ...fallback, degraded: true };

  try {
    const result = await provider.generateStructuredOutput({
      system: FOLLOW_UP_SYSTEM,
      context: [
        `Entreprise : ${companyName}`,
        `Client : ${customerName}`,
        `Devis : ${quote.number} — ${quote.title}`,
        `Montant : ${formatCents(quote.totalCents)} TTC`,
        `Devis consulté par le client : ${quote.viewCount > 0 ? 'oui' : 'non'}`,
        `Relance numéro ${attempt}`,
        `Ton demandé : ${FOLLOW_UP_TONE_INSTRUCTIONS[tone] ?? FOLLOW_UP_TONE_INSTRUCTIONS.professionnel}`,
      ]
        .filter(Boolean)
        .join('\n'),
      untrusted: wrapUntrusted(quote.clientMessage, 'message_client'),
      schema: followUpDraftSchema,
      schemaName: 'relance',
      maxTokens: 800,
      temperature: 0.5,
    });
    return { ...result.data, degraded: false };
  } catch (error) {
    console.error('[relance] rédaction IA indisponible', error);
    return { ...fallback, degraded: true };
  }
}

export interface SendFollowUpInput {
  organizationId: string;
  userId: string;
  followUpId?: string;
  quoteId?: string;
  subject?: string;
  body?: string;
}

/** Envoi effectif d'une relance, toujours déclenché par une action explicite. */
export async function sendFollowUp(input: SendFollowUpInput) {
  const followUp = input.followUpId
    ? await prisma.followUp.findFirst({
        where: { id: input.followUpId, organizationId: input.organizationId },
      })
    : null;

  const quoteId = followUp?.quoteId ?? input.quoteId;
  if (!quoteId) throw notFound('Relance introuvable.');

  const quote = await prisma.quote.findFirst({
    where: { id: quoteId, organizationId: input.organizationId, deletedAt: null },
    include: {
      customer: true,
      organization: { include: { businessProfile: true, subscription: true } },
    },
  });
  if (!quote) throw notFound('Devis introuvable.');
  if (['ACCEPTE', 'REFUSE', 'ANNULE'].includes(quote.status)) {
    throw new AppError('CONFLICT', 'Ce devis a déjà reçu une réponse : la relance est inutile.');
  }
  if (!quote.customer.email) {
    throw new AppError('VALIDATION', "Ce client n'a pas d'adresse email.");
  }

  await assertWithinPlan(
    input.organizationId,
    quote.organization.subscription?.plan ?? 'ESSENTIEL',
    'FOLLOWUP_SENT',
  );

  const subject = input.subject ?? followUp?.subject ?? `Votre devis ${quote.number}`;
  const body = input.body ?? followUp?.body ?? '';
  const companyName = quote.organization.businessProfile?.legalName ?? quote.organization.name;

  await getEmailProvider().send({
    to: quote.customer.email,
    replyTo: quote.organization.businessProfile?.email ?? undefined,
    ...followUpEmail({
      subject,
      message: body,
      publicUrl: appUrl(`/devis/${quote.publicToken}`),
      companyName,
      brandColor: quote.organization.businessProfile?.brandColor,
    }),
  });

  const record = followUp
    ? await prisma.followUp.update({
        where: { id: followUp.id },
        data: { status: 'ENVOYEE', sentAt: new Date(), subject, body },
      })
    : await prisma.followUp.create({
        data: {
          organizationId: input.organizationId,
          quoteId,
          channel: 'EMAIL',
          status: 'ENVOYEE',
          subject,
          body,
          scheduledFor: new Date(),
          sentAt: new Date(),
        },
      });

  await prisma.quoteEvent.create({
    data: { quoteId, type: 'RELANCE', actor: `user:${input.userId}` },
  });
  await prisma.customer.update({
    where: { id: quote.customerId },
    data: { lastContactAt: new Date() },
  });
  await incrementUsage(input.organizationId, 'FOLLOWUP_SENT');
  await trackEvent('followup_sent', { organizationId: input.organizationId, userId: input.userId });
  await recordAudit({
    action: 'followup.sent',
    organizationId: input.organizationId,
    userId: input.userId,
    entityType: 'quote',
    entityId: quoteId,
  });

  return record;
}

export async function cancelFollowUp(organizationId: string, followUpId: string) {
  const result = await prisma.followUp.updateMany({
    where: { id: followUpId, organizationId, status: { in: ['SUGGEREE', 'PLANIFIEE'] } },
    data: { status: 'ANNULEE' },
  });
  if (result.count === 0) throw notFound('Relance introuvable.');
}

export async function listFollowUps(organizationId: string, statuses: FollowUpStatus[] = ['SUGGEREE', 'PLANIFIEE']) {
  return prisma.followUp.findMany({
    where: { organizationId, status: { in: statuses } },
    include: { quote: { include: { customer: true } } },
    orderBy: { scheduledFor: 'asc' },
    take: 100,
  });
}

/**
 * Relances arrivées à échéance.
 * Celles dont l'automatisation exige une validation deviennent des suggestions
 * notifiées ; les autres sont envoyées automatiquement.
 */
export async function processDueFollowUps(now = new Date()) {
  const due = await prisma.followUp.findMany({
    where: { status: 'PLANIFIEE', scheduledFor: { lte: now } },
    include: { automation: true, quote: { select: { id: true, status: true, number: true } } },
    take: 200,
  });

  let sent = 0;
  let suggested = 0;

  for (const followUp of due) {
    if (!followUp.quote || ['ACCEPTE', 'REFUSE', 'ANNULE', 'EXPIRE'].includes(followUp.quote.status)) {
      await prisma.followUp.update({ where: { id: followUp.id }, data: { status: 'ANNULEE' } });
      continue;
    }

    if (followUp.automation?.requireApproval !== false) {
      await prisma.followUp.update({ where: { id: followUp.id }, data: { status: 'SUGGEREE' } });
      await notify({
        organizationId: followUp.organizationId,
        type: 'RELANCE_A_FAIRE',
        title: `Relance à envoyer pour le devis ${followUp.quote.number}.`,
        href: `/app/relances`,
      });
      suggested += 1;
      continue;
    }

    try {
      await sendFollowUp({
        organizationId: followUp.organizationId,
        userId: 'system',
        followUpId: followUp.id,
      });
      sent += 1;
    } catch (error) {
      await prisma.followUp.update({
        where: { id: followUp.id },
        data: { status: 'ECHOUEE', error: error instanceof Error ? error.message.slice(0, 500) : 'Erreur' },
      });
    }
  }

  return { sent, suggested, processed: due.length };
}

/**
 * Situation d'un devis en attente, et relance adaptée.
 *
 * Un devis jamais ouvert, un devis lu sans réponse et un devis ancien
 * n'appellent pas le même message : la suggestion porte donc un motif et un ton.
 */
export type FollowUpSituation =
  | 'NON_CONSULTE'
  | 'CONSULTE_SANS_REPONSE'
  | 'ANCIEN'
  | 'MODIFICATION_ATTENDUE'
  | 'RECENT';

export interface FollowUpSuggestion {
  situation: FollowUpSituation;
  /** Priorité d'action, la plus élevée d'abord. */
  priority: number;
  tone: FollowUpTone;
  reason: string;
  recommended: boolean;
}

const SITUATION_TONES: Record<FollowUpSituation, FollowUpTone> = {
  NON_CONSULTE: 'court',
  CONSULTE_SANS_REPONSE: 'professionnel',
  ANCIEN: 'ferme',
  MODIFICATION_ATTENDUE: 'professionnel',
  RECENT: 'amical',
};

/**
 * Analyse un devis en attente pour proposer la relance la plus juste.
 * Aucun envoi n'est déclenché : la décision reste à l'artisan.
 */
export function suggestFollowUp(quote: {
  status: string;
  viewCount: number;
  daysWaiting: number;
  alreadyFollowedUp: boolean;
}): FollowUpSuggestion {
  if (quote.status === 'MODIFICATION_DEMANDEE') {
    return {
      situation: 'MODIFICATION_ATTENDUE',
      priority: 100,
      tone: SITUATION_TONES.MODIFICATION_ATTENDUE,
      reason: 'Le client attend une proposition modifiée.',
      recommended: true,
    };
  }

  if (quote.daysWaiting >= 14) {
    return {
      situation: 'ANCIEN',
      priority: 80,
      tone: SITUATION_TONES.ANCIEN,
      reason: `Sans réponse depuis ${quote.daysWaiting} jours : dernier rappel avant classement.`,
      recommended: true,
    };
  }

  if (quote.viewCount === 0 && quote.daysWaiting >= 2) {
    return {
      situation: 'NON_CONSULTE',
      priority: 70,
      tone: SITUATION_TONES.NON_CONSULTE,
      reason: "Le devis n'a jamais été ouvert : un rappel court suffit souvent.",
      recommended: true,
    };
  }

  if (quote.viewCount > 0 && quote.daysWaiting >= 2) {
    return {
      situation: 'CONSULTE_SANS_REPONSE',
      priority: 60,
      tone: SITUATION_TONES.CONSULTE_SANS_REPONSE,
      reason: `Devis consulté ${quote.viewCount} fois sans réponse : proposez votre aide.`,
      recommended: true,
    };
  }

  return {
    situation: 'RECENT',
    priority: 10,
    tone: SITUATION_TONES.RECENT,
    reason: 'Devis envoyé récemment : laissez encore un peu de temps au client.',
    recommended: false,
  };
}

/** Chiffre d'affaires en attente de réponse — argument commercial central de DEVISIA. */
function daysWaitingFor(sentAt: Date | null): number {
  return sentAt ? Math.floor((Date.now() - sentAt.getTime()) / (1000 * 60 * 60 * 24)) : 0;
}

export async function revenueToRecover(organizationId: string) {
  const quotes = await prisma.quote.findMany({
    where: {
      organizationId,
      deletedAt: null,
      status: { in: ['ENVOYE', 'CONSULTE', 'MODIFICATION_DEMANDEE'] },
    },
    include: { customer: true, followUps: { where: { status: 'ENVOYEE' }, orderBy: { sentAt: 'desc' }, take: 1 } },
    orderBy: { sentAt: 'asc' },
  });

  const totalCents = quotes.reduce((acc, quote) => acc + quote.totalCents, 0);
  const customerIds = new Set(quotes.map((quote) => quote.customerId));

  return {
    totalCents,
    quoteCount: quotes.length,
    customerCount: customerIds.size,
    quotes: quotes.map((quote) => ({
      id: quote.id,
      number: quote.number,
      title: quote.title,
      totalCents: quote.totalCents,
      status: quote.status,
      sentAt: quote.sentAt?.toISOString() ?? null,
      viewCount: quote.viewCount,
      customerName: fullName(quote.customer.firstName, quote.customer.lastName, quote.customer.companyName),
      customerEmail: quote.customer.email,
      lastFollowUpAt: quote.followUps[0]?.sentAt?.toISOString() ?? null,
      daysWaiting: daysWaitingFor(quote.sentAt),
      suggestion: suggestFollowUp({
        status: quote.status,
        viewCount: quote.viewCount,
        daysWaiting: daysWaitingFor(quote.sentAt),
        alreadyFollowedUp: quote.followUps.length > 0,
      }),
    }))
      .sort((a, b) => b.suggestion.priority - a.suggestion.priority),
  };
}
