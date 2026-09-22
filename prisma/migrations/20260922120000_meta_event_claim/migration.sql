-- Opaque HMAC keys only; no raw account, Apple receipt or transaction identifiers.
CREATE TABLE "MetaEventClaim" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MetaEventClaim_pkey" PRIMARY KEY ("id")
);
