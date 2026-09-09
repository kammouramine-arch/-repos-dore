-- Operator-created, single-use Sandbox reconciliation grants.
-- Never written by the customer API; consulted only for Apple-attested
-- Sandbox transactions. Production ownership rules are unaffected.
CREATE TABLE "apple_sandbox_rebind_grants" (
    "id" UUID NOT NULL,
    "appleOriginalTransactionId" TEXT NOT NULL,
    "targetOrganizationId" UUID NOT NULL,
    "previousOrganizationId" UUID,
    "approval" TEXT NOT NULL,
    "provenance" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "apple_sandbox_rebind_grants_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "apple_sandbox_rebind_grants_txn_target_key"
    ON "apple_sandbox_rebind_grants" ("appleOriginalTransactionId", "targetOrganizationId");

CREATE INDEX "apple_sandbox_rebind_grants_expiresAt_idx"
    ON "apple_sandbox_rebind_grants" ("expiresAt");

-- Same hardening as the other server-only tables: unprivileged Supabase Data
-- API roles receive no rows; the authorized Prisma owner keeps access.
ALTER TABLE "apple_sandbox_rebind_grants" ENABLE ROW LEVEL SECURITY;
