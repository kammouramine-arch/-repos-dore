-- Cycle de vie complet : devis -> signature -> facture -> encaissement,
-- plus les dépenses avec justificatif et la marque documentaire.
--
-- Écrit pour être rejouable : chaque ajout est gardé par IF NOT EXISTS ou par
-- un bloc d'exception. Les tables existantes (invoices, payments) sont
-- complétées sans perdre une ligne ni casser une contrainte.

-- 1. Valeurs d'énumération ajoutées aux types existants.
ALTER TYPE "MemberRole"     ADD VALUE IF NOT EXISTS 'COMPTABLE';
ALTER TYPE "FileKind"       ADD VALUE IF NOT EXISTS 'RECU';
ALTER TYPE "FileKind"       ADD VALUE IF NOT EXISTS 'SIGNATURE';
ALTER TYPE "AIRequestKind"  ADD VALUE IF NOT EXISTS 'RECEIPT_EXTRACTION';
ALTER TYPE "UsageMetric"    ADD VALUE IF NOT EXISTS 'RECEIPT_SCAN';
ALTER TYPE "QuoteEventType" ADD VALUE IF NOT EXISTS 'SIGNE';
ALTER TYPE "QuoteEventType" ADD VALUE IF NOT EXISTS 'FACTURE';

-- 2. Nouveaux types.
DO $$ BEGIN
  CREATE TYPE "PaymentStatus" AS ENUM ('EN_ATTENTE', 'REUSSI', 'ECHOUE', 'REMBOURSE');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "PaymentProvider" AS ENUM ('MANUEL', 'STRIPE');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "ExpenseCategory" AS ENUM (
    'MATERIAUX', 'OUTILLAGE', 'CARBURANT', 'VEHICULE', 'SOUS_TRAITANCE',
    'ASSURANCE', 'TELECOM', 'LOYER', 'FOURNITURES', 'REPAS', 'FORMATION',
    'TAXES', 'AUTRE');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "DocumentTemplate" AS ENUM ('MINIMAL', 'MODERNE', 'EXECUTIF');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "StripeAccountStatus" AS ENUM ('ABSENT', 'EN_COURS', 'ACTIF', 'RESTREINT');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 3. Stripe Connect sur l'entreprise. Ce compte encaisse pour l'artisan ;
--    il est sans rapport avec l'abonnement DEVISERA.
ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "stripeAccountId"      TEXT;
ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "stripeAccountStatus"  "StripeAccountStatus" NOT NULL DEFAULT 'ABSENT';
ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "stripeChargesEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "stripePayoutsEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "stripeOnboardedAt"    TIMESTAMP(3);
CREATE UNIQUE INDEX IF NOT EXISTS "organizations_stripeAccountId_key" ON "organizations"("stripeAccountId");

-- 4. Marque documentaire.
ALTER TABLE "business_profiles" ADD COLUMN IF NOT EXISTS "documentTemplate" "DocumentTemplate" NOT NULL DEFAULT 'MODERNE';
ALTER TABLE "business_profiles" ADD COLUMN IF NOT EXISTS "documentFooter"   TEXT;
ALTER TABLE "business_profiles" ADD COLUMN IF NOT EXISTS "paymentDetails"   TEXT;
ALTER TABLE "business_profiles" ADD COLUMN IF NOT EXISTS "signatureFileId"  UUID;
DO $$ BEGIN
  ALTER TABLE "business_profiles"
    ADD CONSTRAINT "business_profiles_signatureFileId_fkey"
    FOREIGN KEY ("signatureFileId") REFERENCES "files"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 5. Factures : identité publique, lignes propres, suivi d'envoi et de règlement.
ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "createdById"           UUID;
ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "title"                 TEXT NOT NULL DEFAULT '';
ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "discountRate"          DECIMAL(5,2) NOT NULL DEFAULT 0;
ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "discountCents"         INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "netSubtotalCents"      INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "depositCents"          INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "terms"                 TEXT;
ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "paymentTerms"          TEXT;
ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "sentAt"                TIMESTAMP(3);
ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "paidAt"                TIMESTAMP(3);
ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "stripePaymentIntentId" TEXT;
ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "deletedAt"             TIMESTAMP(3);

-- publicToken : ajouté nullable, rempli pour les lignes existantes, puis rendu obligatoire.
ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "publicToken" TEXT;
UPDATE "invoices" SET "publicToken" = gen_random_uuid()::text WHERE "publicToken" IS NULL;
ALTER TABLE "invoices" ALTER COLUMN "publicToken" SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "invoices_publicToken_key" ON "invoices"("publicToken");

-- Le sous-total net des factures déjà émises vaut leur sous-total : aucune remise n'existait.
UPDATE "invoices" SET "netSubtotalCents" = "subtotalCents" WHERE "netSubtotalCents" = 0 AND "subtotalCents" <> 0;

DROP INDEX IF EXISTS "invoices_organizationId_status_idx";
CREATE INDEX IF NOT EXISTS "invoices_organizationId_status_deletedAt_idx" ON "invoices"("organizationId", "status", "deletedAt");
CREATE INDEX IF NOT EXISTS "invoices_organizationId_createdAt_idx"        ON "invoices"("organizationId", "createdAt");
CREATE INDEX IF NOT EXISTS "invoices_customerId_idx"                      ON "invoices"("customerId");

CREATE TABLE IF NOT EXISTS "invoice_items" (
    "id"             UUID NOT NULL,
    "invoiceId"      UUID NOT NULL,
    "kind"           "QuoteItemKind" NOT NULL DEFAULT 'MATERIAU',
    "label"          TEXT NOT NULL,
    "description"    TEXT,
    "unit"           TEXT NOT NULL DEFAULT 'u',
    "quantity"       DECIMAL(12,3) NOT NULL DEFAULT 1,
    "unitPriceCents" INTEGER NOT NULL DEFAULT 0,
    "discountRate"   DECIMAL(5,2) NOT NULL DEFAULT 0,
    "vatRate"        DECIMAL(5,2) NOT NULL DEFAULT 20,
    "lineTotalCents" INTEGER NOT NULL DEFAULT 0,
    "vatCents"       INTEGER NOT NULL DEFAULT 0,
    "position"       INTEGER NOT NULL DEFAULT 0,
    "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"      TIMESTAMP(3) NOT NULL,
    CONSTRAINT "invoice_items_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "invoice_items_invoiceId_position_idx" ON "invoice_items"("invoiceId", "position");
DO $$ BEGIN
  ALTER TABLE "invoice_items" ADD CONSTRAINT "invoice_items_invoiceId_fkey"
    FOREIGN KEY ("invoiceId") REFERENCES "invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 6. Encaissements : prestataire, statut et référence unique contre les rejeux.
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "currency"          TEXT NOT NULL DEFAULT 'EUR';
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "provider"          "PaymentProvider" NOT NULL DEFAULT 'MANUEL';
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "status"            "PaymentStatus" NOT NULL DEFAULT 'REUSSI';
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "providerReference" TEXT;
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "feeCents"          INTEGER;
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "failureReason"     TEXT;
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "refundedAt"        TIMESTAMP(3);
CREATE UNIQUE INDEX IF NOT EXISTS "payments_providerReference_key" ON "payments"("providerReference");
CREATE INDEX IF NOT EXISTS "payments_invoiceId_status_idx" ON "payments"("invoiceId", "status");

-- 7. Signatures de devis.
CREATE TABLE IF NOT EXISTS "quote_signatures" (
    "id"             UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "quoteId"        UUID NOT NULL,
    "signerName"     TEXT NOT NULL,
    "signerEmail"    TEXT,
    "strokePath"     TEXT NOT NULL,
    "documentHash"   TEXT NOT NULL,
    "totalCents"     INTEGER NOT NULL,
    "accepted"       BOOLEAN NOT NULL DEFAULT true,
    "ipAddress"      TEXT,
    "userAgent"      TEXT,
    "signedAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "invalidatedAt"  TIMESTAMP(3),
    "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "quote_signatures_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "quote_signatures_quoteId_signedAt_idx"        ON "quote_signatures"("quoteId", "signedAt");
CREATE INDEX IF NOT EXISTS "quote_signatures_organizationId_signedAt_idx" ON "quote_signatures"("organizationId", "signedAt");
DO $$ BEGIN
  ALTER TABLE "quote_signatures" ADD CONSTRAINT "quote_signatures_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "quote_signatures" ADD CONSTRAINT "quote_signatures_quoteId_fkey"
    FOREIGN KEY ("quoteId") REFERENCES "quotes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 8. Dépenses et justificatifs.
CREATE TABLE IF NOT EXISTS "expenses" (
    "id"             UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "createdById"    UUID,
    "jobId"          UUID,
    "merchant"       TEXT NOT NULL,
    "category"       "ExpenseCategory" NOT NULL DEFAULT 'AUTRE',
    "description"    TEXT,
    "spentAt"        TIMESTAMP(3) NOT NULL,
    "amountCents"    INTEGER NOT NULL,
    "vatCents"       INTEGER NOT NULL DEFAULT 0,
    "currency"       TEXT NOT NULL DEFAULT 'EUR',
    "reference"      TEXT,
    "paymentMethod"  "PaymentMethod" NOT NULL DEFAULT 'CARTE',
    "receiptFileId"  UUID,
    "parsed"         JSONB,
    "aiExtracted"    BOOLEAN NOT NULL DEFAULT false,
    "deletedAt"      TIMESTAMP(3),
    "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"      TIMESTAMP(3) NOT NULL,
    CONSTRAINT "expenses_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "expenses_organizationId_spentAt_idx"  ON "expenses"("organizationId", "spentAt");
CREATE INDEX IF NOT EXISTS "expenses_organizationId_category_idx" ON "expenses"("organizationId", "category");
DO $$ BEGIN
  ALTER TABLE "expenses" ADD CONSTRAINT "expenses_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "expenses" ADD CONSTRAINT "expenses_jobId_fkey"
    FOREIGN KEY ("jobId") REFERENCES "jobs"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "expenses" ADD CONSTRAINT "expenses_receiptFileId_fkey"
    FOREIGN KEY ("receiptFileId") REFERENCES "files"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
