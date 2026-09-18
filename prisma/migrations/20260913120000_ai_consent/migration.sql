-- Explicit consent before any personal data is sent to the third-party AI
-- provider (App Review, guidelines 5.1.1 (i) / 5.1.2 (i)). One decision per
-- user and organization; stores nothing beyond the decision, the text version
-- and the timestamp.
CREATE TYPE "AiConsentStatus" AS ENUM ('GRANTED', 'DECLINED', 'REVOKED');

CREATE TABLE "ai_consents" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "status" "AiConsentStatus" NOT NULL,
    "version" INTEGER NOT NULL,
    "provider" TEXT NOT NULL,
    "decidedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ai_consents_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ai_consents_userId_organizationId_key" ON "ai_consents"("userId", "organizationId");

ALTER TABLE "ai_consents" ADD CONSTRAINT "ai_consents_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ai_consents" ADD CONSTRAINT "ai_consents_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Accessed exclusively through the authorized Prisma server (same rule as the other server tables).
ALTER TABLE "ai_consents" ENABLE ROW LEVEL SECURITY;
