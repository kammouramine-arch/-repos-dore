import 'server-only';
import type Stripe from 'stripe';
import { prisma } from '@/lib/prisma';
import { AppError } from '@/lib/errors';
import { env } from '@/lib/env';
import { getStripe, requireStripe } from '@/lib/billing/stripe';
import { featureBlock } from '@devisia/shared';
import type { PaymentAccountDTO, PublicInvoiceDTO, StartInvoicePaymentResponse } from '@devisia/shared';
import { balanceOf, customerDisplayName, deriveInvoiceStatus } from './invoiceService';
import { recordAudit } from './auditService';

/**
 * Encaissement des factures de l'artisan par son client, via Stripe Connect.
 *
 * Deux flux d'argent coexistent dans DEVISERA et ne doivent jamais être
 * confondus :
 *
 * 1. L'abonnement DEVISERA — l'artisan paie le logiciel. Sur iPhone c'est
 *    StoreKit, sur le web c'est Stripe Checkout sur NOTRE compte. Ce fichier
 *    n'y touche pas.
 * 2. La facture de l'artisan — le client final paie un chantier. L'argent va
 *    sur le compte Stripe de l'artisan, jamais sur le nôtre. C'est l'objet de
 *    ce fichier.
 *
 * Conséquence pratique : aucune de ces fonctions ne doit être appelée depuis
 * un écran d'abonnement, et le paiement d'une facture ne passe jamais par
 * StoreKit — il s'agit d'un bien physique réalisé hors application, qu'Apple
 * exclut explicitement de son système d'achat intégré.
 */

/** Comptes Stripe Connect « Express » : l'artisan garde sa relation avec Stripe. */
const ACCOUNT_TYPE = 'express' as const;

function statusFor(account: Pick<Stripe.Account, 'charges_enabled' | 'payouts_enabled' | 'details_submitted'>):
  'ABSENT' | 'EN_COURS' | 'ACTIF' | 'RESTREINT' {
  if (account.charges_enabled && account.payouts_enabled) return 'ACTIF';
  if (!account.details_submitted) return 'EN_COURS';
  return 'RESTREINT';
}

/** État courant de l'encaissement en ligne pour une entreprise. */
export async function paymentAccountState(organizationId: string): Promise<PaymentAccountDTO> {
  const [organization, subscription] = await Promise.all([
    prisma.organization.findUnique({
      where: { id: organizationId },
      select: {
        stripeAccountId: true,
        stripeAccountStatus: true,
        stripeChargesEnabled: true,
        stripePayoutsEnabled: true,
        stripeOnboardedAt: true,
      },
    }),
    prisma.subscription.findUnique({ where: { organizationId }, select: { plan: true } }),
  ]);
  if (!organization) throw new AppError('NOT_FOUND', 'Entreprise introuvable.');

  const verdict = featureBlock(subscription?.plan ?? 'ESSENTIEL', 'clientPayments');
  return {
    status: organization.stripeAccountStatus,
    chargesEnabled: organization.stripeChargesEnabled,
    payoutsEnabled: organization.stripePayoutsEnabled,
    onboardedAt: organization.stripeOnboardedAt?.toISOString() ?? null,
    includedInPlan: !verdict.blocked,
    planReason: verdict.reason,
    configured: getStripe() != null,
  };
}

/**
 * Crée ou réutilise le compte Stripe de l'artisan et renvoie un lien
 * d'inscription. Le lien est à usage unique et expire : il est régénéré à
 * chaque demande plutôt que stocké.
 */
export async function createOnboardingLink(
  organizationId: string,
  userId: string,
  returnPath = '/app/parametres/paiements',
): Promise<{ url: string }> {
  const stripe = requireStripe();
  const organization = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { id: true, name: true, stripeAccountId: true, businessProfile: { select: { email: true, country: true } } },
  });
  if (!organization) throw new AppError('NOT_FOUND', 'Entreprise introuvable.');

  let accountId = organization.stripeAccountId;
  if (!accountId) {
    const account = await stripe.accounts.create({
      type: ACCOUNT_TYPE,
      country: organization.businessProfile?.country || 'FR',
      email: organization.businessProfile?.email ?? undefined,
      business_type: 'individual',
      capabilities: { card_payments: { requested: true }, transfers: { requested: true } },
      metadata: { devisiaOrganizationId: organization.id },
    });
    accountId = account.id;
    await prisma.organization.update({
      where: { id: organizationId },
      data: { stripeAccountId: accountId, stripeAccountStatus: 'EN_COURS' },
    });
    await recordAudit({
      organizationId,
      userId,
      action: 'payment_account.created',
      entityType: 'organization',
      entityId: organizationId,
    });
  }

  const base = env().APP_URL;
  const link = await stripe.accountLinks.create({
    account: accountId,
    refresh_url: `${base}${returnPath}?stripe=refresh`,
    return_url: `${base}${returnPath}?stripe=done`,
    type: 'account_onboarding',
  });
  return { url: link.url };
}

/**
 * Relit l'état du compte chez Stripe et le recopie localement.
 *
 * Appelée au retour d'inscription et par le webhook `account.updated` : l'état
 * affiché vient toujours de Stripe, jamais d'une supposition de notre part.
 */
export async function refreshPaymentAccount(organizationId: string): Promise<PaymentAccountDTO> {
  const organization = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { stripeAccountId: true },
  });
  if (!organization?.stripeAccountId) return paymentAccountState(organizationId);

  const stripe = requireStripe();
  const account = await stripe.accounts.retrieve(organization.stripeAccountId);
  await applyAccountState(organization.stripeAccountId, account);
  return paymentAccountState(organizationId);
}

/** Recopie l'état d'un compte Connect sur l'entreprise correspondante. */
export async function applyAccountState(accountId: string, account: Stripe.Account): Promise<void> {
  const charges = account.charges_enabled === true;
  const payouts = account.payouts_enabled === true;
  const status = statusFor(account);
  await prisma.organization.updateMany({
    where: { stripeAccountId: accountId },
    data: {
      stripeAccountStatus: status,
      stripeChargesEnabled: charges,
      stripePayoutsEnabled: payouts,
      ...(status === 'ACTIF' ? { stripeOnboardedAt: new Date() } : {}),
    },
  });
}

/**
 * Ouvre une session de paiement pour une facture, depuis la page publique.
 *
 * Aucune authentification : le client de l'artisan n'a pas de compte DEVISERA.
 * Le jeton public de la facture fait office d'autorisation, et le montant est
 * calculé ici — jamais transmis par le navigateur.
 */
export async function startInvoicePayment(publicToken: string): Promise<StartInvoicePaymentResponse> {
  const invoice = await prisma.invoice.findUnique({
    where: { publicToken },
    include: {
      organization: {
        select: { id: true, name: true, stripeAccountId: true, stripeChargesEnabled: true },
      },
      customer: { select: { email: true, companyName: true, firstName: true, lastName: true } },
    },
  });
  if (!invoice || invoice.deletedAt) throw new AppError('NOT_FOUND', 'Cette facture n’est plus disponible.');
  if (invoice.status === 'ANNULEE') throw new AppError('CONFLICT', 'Cette facture a été annulée.');

  const account = invoice.organization.stripeAccountId;
  if (!account || !invoice.organization.stripeChargesEnabled) {
    throw new AppError('PROVIDER_UNAVAILABLE', 'Cette entreprise n’accepte pas encore le paiement en ligne.');
  }
  const amountCents = balanceOf(invoice);
  if (amountCents <= 0) throw new AppError('CONFLICT', 'Cette facture est déjà réglée.');

  const stripe = requireStripe();
  const base = env().APP_URL;
  const session = await stripe.checkout.sessions.create(
    {
      mode: 'payment',
      // Le client paie l'entreprise : le compte Connect est le destinataire.
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: 'eur',
            unit_amount: amountCents,
            product_data: {
              name: `Facture ${invoice.number}`,
              description: invoice.title || invoice.organization.name,
            },
          },
        },
      ],
      customer_email: invoice.customer.email ?? undefined,
      success_url: `${base}/facture/${publicToken}?paiement=recu`,
      cancel_url: `${base}/facture/${publicToken}?paiement=annule`,
      // Repris tels quels dans le webhook : c'est ce qui relie l'encaissement
      // à la bonne facture sans faire confiance au navigateur.
      payment_intent_data: {
        metadata: {
          devisiaInvoiceId: invoice.id,
          devisiaOrganizationId: invoice.organizationId,
        },
      },
      metadata: {
        devisiaInvoiceId: invoice.id,
        devisiaOrganizationId: invoice.organizationId,
      },
    },
    { stripeAccount: account },
  );

  if (!session.url) throw new AppError('PROVIDER_UNAVAILABLE', 'Stripe n’a pas renvoyé de page de paiement.');
  const paymentIntentId = typeof session.payment_intent === 'string' ? session.payment_intent : session.id;
  await prisma.invoice.update({
    where: { id: invoice.id },
    data: { stripePaymentIntentId: paymentIntentId },
  });
  return { checkoutUrl: session.url, paymentIntentId };
}

/**
 * La facture telle que la voit le client de l'artisan.
 *
 * Aucune authentification : c'est le jeton du lien qui fait autorité, comme
 * pour le devis public. On n'expose donc que ce qui figure déjà sur la
 * facture papier — jamais l'identifiant interne du client, ni le catalogue,
 * ni quoi que ce soit d'une autre entreprise.
 *
 * `payable` répond à une question simple : peut-on présenter le bouton ? Elle
 * est calculée ici, côté serveur, plutôt que déduite dans le navigateur, pour
 * qu'une page rafraîchie ne propose jamais de payer une facture déjà réglée.
 */
export async function publicInvoice(publicToken: string): Promise<PublicInvoiceDTO> {
  const invoice = await prisma.invoice.findUnique({
    where: { publicToken },
    include: {
      organization: {
        select: {
          name: true,
          stripeAccountId: true,
          stripeChargesEnabled: true,
          businessProfile: {
            select: { legalName: true, brandColor: true, logoFileId: true, paymentDetails: true, email: true },
          },
        },
      },
      customer: { select: { companyName: true, firstName: true, lastName: true, email: true } },
    },
  });
  if (!invoice || invoice.deletedAt) throw new AppError('NOT_FOUND', 'Cette facture n’est plus disponible.');

  const profile = invoice.organization.businessProfile;
  const balance = balanceOf(invoice);
  const cancelled = invoice.status === 'ANNULEE';
  const configured = getStripe() != null;
  const accountReady = Boolean(invoice.organization.stripeAccountId && invoice.organization.stripeChargesEnabled);

  /*
   * Le motif est dit en clair, du point de vue du client.
   *
   * « Cette entreprise n'accepte pas encore le paiement en ligne » est une
   * information utile : elle lui évite d'attendre un bouton qui ne viendra
   * pas, et l'oriente vers les coordonnées de règlement imprimées plus bas.
   */
  const unavailableReason = cancelled
    ? 'Cette facture a été annulée.'
    : balance <= 0
      ? 'Cette facture est déjà réglée. Merci.'
      : !configured || !accountReady
        ? 'Cette entreprise n’accepte pas encore le paiement en ligne. Utilisez les coordonnées de règlement ci-dessous.'
        : null;

  return {
    id: invoice.id,
    number: invoice.number,
    title: invoice.title,
    status: deriveInvoiceStatus(invoice),
    businessName: profile?.legalName || invoice.organization.name,
    businessEmail: profile?.email ?? null,
    brandColor: profile?.brandColor ?? '#2F52E8',
    logoUrl: profile?.logoFileId ? `/api/public/logo/${profile.logoFileId}` : null,
    customerName: customerDisplayName(invoice.customer),
    totalCents: invoice.totalCents,
    paidCents: invoice.paidCents,
    balanceCents: balance,
    currency: 'EUR',
    dueAt: invoice.dueAt?.toISOString() ?? null,
    paymentDetails: profile?.paymentDetails ?? null,
    pdfUrl: `/api/public/facture/${publicToken}/pdf`,
    payable: unavailableReason == null,
    unavailableReason,
  };
}
