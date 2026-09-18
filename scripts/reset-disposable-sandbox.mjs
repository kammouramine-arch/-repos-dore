// Operator-only, no HTTP endpoint. No accounts or business records are deleted.
// Supply credentials privately through DATABASE_URL, never command arguments.
import { PrismaClient } from '@prisma/client';
import { assertDisposableSandbox } from './sandbox-reset-guard.mjs';
const db = new PrismaClient();
const org = process.env.RESET_SANDBOX_WORKSPACE;
const expected = process.env.RESET_SANDBOX_TRANSACTION;
try {
  if (!org || !expected) throw new Error('Exact workspace and transaction required');
  await db.$transaction(async tx => {
    await tx.$queryRaw`SELECT id FROM subscriptions WHERE "organizationId" = ${org}::uuid FOR UPDATE`;
    const s = await tx.subscription.findUniqueOrThrow({ where: { organizationId: org } });
    const customers = await tx.customer.count({ where: { organizationId: org } });
    const quotes = await tx.quote.count({ where: { organizationId: org } });
    assertDisposableSandbox({ environment: s.appleEnvironment, provider: s.provider, originalTransactionId: s.appleOriginalTransactionId,
      expectedTransactionId: expected, customers, quotes, provenance: process.env.RESET_SANDBOX_PROVENANCE, approval: process.env.RESET_SANDBOX_APPROVAL });
    if (process.env.RESET_SANDBOX_EXECUTE !== 'YES_ARCHIVE_SANDBOX_ONLY') { console.log('Dry run passed; no changes'); return; }
    await tx.auditLog.create({ data: { organizationId: org, action: 'admin.sandbox.binding.archived', entityType: 'Subscription', entityId: s.id,
      metadata: { snapshot: JSON.parse(JSON.stringify(s)), provenance: process.env.RESET_SANDBOX_PROVENANCE, approval: process.env.RESET_SANDBOX_APPROVAL } } });
    // Archived record remains available for a reviewed recovery. No transfer is made.
    await tx.subscription.update({ where: { id: s.id }, data: { appleOriginalTransactionId: null, appleProductId: null, status: 'canceled', currentPeriodEnd: new Date(0), trialEndsAt: null } });
    console.log('Sandbox binding archived; no accounts deleted');
  }, { isolationLevel: 'Serializable' });
} finally { await db.$disconnect(); }
