-- Sign in with Apple and Google. The DEVISERA account stays the permanent
-- identity; providers attach to it. Existing users keep their password and
-- their organization untouched.
ALTER TABLE "users" ALTER COLUMN "passwordHash" DROP NOT NULL;

ALTER TABLE "organizations" ADD COLUMN "setupPending" BOOLEAN NOT NULL DEFAULT false;

CREATE TYPE "AuthProvider" AS ENUM ('APPLE', 'GOOGLE');

CREATE TABLE "auth_identities" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "provider" "AuthProvider" NOT NULL,
    "providerUserId" TEXT NOT NULL,
    "email" TEXT,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "privateRelay" BOOLEAN NOT NULL DEFAULT false,
    "refreshTokenCiphertext" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUsedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "auth_identities_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "auth_identities_provider_providerUserId_key" ON "auth_identities"("provider", "providerUserId");
CREATE INDEX "auth_identities_userId_idx" ON "auth_identities"("userId");

ALTER TABLE "auth_identities" ADD CONSTRAINT "auth_identities_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
