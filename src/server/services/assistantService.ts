import 'server-only';
import { prisma } from '@/lib/prisma';
import { getAIProvider, wrapUntrusted, assistantAnswerSchema } from '@/lib/ai';
import { ASSISTANT_SYSTEM } from '@/lib/ai/prompts';
import { normalize } from '@/lib/ai/text';
import { formatCents } from '@/lib/money';
import { fullName } from '@/lib/utils';
import { getDashboardMetrics } from './dashboardService';
import { revenueToRecover } from './followUpService';

export interface AssistantAnswer {
  answer: string;
  actions: { label: string; href?: string | null }[];
  degraded: boolean;
  /** Données réelles utilisées pour construire la réponse. */
  facts: string[];
}

/**
 * Assistant du tableau de bord.
 *
 * Les chiffres proviennent toujours de requêtes réelles sur la base : le modèle
 * ne fait que formuler la réponse à partir de ces données. Aucune action
 * sensible n'est exécutée par l'assistant.
 */
export async function askAssistant(
  organizationId: string,
  userId: string,
  question: string,
): Promise<AssistantAnswer> {
  const context = await collectContext(organizationId, question);
  const provider = getAIProvider();

  if (!provider) {
    return { ...answerLocally(question, context), degraded: true, facts: context.facts };
  }

  try {
    const result = await provider.generateStructuredOutput({
      system: ASSISTANT_SYSTEM,
      context: context.facts.join('\n'),
      untrusted: wrapUntrusted(question, 'question_utilisateur'),
      schema: assistantAnswerSchema,
      schemaName: 'reponse_assistant',
      maxTokens: 900,
      temperature: 0.3,
    });
    await prisma.aIRequest
      .create({
        data: {
          organizationId,
          userId,
          kind: 'ASSISTANT',
          provider: result.usage.provider,
          model: result.usage.model,
          latencyMs: result.usage.latencyMs,
          inputTokens: result.usage.inputTokens,
          outputTokens: result.usage.outputTokens,
        },
      })
      .catch(() => undefined);

    return {
      answer: result.data.reponse,
      actions: result.data.actions.map((action) => ({ label: action.libelle, href: action.href })),
      degraded: false,
      facts: context.facts,
    };
  } catch (error) {
    console.error('[assistant] IA indisponible', error);
    return { ...answerLocally(question, context), degraded: true, facts: context.facts };
  }
}

interface AssistantContext {
  facts: string[];
  metrics: Awaited<ReturnType<typeof getDashboardMetrics>>;
  toRecover: Awaited<ReturnType<typeof revenueToRecover>>;
  bigQuotes: { number: string; title: string; totalCents: number; customerName: string; id: string }[];
  silentCustomers: { name: string; number: string; days: number }[];
  refusedQuotes: { number: string; customerName: string; totalCents: number; reason: string | null }[];
  topServices: { label: string; count: number; revenueCents: number }[];
}

async function collectContext(organizationId: string, question: string): Promise<AssistantContext> {
  const threshold = extractAmountCents(question);
  const [metrics, toRecover, bigQuotesRaw, refusedRaw] = await Promise.all([
    getDashboardMetrics(organizationId, 30),
    revenueToRecover(organizationId),
    prisma.quote.findMany({
      where: {
        organizationId,
        deletedAt: null,
        ...(threshold ? { totalCents: { gte: threshold } } : {}),
      },
      include: { customer: true },
      orderBy: { totalCents: 'desc' },
      take: 8,
    }),
    prisma.quote.findMany({
      where: { organizationId, deletedAt: null, status: { in: ['REFUSE', 'EXPIRE'] } },
      include: { customer: true },
      orderBy: { respondedAt: 'desc' },
      take: 6,
    }),
  ]);

  const bigQuotes = bigQuotesRaw.map((quote) => ({
    id: quote.id,
    number: quote.number,
    title: quote.title,
    totalCents: quote.totalCents,
    customerName: fullName(quote.customer.firstName, quote.customer.lastName, quote.customer.companyName),
  }));

  const refusedQuotes = refusedRaw.map((quote) => ({
    number: quote.number,
    customerName: fullName(quote.customer.firstName, quote.customer.lastName, quote.customer.companyName),
    totalCents: quote.totalCents,
    reason: quote.clientMessage,
  }));

  const silentCustomers = toRecover.quotes
    .filter((quote) => quote.daysWaiting >= 2)
    .slice(0, 8)
    .map((quote) => ({ name: quote.customerName, number: quote.number, days: quote.daysWaiting }));

  const facts = [
    `Période analysée : 30 derniers jours.`,
    `Chiffre d'affaires devisé : ${formatCents(metrics.quotedRevenueCents)}.`,
    `Devis envoyés : ${metrics.quotesSent}.`,
    `Panier moyen : ${formatCents(metrics.averageQuoteCents)}.`,
    `Nouveaux prospects : ${metrics.newLeads}.`,
    `Chiffre d'affaires en attente de réponse : ${formatCents(toRecover.totalCents)} sur ${toRecover.quoteCount} devis et ${toRecover.customerCount} clients.`,
    threshold
      ? `Devis d'au moins ${formatCents(threshold)} : ${bigQuotes.length}.`
      : `Devis les plus élevés :`,
    ...bigQuotes.map(
      (quote) => `- ${quote.number} | ${quote.customerName} | ${quote.title} | ${formatCents(quote.totalCents)}`,
    ),
    silentCustomers.length > 0 ? 'Clients sans réponse :' : 'Aucun client sans réponse.',
    ...silentCustomers.map((customer) => `- ${customer.name} (devis ${customer.number}, ${customer.days} jours)`),
    refusedQuotes.length > 0 ? 'Devis non aboutis (refusés ou expirés) :' : 'Aucun devis refusé ou expiré.',
    ...refusedQuotes.map(
      (quote) =>
        `- ${quote.number} | ${quote.customerName} | ${formatCents(quote.totalCents)}${quote.reason ? ` | motif : ${quote.reason}` : ''}`,
    ),
    metrics.topServices.length > 0 ? 'Prestations les plus rentables :' : 'Aucune prestation vendue.',
    ...metrics.topServices.map(
      (service) => `- ${service.label} | ${formatCents(service.revenueCents)} | ${service.count} fois`,
    ),
  ];

  return {
    facts,
    metrics,
    toRecover,
    bigQuotes,
    silentCustomers,
    refusedQuotes,
    topServices: metrics.topServices,
  };
}

/** Extrait un seuil de montant : « devis supérieurs à 2 000 € ». */
function extractAmountCents(question: string): number | null {
  const text = normalize(question).replace(/\s/g, '');
  const match = text.match(/(?:superieura|plusde|au-delade|>)(\d+(?:[.,]\d+)?)(k?)/);
  if (!match) return null;
  const value = Number(match[1]!.replace(',', '.')) * (match[2] === 'k' ? 1000 : 1);
  return Math.round(value * 100);
}

/** Réponse déterministe lorsqu'aucun fournisseur d'IA n'est configuré. */
function answerLocally(
  question: string,
  context: AssistantContext,
): { answer: string; actions: { label: string; href?: string | null }[] } {
  const text = normalize(question);
  const { metrics, toRecover, bigQuotes, silentCustomers, refusedQuotes, topServices } = context;

  if (/refus|pas\s+(?:ete\s+)?accept|non\s+accept|perdu|sans\s+suite|expire/.test(text)) {
    if (refusedQuotes.length === 0) {
      return { answer: "Aucun devis refusé ni expiré : tous vos devis sont encore en jeu.", actions: [] };
    }
    return {
      answer: `${refusedQuotes.length} devis n'ont pas abouti :\n${refusedQuotes
        .map(
          (quote) =>
            `• ${quote.number} — ${quote.customerName} — ${formatCents(quote.totalCents)}${quote.reason ? ` (${quote.reason})` : ''}`,
        )
        .join('\n')}`,
      actions: [{ label: 'Voir les devis', href: '/app/devis?statut=REFUSE' }],
    };
  }

  if (/service|prestation|rapporte|rentab|vend/.test(text)) {
    if (topServices.length === 0) {
      return {
        answer: 'Aucune prestation vendue sur la période : les chiffres apparaîtront après vos premiers devis acceptés.',
        actions: [],
      };
    }
    const best = topServices[0]!;
    return {
      answer: `Votre prestation la plus rentable est « ${best.label} » : ${formatCents(best.revenueCents)} sur ${best.count} devis acceptés.\n${topServices
        .slice(1)
        .map((service) => `• ${service.label} — ${formatCents(service.revenueCents)}`)
        .join('\n')}`,
      actions: [{ label: 'Voir l’analytique', href: '/app/analytique' }],
    };
  }

  if (/taux.*acceptation|combien.*accept/.test(text)) {
    return {
      answer: `Sur les 30 derniers jours, vous avez envoyé ${metrics.quotesSent} devis, pour ${formatCents(metrics.quotedRevenueCents)} chiffrés.`,
      actions: [{ label: 'Voir les devis', href: '/app/devis' }],
    };
  }
  if (/gagne|chiffre|ca\b|revenu|mois/.test(text)) {
    return {
      answer: `Vous avez chiffré ${formatCents(metrics.quotedRevenueCents)} sur les 30 derniers jours, dont ${formatCents(toRecover.totalCents)} encore sans réponse sur ${toRecover.quoteCount} devis.`,
      actions: [{ label: 'Relancer maintenant', href: '/app/relances' }],
    };
  }
  if (/pas repondu|sans reponse|relance|attente/.test(text)) {
    if (silentCustomers.length === 0) {
      return { answer: 'Aucun client en attente de réponse : tous vos devis ont été traités.', actions: [] };
    }
    return {
      answer: `${silentCustomers.length} client(s) n'ont pas encore répondu :\n${silentCustomers
        .map((customer) => `• ${customer.name} — devis ${customer.number}, ${customer.days} jours`)
        .join('\n')}`,
      actions: [{ label: 'Préparer les relances', href: '/app/relances' }],
    };
  }
  if (/devis/.test(text) && bigQuotes.length > 0) {
    return {
      answer: `Voici les devis correspondants :\n${bigQuotes
        .map((quote) => `• ${quote.number} — ${quote.customerName} — ${formatCents(quote.totalCents)}`)
        .join('\n')}`,
      actions: [{ label: 'Ouvrir les devis', href: '/app/devis' }],
    };
  }

  return {
    answer: `Sur 30 jours : ${metrics.quotesSent} devis envoyés pour ${formatCents(metrics.quotedRevenueCents)} chiffrés, dont ${formatCents(toRecover.totalCents)} sans réponse à ce jour.`,
    actions: [
      { label: 'Tableau de bord', href: '/app' },
      { label: 'Relances', href: '/app/relances' },
    ],
  };
}
