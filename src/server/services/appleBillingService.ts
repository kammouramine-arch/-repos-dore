import 'server-only';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { Environment, SignedDataVerifier, type JWSTransactionDecodedPayload, type JWSRenewalInfoDecodedPayload } from '@apple/app-store-server-library';
import { planForAppleProduct, PLANS } from '@devisia/shared';
import { prisma } from '@/lib/prisma';
import { AppError } from '@/lib/errors';

let verifiers: SignedDataVerifier[] | undefined;
function getVerifiers() {
  if (!verifiers) {
    const root = readFileSync(path.join(process.cwd(), 'src/lib/billing/certificates/AppleRootCA-G3.cer'));
    verifiers = [new SignedDataVerifier([root], true, Environment.PRODUCTION, 'fr.devisia.app', 6806865251)];
    if (process.env.APPLE_ALLOW_SANDBOX === 'true') {
      verifiers.push(new SignedDataVerifier([root], true, Environment.SANDBOX, 'fr.devisia.app'));
    }
  }
  return verifiers;
}

async function verified<T>(operation: (verifier: SignedDataVerifier) => Promise<T>): Promise<T> {
  for (const verifier of getVerifiers()) {
    try { return await operation(verifier); } catch { /* Try only explicitly enabled environments. */ }
  }
  throw new AppError('VALIDATION', 'Apple n’a pas pu confirmer cet achat. Restaurez vos achats ou réessayez.');
}

/** Only accepts data after Apple's signature, bundle and environment checks. */
export async function syncAppleTransaction(signedTransaction: string, organizationId: string) {
  const transaction = await verified((v) => v.verifyAndDecodeTransaction(signedTransaction));
  if (transaction.appAccountToken?.toLowerCase() !== organizationId.toLowerCase()) {
    throw new AppError('CONFLICT', 'Cet abonnement appartient à un autre compte DEVISIA. Connectez-vous à ce compte.');
  }
  return applyTransaction(transaction, organizationId);
}

async function applyTransaction(t: JWSTransactionDecodedPayload, organizationId: string, renewal?: JWSRenewalInfoDecodedPayload, notificationDate?: number) {
  const plan = planForAppleProduct(t.productId ?? '');
  if (!plan || !t.originalTransactionId || !t.expiresDate || !t.signedDate || t.type !== 'Auto-Renewable Subscription') {
    throw new AppError('VALIDATION', 'Cet achat ne correspond pas à un abonnement DEVISIA.');
  }
  if (t.isUpgraded) return { synced: false };
  const signedAt = new Date(notificationDate ?? t.signedDate);
  const expiresAt = new Date(t.revocationDate ? Math.min(t.expiresDate, t.revocationDate) : t.expiresDate);
  const expired = expiresAt.getTime() <= Date.now();
  const trial = t.offerType === 1 && t.offerDiscountType === 'FREE_TRIAL';
  return prisma.$transaction(async (tx) => {
    // Serialise receipts and webhooks for this account. Old notifications must
    // never overwrite a renewal, refund or cancellation that arrived first.
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${organizationId}))`;
    const current = await tx.subscription.findUnique({ where: { organizationId } });
    if (!current) throw new AppError('NOT_FOUND', 'Compte DEVISIA introuvable.');
    if (current.stripeSubscriptionId && ['active', 'past_due'].includes(current.status)) {
      throw new AppError('CONFLICT', 'Un abonnement web existe déjà. Gérez-le avant de souscrire avec Apple.');
    }
    if (current.appleSignedAt && current.appleSignedAt >= signedAt) return { synced: false };
    await tx.subscription.update({ where: { organizationId }, data: {
      appleOriginalTransactionId: t.originalTransactionId,
      appleProductId: t.productId,
      appleEnvironment: t.environment,
      appleSignedAt: signedAt,
      plan,
      seats: PLANS[plan].limits.seats,
      status: expired ? 'canceled' : trial ? 'trialing' : 'active',
      trialStartedAt: trial && t.purchaseDate ? new Date(t.purchaseDate) : null,
      trialEndsAt: trial ? expiresAt : null,
      currentPeriodEnd: expiresAt,
      cancelAtPeriodEnd: renewal ? renewal.autoRenewStatus === 0 : current.appleOriginalTransactionId === t.originalTransactionId ? current.cancelAtPeriodEnd : false,
      canceledAt: t.revocationDate ? new Date(t.revocationDate) : null,
    } });
    return { synced: true };
  });
}

export async function handleAppleNotification(signedPayload: string) {
  const notification = await verified((v) => v.verifyAndDecodeNotification(signedPayload));
  if (notification.notificationType === 'TEST') return { received: true };
  const signedTransaction = notification.data?.signedTransactionInfo;
  if (!signedTransaction) return { received: true };
  const transaction = await verified((v) => v.verifyAndDecodeTransaction(signedTransaction));
  const renewal = notification.data?.signedRenewalInfo
    ? await verified((v) => v.verifyAndDecodeRenewalInfo(notification.data!.signedRenewalInfo!)) : undefined;
  if (renewal && renewal.originalTransactionId !== transaction.originalTransactionId) throw new AppError('VALIDATION');
  const organizationId = transaction.appAccountToken;
  if (!organizationId || !/^[0-9a-f-]{36}$/i.test(organizationId)) return { received: true };
  await applyTransaction(transaction, organizationId, renewal, notification.signedDate);
  return { received: true };
}
