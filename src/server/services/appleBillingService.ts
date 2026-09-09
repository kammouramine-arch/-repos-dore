import 'server-only';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
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

async function verified<T>(operationName: string, operation: (verifier: SignedDataVerifier) => Promise<T>): Promise<T> {
  let lastError: { name?: string; message?: string } | undefined;
  for (const verifier of getVerifiers()) {
    try { return await operation(verifier); }
    catch (error) {
      // Apple verification failures are otherwise indistinguishable from a
      // generic purchase error in TestFlight. Keep only bounded provider
      // metadata; signed transactions, receipts and account identifiers are
      // deliberately never logged.
      const name = error instanceof Error ? error.name : undefined;
      const status = error && typeof error === 'object' && 'status' in error ? error.status : undefined;
      const message = error instanceof Error ? error.message : String(error);
      lastError = { name: name?.slice(0, 80), message: message.slice(0, 240) };
      console.warn('[billing/apple] verification failed', { operation: operationName, ...lastError, status: typeof status === 'number' ? status : undefined });
      /* Try only explicitly enabled environments. */
    }
  }
  throw new AppError('VALIDATION', 'Apple n’a pas pu confirmer cet achat. Restaurez vos achats ou réessayez.');
}

/** Only accepts data after Apple's signature, bundle and environment checks. */
export async function syncAppleTransaction(signedTransaction: string, organizationId: string) {
  const transaction = await verified('transaction', (v) => v.verifyAndDecodeTransaction(signedTransaction));
  const binding = transaction.originalTransactionId
    ? await prisma.subscription.findUnique({ where: { appleOriginalTransactionId: transaction.originalTransactionId } }) : null;
  // An established original-transaction binding is immutable. Reusing an Apple
  // account with a new appAccountToken cannot move the subscription; the
  // original workspace can still reconcile its signed renewal.
  if (binding ? binding.organizationId !== organizationId : transaction.appAccountToken?.toLowerCase() !== organizationId.toLowerCase()) {
    console.warn('[billing/apple] ownership rejected', {
      category: binding ? 'ORIGINAL_TRANSACTION_ALREADY_BOUND' : 'APP_ACCOUNT_TOKEN_MISMATCH',
      reference: createHash('sha256').update(transaction.originalTransactionId ?? 'missing').digest('hex').slice(0, 12),
      workspaceReference: createHash('sha256').update(organizationId).digest('hex').slice(0, 12),
      ownerWorkspaceReference: binding ? createHash('sha256').update(binding.organizationId).digest('hex').slice(0, 12) : undefined,
      environment: transaction.environment,
      productId: transaction.productId,
    });
    throw new AppError('CONFLICT', 'Cet abonnement appartient à un autre compte DEVISERA. Connectez-vous à ce compte.');
  }
  return applyTransaction(transaction, organizationId);
}

async function applyTransaction(t: JWSTransactionDecodedPayload, organizationId: string, renewal?: JWSRenewalInfoDecodedPayload, notificationDate?: number) {
  const plan = planForAppleProduct(t.productId ?? '');
  if (!plan || !t.originalTransactionId || !t.expiresDate || !t.signedDate || t.type !== 'Auto-Renewable Subscription') {
    throw new AppError('VALIDATION', 'Cet achat ne correspond pas à un abonnement DEVISERA.');
  }
  if (t.isUpgraded) return { synced: false };
  const reference = createHash('sha256').update(t.originalTransactionId).digest('hex').slice(0, 12);
  const signedAt = new Date(notificationDate ?? t.signedDate);
  const expiresAt = new Date(t.revocationDate ? Math.min(t.expiresDate, t.revocationDate) : t.expiresDate);
  const expired = expiresAt.getTime() <= Date.now();
  const trial = t.offerType === 1 && t.offerDiscountType === 'FREE_TRIAL';
  return prisma.$transaction(async (tx) => {
    // Lock the Apple chain across workspaces. Never silently transfer access.
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`apple:${t.originalTransactionId}`}))`;
    const owner = await tx.subscription.findUnique({ where: { appleOriginalTransactionId: t.originalTransactionId } });
    if (owner && owner.organizationId !== organizationId) {
      console.warn('[billing/apple] ownership conflict', { category: 'ORIGINAL_TRANSACTION_ALREADY_BOUND' });
      throw new AppError('CONFLICT', 'Cet abonnement est déjà associé à un autre espace DEVISERA. Connectez-vous au compte utilisé lors du premier achat ou contactez le support.');
    }
    // Serialise receipts and webhooks for this account. Old notifications must
    // never overwrite a renewal, refund or cancellation that arrived first.
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${organizationId}))`;
    const current = await tx.subscription.findUnique({ where: { organizationId } });
    if (!current) throw new AppError('NOT_FOUND', 'Compte DEVISERA introuvable.');
    if (current.stripeSubscriptionId && ['active', 'past_due'].includes(current.status)) {
      throw new AppError('CONFLICT', 'Un abonnement web existe déjà. Gérez-le avant de souscrire avec Apple.');
    }
    if (current.appleSignedAt && current.appleSignedAt >= signedAt) {
      console.info('[billing/apple] entitlement unchanged', { reference, product: t.productId, category: 'ALREADY_APPLIED' });
      return { synced: false };
    }
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
    console.info('[billing/apple] entitlement persisted', { reference, product: t.productId, environment: t.environment, status: expired ? 'canceled' : trial ? 'trialing' : 'active' });
    return { synced: true };
  });
}

export async function handleAppleNotification(signedPayload: string) {
  const notification = await verified('notification', (v) => v.verifyAndDecodeNotification(signedPayload));
  if (notification.notificationType === 'TEST') return { received: true };
  const signedTransaction = notification.data?.signedTransactionInfo;
  if (!signedTransaction) return { received: true };
  const transaction = await verified('notification-transaction', (v) => v.verifyAndDecodeTransaction(signedTransaction));
  const renewal = notification.data?.signedRenewalInfo
    ? await verified('renewal', (v) => v.verifyAndDecodeRenewalInfo(notification.data!.signedRenewalInfo!)) : undefined;
  if (renewal && renewal.originalTransactionId !== transaction.originalTransactionId) throw new AppError('VALIDATION');
  const binding = transaction.originalTransactionId
    ? await prisma.subscription.findUnique({ where: { appleOriginalTransactionId: transaction.originalTransactionId } }) : null;
  const organizationId = binding?.organizationId ?? transaction.appAccountToken;
  if (!organizationId || !/^[0-9a-f-]{36}$/i.test(organizationId)) return { received: true };
  await applyTransaction(transaction, organizationId, renewal, notification.signedDate);
  return { received: true };
}
