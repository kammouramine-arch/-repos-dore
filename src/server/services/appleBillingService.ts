import 'server-only';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { Environment, SignedDataVerifier, type JWSTransactionDecodedPayload, type JWSRenewalInfoDecodedPayload } from '@apple/app-store-server-library';
import { planChange, planForAppleProduct, PLANS } from '@devisia/shared';
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

/**
 * Autorisation de réconciliation Sandbox, créée hors ligne par un opérateur.
 *
 * Apple scelle l'`appAccountToken` de l'espace acheteur dans la transaction :
 * une transaction Sandbox contaminée pendant les essais TestFlight ne peut
 * donc jamais être restaurée sur l'espace de test courant, même une fois le
 * lien libéré. Trois verrous indépendants gardent l'exception, et chacun
 * suffit à la refuser : le fournisseur doit accepter le bac à sable, Apple
 * doit attester l'environnement Sandbox, et une autorisation nominative,
 * datée et à usage unique doit exister pour ce couple transaction/espace.
 * Aucune route de l'API client n'écrit dans cette table : une transaction de
 * Production ne peut atteindre ce chemin.
 */
export async function sandboxRebindGrant(t: JWSTransactionDecodedPayload, organizationId: string) {
  if (process.env.APPLE_ALLOW_SANDBOX !== 'true') return null;
  if (t.environment !== Environment.SANDBOX) return null;
  if (!t.originalTransactionId) return null;
  const grant = await prisma.appleSandboxRebindGrant.findUnique({
    where: {
      appleOriginalTransactionId_targetOrganizationId: {
        appleOriginalTransactionId: t.originalTransactionId,
        targetOrganizationId: organizationId,
      },
    },
  });
  if (!grant || grant.usedAt || grant.expiresAt.getTime() <= Date.now()) return null;
  return grant;
}

/** Only accepts data after Apple's signature, bundle and environment checks. */
export async function syncAppleTransaction(signedTransaction: string, organizationId: string) {
  const transaction = await verified('transaction', (v) => v.verifyAndDecodeTransaction(signedTransaction));
  const binding = transaction.originalTransactionId
    ? await prisma.subscription.findUnique({ where: { appleOriginalTransactionId: transaction.originalTransactionId } }) : null;
  // An established original-transaction binding is immutable. Reusing an Apple
  // account with a new appAccountToken cannot move the subscription; the
  // original workspace can still reconcile its signed renewal.
  const mismatched = binding
    ? binding.organizationId !== organizationId
    : transaction.appAccountToken?.toLowerCase() !== organizationId.toLowerCase();
  // Une autorisation Sandbox ne déplace jamais un lien vivant : elle ne lève
  // que la vérification de l'`appAccountToken`, et seulement après qu'un
  // opérateur a archivé le lien précédent. Un abonnement rattaché reste donc
  // immuable dans tous les environnements.
  const grant = mismatched && !binding ? await sandboxRebindGrant(transaction, organizationId) : null;
  const reference = createHash('sha256').update(transaction.originalTransactionId ?? 'missing').digest('hex').slice(0, 12);
  if (mismatched && !grant) {
    console.warn('[billing/apple] ownership rejected', {
      category: binding ? 'ORIGINAL_TRANSACTION_ALREADY_BOUND' : 'APP_ACCOUNT_TOKEN_MISMATCH',
      reference,
      workspaceReference: createHash('sha256').update(organizationId).digest('hex').slice(0, 12),
      ownerWorkspaceReference: binding ? createHash('sha256').update(binding.organizationId).digest('hex').slice(0, 12) : undefined,
      environment: transaction.environment,
      productId: transaction.productId,
    });
    throw new AppError('CONFLICT', 'Cet abonnement appartient à un autre compte DEVISERA. Connectez-vous à ce compte.');
  }
  if (grant) {
    console.warn('[billing/apple] sandbox reconciliation authorised', {
      category: 'SANDBOX_REBIND_GRANT',
      reference,
      workspaceReference: createHash('sha256').update(organizationId).digest('hex').slice(0, 12),
      environment: transaction.environment,
      productId: transaction.productId,
    });
  }
  const result = await applyTransaction(transaction, organizationId);
  if (grant) {
    // Usage unique : la condition `usedAt: null` empêche deux restaurations
    // simultanées de consommer la même autorisation.
    const consumed = await prisma.appleSandboxRebindGrant.updateMany({
      where: { id: grant.id, usedAt: null },
      data: { usedAt: new Date() },
    });
    if (consumed.count === 1) {
      await prisma.auditLog.create({ data: {
        organizationId,
        action: 'billing.apple.sandbox_rebind_consumed',
        entityType: 'AppleSandboxRebindGrant',
        entityId: grant.id,
        metadata: {
          reference,
          environment: transaction.environment,
          productId: transaction.productId,
          previousOrganizationId: grant.previousOrganizationId,
          approval: grant.approval,
          provenance: grant.provenance,
        },
      } }).catch((error) => console.error('[billing/apple] audit write failed', error));
    }
  }
  return result;
}

/**
 * Produit que Apple appliquera au prochain renouvellement.
 *
 * Seul le `renewalInfo` signé par Apple (notification DID_CHANGE_RENEWAL_PREF,
 * renouvellement, etc.) fait foi. Sans lui, une préférence déjà connue sur la
 * même chaîne est conservée jusqu'à ce que la transaction de renouvellement
 * la confirme (même produit) ou la remplace. Rien n'est jamais déduit.
 */
export function pendingRenewalProduct(t: JWSTransactionDecodedPayload, renewal: JWSRenewalInfoDecodedPayload | undefined, known: string | null) {
  if (renewal) {
    const next = renewal.autoRenewProductId ?? null;
    if (!next || renewal.autoRenewStatus === 0 || next === t.productId || !planForAppleProduct(next)) return null;
    return next;
  }
  return known && known !== t.productId ? known : null;
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
    const sameChain = current.appleOriginalTransactionId === t.originalTransactionId;
    /*
     * Rétrogradation avant l'échéance. Apple garde la formule payée jusqu'à la
     * fin de la période en cours et n'applique la formule inférieure qu'au
     * renouvellement. Une transaction de rang inférieur qui ne prolonge pas la
     * période déjà accordée n'est donc pas un renouvellement : on l'enregistre
     * comme préférence, sans toucher au droit actuel ni en inventer un.
     */
    const paidUntil = current.currentPeriodEnd?.getTime() ?? 0;
    const earlyDowngrade = sameChain && !expired && !t.revocationDate
      && planChange(current.plan, plan) === 'downgrade' && ['active', 'trialing'].includes(current.status)
      && paidUntil > Date.now() && expiresAt.getTime() <= paidUntil;
    if (earlyDowngrade) {
      await tx.subscription.update({ where: { organizationId }, data: {
        appleSignedAt: signedAt, applePendingProductId: t.productId, applePendingAt: current.currentPeriodEnd,
        cancelAtPeriodEnd: renewal ? renewal.autoRenewStatus === 0 : current.cancelAtPeriodEnd,
      } });
      console.info('[billing/apple] renewal preference recorded', { reference, product: t.productId, category: 'PENDING_DOWNGRADE', current: current.plan });
      return { synced: true, pending: true };
    }
    const pendingProductId = pendingRenewalProduct(t, renewal, sameChain ? current.applePendingProductId : null);
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
      cancelAtPeriodEnd: renewal ? renewal.autoRenewStatus === 0 : sameChain ? current.cancelAtPeriodEnd : false,
      canceledAt: t.revocationDate ? new Date(t.revocationDate) : null,
      applePendingProductId: pendingProductId,
      applePendingAt: pendingProductId ? expiresAt : null,
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
