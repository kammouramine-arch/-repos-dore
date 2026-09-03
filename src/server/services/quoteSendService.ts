import 'server-only';
import { prisma } from '@/lib/prisma';
import { AppError, notFound, validation } from '@/lib/errors';
import { appUrl } from '@/lib/env';
import { getEmailProvider, quoteSentEmail } from '@/lib/email';
import { fullName } from '@/lib/utils';
import { buildQuotePdf } from './quotePdfService';
import { markQuoteSent } from './quoteService';
import { incrementUsage, assertWithinPlan } from './usageService';
import { scheduleFollowUpsForQuote } from './followUpService';

export interface SendQuoteInput {
  organizationId: string;
  userId: string;
  quoteId: string;
  /** Message personnalisé accompagnant l'envoi. */
  message?: string | null;
  /** Adresse de destination si différente de la fiche client. */
  to?: string | null;
}

/**
 * Envoi d'un devis au client : PDF joint, page publique, suivi et relances.
 * Un devis n'est jamais envoyé sans action explicite de l'utilisateur.
 */
export async function sendQuote(input: SendQuoteInput) {
  const quote = await prisma.quote.findFirst({
    where: { id: input.quoteId, organizationId: input.organizationId, deletedAt: null },
    include: {
      customer: true,
      organization: { include: { businessProfile: true, subscription: true } },
    },
  });
  if (!quote) throw notFound('Devis introuvable.');
  if (['ACCEPTE', 'REFUSE'].includes(quote.status)) {
    throw new AppError('CONFLICT', 'Ce devis a déjà reçu une réponse du client.');
  }

  const recipient = (input.to ?? quote.customer.email ?? '').trim();
  if (!recipient) {
    throw validation("Ce client n'a pas d'adresse email. Ajoutez-en une pour envoyer le devis.");
  }

  const plan = quote.organization.subscription?.plan ?? 'ESSENTIEL';
  await assertWithinPlan(input.organizationId, plan, 'QUOTE_SENT');

  const itemCount = await prisma.quoteItem.count({ where: { quoteId: quote.id } });
  if (itemCount === 0) {
    throw validation('Ajoutez au moins une ligne avant d’envoyer ce devis.');
  }

  const { bytes, fileName } = await buildQuotePdf(quote.id);
  const publicUrl = appUrl(`/devis/${quote.publicToken}`);
  const profile = quote.organization.businessProfile;

  const email = quoteSentEmail({
    customerName: fullName(quote.customer.firstName, quote.customer.lastName, quote.customer.companyName),
    companyName: profile?.legalName ?? quote.organization.name,
    quoteNumber: quote.number,
    quoteTitle: quote.title,
    totalCents: quote.totalCents,
    validUntil: quote.validUntil,
    publicUrl,
    brandColor: profile?.brandColor,
    message: input.message,
  });

  // Le résultat n'est pas jeté : sans fournisseur configuré, l'email n'est pas
  // remis et l'appelant doit pouvoir le dire plutôt que d'annoncer un envoi.
  const remise = await getEmailProvider().send({
    to: recipient,
    replyTo: profile?.email ?? undefined,
    ...email,
    attachments: [
      { filename: fileName, content: Buffer.from(bytes), contentType: 'application/pdf' },
    ],
  });

  const updated = await markQuoteSent(input.organizationId, quote.id, input.userId);
  await incrementUsage(input.organizationId, 'QUOTE_SENT');

  await prisma.customer.update({
    where: { id: quote.customerId },
    data: { lastContactAt: new Date() },
  });

  if (quote.leadId) {
    await prisma.lead.update({
      where: { id: quote.leadId },
      data: { status: 'DEVIS_ENVOYE', lastActivityAt: new Date() },
    });
  }

  await scheduleFollowUpsForQuote(input.organizationId, quote.id);

  return {
    quote: updated,
    publicUrl,
    recipient,
    delivered: remise.delivered,
    emailProvider: remise.provider,
  };
}
