import 'server-only';
import { prisma } from '@/lib/prisma';
import { getAIProvider, wrapUntrusted, assistantAnswerSchema } from '@/lib/ai';
import { ASSISTANT_SYSTEM, localizedSystemPrompt } from '@/lib/ai/prompts';
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
      system: localizedSystemPrompt(ASSISTANT_SYSTEM, context.locale),
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
  locale: { locale?: string; country?: string; currency?: string };
  closedQuotes: { number: string; title: string; clientMessage: string | null }[];
  facts: string[];
  metrics: Awaited<ReturnType<typeof getDashboardMetrics>>;
  toRecover: Awaited<ReturnType<typeof revenueToRecover>>;
  bigQuotes: { number: string; title: string; totalCents: number; customerName: string; id: string }[];
  silentCustomers: { name: string; number: string; days: number }[];
  topServices: { label: string; count: number; revenueCents: number }[];
}

async function collectContext(organizationId: string, question: string): Promise<AssistantContext> {
  const threshold = extractAmountCents(question);
  const [metrics, toRecover, bigQuotesRaw, closedQuotes, organization] = await Promise.all([
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
      where: { organizationId, deletedAt: null, status: { in: ['REFUSE', 'EXPIRE', 'ANNULE'] } },
      select: { number: true, title: true, clientMessage: true },
      orderBy: { updatedAt: 'desc' }, take: 8,
    }),
    prisma.organization.findUnique({ where: { id: organizationId }, select: { locale: true, country: true, currency: true } }),
  ]);

  const bigQuotes = bigQuotesRaw.map((quote) => ({
    id: quote.id,
    number: quote.number,
    title: quote.title,
    totalCents: quote.totalCents,
    customerName: fullName(quote.customer.firstName, quote.customer.lastName, quote.customer.companyName),
  }));

  const silentCustomers = toRecover.quotes
    .filter((quote) => quote.daysWaiting >= 2)
    .slice(0, 8)
    .map((quote) => ({ name: quote.customerName, number: quote.number, days: quote.daysWaiting }));

  const facts = [
    ...closedQuotes.map(quote => `Devis classé sans suite : ${quote.number} | ${quote.title} | ${quote.clientMessage ?? 'Motif non renseigné'}`),
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
    metrics.topServices.length > 0 ? 'Prestations les plus chiffrées :' : 'Aucune prestation envoyée.',
    ...metrics.topServices.map(
      (service) => `- ${service.label} | ${formatCents(service.revenueCents)} | ${service.count} fois`,
    ),
  ];

  return {
    locale: organization ?? {},
    closedQuotes,
    facts,
    metrics,
    toRecover,
    bigQuotes,
    silentCustomers,
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
  const { metrics, toRecover, bigQuotes, silentCustomers, topServices } = context;
  const english = context.locale.locale === 'en';
  const money = (cents: number) => new Intl.NumberFormat(english ? (context.locale.country === 'US' ? 'en-US' : 'en-GB') : 'fr-FR', { style: 'currency', currency: context.locale.currency ?? (context.locale.country === 'US' ? 'USD' : context.locale.country === 'GB' ? 'GBP' : 'EUR') }).format(cents / 100);

  if (/refus|pas\s+(?:ete\s+)?accept|non\s+accept|perdu|sans\s+suite|expire|reject|declin|lost|expired/.test(text)) {
    return {
      answer: context.closedQuotes.length
        ? (english ? `Here are the closed quotes in your history:\n${context.closedQuotes.map(quote => `${quote.number} — ${quote.title}: ${quote.clientMessage ?? 'reason not provided'}`).join('\n')}` : `Voici les devis classés sans suite dans votre historique :\n${context.closedQuotes.map(quote => `${quote.number} — ${quote.title} : ${quote.clientMessage ?? 'motif non renseigné'}`).join('\n')}`)
        : (english ? `No closed quotes. ${toRecover.quoteCount} quote(s) are awaiting a response, totalling ${money(toRecover.totalCents)}.` : `Aucun devis classé sans suite. ${toRecover.quoteCount} devis sont actuellement sans réponse, pour ${money(toRecover.totalCents)} à relancer.`),
      actions: [{ label: english ? 'View follow-ups' : 'Voir les relances', href: '/app/relances' }],
    };
  }

  if (/service|prestation|rapporte|rentab|vend|profitable|earning|revenue/.test(text)) {
    if (topServices.length === 0) {
      return {
        answer: english ? 'No quoted service in this period yet. The data will appear after you send your first quotes.' : 'Aucune prestation chiffrée sur la période : les données apparaîtront après vos premiers devis envoyés.',
        actions: [],
      };
    }
    const best = topServices[0]!;
    return {
      answer: english ? `Your highest-value service is “${best.label}”: ${money(best.revenueCents)} across ${best.count} sent quote(s).\n${topServices
        .slice(1)
        .map((service) => `• ${service.label} — ${money(service.revenueCents)}`)
        .join('\n')}` : `Votre prestation la plus chiffrée est « ${best.label} » : ${money(best.revenueCents)} sur ${best.count} devis envoyés.\n${topServices
        .slice(1)
        .map((service) => `• ${service.label} — ${money(service.revenueCents)}`)
        .join('\n')}`,
      actions: [{ label: english ? 'View analytics' : 'Voir l’analytique', href: '/app/analytique' }],
    };
  }

  if (/taux.*acceptation|combien.*accept|acceptance rate|how many.*accept/.test(text)) {
    return {
      answer: english ? `In the last 30 days, you sent ${metrics.quotesSent} quote(s), totalling ${money(metrics.quotedRevenueCents)}.` : `Sur les 30 derniers jours, vous avez envoyé ${metrics.quotesSent} devis, pour ${money(metrics.quotedRevenueCents)} chiffrés.`,
      actions: [{ label: english ? 'View quotes' : 'Voir les devis', href: '/app/devis' }],
    };
  }
  if (/gagne|chiffre|ca\b|revenu|mois|earn|revenue|turnover|month/.test(text)) {
    return {
      answer: english ? `You quoted ${money(metrics.quotedRevenueCents)} in the last 30 days, including ${money(toRecover.totalCents)} awaiting a response across ${toRecover.quoteCount} quote(s).` : `Vous avez chiffré ${money(metrics.quotedRevenueCents)} sur les 30 derniers jours, dont ${money(toRecover.totalCents)} encore sans réponse sur ${toRecover.quoteCount} devis.`,
      actions: [{ label: english ? 'Follow up now' : 'Relancer maintenant', href: '/app/relances' }],
    };
  }
  if (/pas repondu|sans reponse|relance|attente|no response|follow.?up|waiting/.test(text)) {
    if (silentCustomers.length === 0) {
      return { answer: english ? 'No customers are waiting for a response: all your quotes have been handled.' : 'Aucun client en attente de réponse : tous vos devis ont été traités.', actions: [] };
    }
    return {
      answer: english ? `${silentCustomers.length} customer(s) have not replied yet:\n${silentCustomers
        .map((customer) => `• ${customer.name} — quote ${customer.number}, ${customer.days} day(s)`)
        .join('\n')}` : `${silentCustomers.length} client(s) n'ont pas encore répondu :\n${silentCustomers
        .map((customer) => `• ${customer.name} — devis ${customer.number}, ${customer.days} jours`)
        .join('\n')}`,
      actions: [{ label: english ? 'Prepare follow-ups' : 'Préparer les relances', href: '/app/relances' }],
    };
  }
  if (/devis/.test(text) && bigQuotes.length > 0) {
    return {
      answer: english ? `Here are the matching quotes:\n${bigQuotes
        .map((quote) => `• ${quote.number} — ${quote.customerName} — ${money(quote.totalCents)}`)
        .join('\n')}` : `Voici les devis correspondants :\n${bigQuotes
        .map((quote) => `• ${quote.number} — ${quote.customerName} — ${money(quote.totalCents)}`)
        .join('\n')}`,
      actions: [{ label: english ? 'Open quotes' : 'Ouvrir les devis', href: '/app/devis' }],
    };
  }

  return {
    answer: english ? `In the last 30 days: ${metrics.quotesSent} quote(s) sent for ${money(metrics.quotedRevenueCents)}, with ${money(toRecover.totalCents)} still awaiting a response.` : `Sur 30 jours : ${metrics.quotesSent} devis envoyés pour ${money(metrics.quotedRevenueCents)} chiffrés, dont ${money(toRecover.totalCents)} sans réponse à ce jour.`,
    actions: [
      { label: english ? 'Dashboard' : 'Tableau de bord', href: '/app' },
      { label: english ? 'Follow-ups' : 'Relances', href: '/app/relances' },
    ],
  };
}
