-- CreateEnum
CREATE TYPE "Language" AS ENUM ('fr', 'en');

-- CreateEnum
CREATE TYPE "MemberRole" AS ENUM ('OWNER', 'ADMIN', 'MEMBER');

-- CreateEnum
CREATE TYPE "InvitationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REVOKED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "Trade" AS ENUM ('PLOMBIER', 'ELECTRICIEN', 'CHAUFFAGISTE', 'CLIMATICIEN', 'PEINTRE', 'COUVREUR', 'MENUISIER', 'MACON', 'PAYSAGISTE', 'RENOVATION', 'NETTOYAGE', 'DEPANNAGE', 'AUTRE');

-- CreateEnum
CREATE TYPE "VatStatus" AS ENUM ('ASSUJETTI', 'FRANCHISE_EN_BASE', 'AUTOLIQUIDATION');

-- CreateEnum
CREATE TYPE "LeadStatus" AS ENUM ('NOUVEAU', 'CONTACTE', 'QUALIFIE', 'DEVIS_ENVOYE', 'RELANCE', 'GAGNE', 'PERDU');

-- CreateEnum
CREATE TYPE "LeadSourceType" AS ENUM ('MANUEL', 'FORMULAIRE_WEB', 'EMAIL', 'SMS', 'WHATSAPP', 'TELEPHONE', 'STANDARD_IA', 'IMPORT', 'AUTRE');

-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('A_PLANIFIER', 'PLANIFIE', 'EN_COURS', 'TERMINE', 'ANNULE');

-- CreateEnum
CREATE TYPE "QuoteStatus" AS ENUM ('BROUILLON', 'ENVOYE', 'CONSULTE', 'ACCEPTE', 'REFUSE', 'MODIFICATION_DEMANDEE', 'EXPIRE', 'ANNULE');

-- CreateEnum
CREATE TYPE "QuoteItemKind" AS ENUM ('MATERIAU', 'MAIN_OEUVRE', 'SERVICE', 'PACK', 'FRAIS', 'REMISE');

-- CreateEnum
CREATE TYPE "PriceBookCategory" AS ENUM ('MATERIAU', 'SERVICE', 'MAIN_OEUVRE', 'PACK');

-- CreateEnum
CREATE TYPE "FollowUpChannel" AS ENUM ('EMAIL', 'SMS', 'WHATSAPP', 'APPEL');

-- CreateEnum
CREATE TYPE "FollowUpStatus" AS ENUM ('SUGGEREE', 'PLANIFIEE', 'ENVOYEE', 'ANNULEE', 'ECHOUEE');

-- CreateEnum
CREATE TYPE "AutomationTrigger" AS ENUM ('DEVIS_NON_CONSULTE', 'DEVIS_CONSULTE_SANS_REPONSE', 'DEVIS_SANS_REPONSE', 'FACTURE_IMPAYEE', 'PROSPECT_SANS_SUITE');

-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('BROUILLON', 'ENVOYEE', 'PARTIELLE', 'PAYEE', 'EN_RETARD', 'ANNULEE');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('VIREMENT', 'CARTE', 'ESPECES', 'CHEQUE', 'AUTRE');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('DEVIS_CONSULTE', 'DEVIS_ACCEPTE', 'DEVIS_REFUSE', 'DEVIS_MODIFICATION', 'DEVIS_ENVOYE', 'RELANCE_A_FAIRE', 'RELANCE_ENVOYEE', 'NOUVEAU_PROSPECT', 'FACTURE_PAYEE', 'ABONNEMENT', 'SYSTEME');

-- CreateEnum
CREATE TYPE "SubscriptionPlan" AS ENUM ('ESSENTIEL', 'PRO', 'ENTREPRISE');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('trialing', 'active', 'past_due', 'canceled', 'incomplete');

-- CreateEnum
CREATE TYPE "UsageMetric" AS ENUM ('AI_GENERATION', 'AI_TRANSCRIPTION', 'AI_IMAGE_ANALYSIS', 'FOLLOWUP_SENT', 'QUOTE_SENT', 'SEAT');

-- CreateEnum
CREATE TYPE "FileKind" AS ENUM ('LOGO', 'PHOTO_CHANTIER', 'PIECE_JOINTE', 'DEVIS_IMPORTE', 'CATALOGUE_IMPORTE', 'AUTRE');

-- CreateEnum
CREATE TYPE "AIRequestKind" AS ENUM ('QUOTE_DRAFT', 'TRANSCRIPTION', 'IMAGE_ANALYSIS', 'MESSAGE_DRAFT', 'PRICEBOOK_EXTRACTION', 'ASSISTANT');

-- CreateEnum
CREATE TYPE "AIRequestStatus" AS ENUM ('OK', 'ERREUR');

-- CreateEnum
CREATE TYPE "MessageChannel" AS ENUM ('EMAIL', 'SMS', 'WHATSAPP', 'APPEL', 'NOTE', 'PORTAIL');

-- CreateEnum
CREATE TYPE "MessageDirection" AS ENUM ('ENTRANT', 'SORTANT');

-- CreateEnum
CREATE TYPE "IntegrationProvider" AS ENUM ('STRIPE', 'RESEND', 'TWILIO', 'WHATSAPP', 'GOOGLE_CALENDAR', 'GOOGLE_BUSINESS', 'QUICKBOOKS', 'XERO', 'SAGE', 'ZAPIER', 'MAKE');

-- CreateEnum
CREATE TYPE "IntegrationStatus" AS ENUM ('DISPONIBLE', 'CONNECTEE', 'ERREUR', 'BIENTOT');

-- CreateEnum
CREATE TYPE "AuthTokenKind" AS ENUM ('EMAIL_VERIFICATION', 'PASSWORD_RESET');

-- CreateEnum
CREATE TYPE "QuoteEventType" AS ENUM ('CREE', 'MODIFIE', 'ENVOYE', 'CONSULTE', 'ACCEPTE', 'REFUSE', 'MODIFICATION_DEMANDEE', 'RELANCE', 'PDF_TELECHARGE', 'ANNULE');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "firstName" TEXT,
    "lastName" TEXT,
    "phone" TEXT,
    "locale" "Language" NOT NULL DEFAULT 'fr',
    "emailVerifiedAt" TIMESTAMP(3),
    "isPlatformAdmin" BOOLEAN NOT NULL DEFAULT false,
    "lastLoginAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "userAgent" TEXT,
    "ipAddress" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auth_tokens" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "kind" "AuthTokenKind" NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "auth_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organizations" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "locale" "Language" NOT NULL DEFAULT 'fr',
    "country" TEXT NOT NULL DEFAULT 'FR',
    "timezone" TEXT NOT NULL DEFAULT 'Europe/Paris',
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organization_members" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "role" "MemberRole" NOT NULL DEFAULT 'MEMBER',
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organization_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "team_invitations" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "role" "MemberRole" NOT NULL DEFAULT 'MEMBER',
    "tokenHash" TEXT NOT NULL,
    "status" "InvitationStatus" NOT NULL DEFAULT 'PENDING',
    "invitedById" UUID,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "acceptedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "team_invitations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "business_profiles" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "legalName" TEXT NOT NULL,
    "ownerName" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "website" TEXT,
    "addressLine1" TEXT,
    "addressLine2" TEXT,
    "city" TEXT,
    "postalCode" TEXT,
    "country" TEXT NOT NULL DEFAULT 'FR',
    "siret" TEXT,
    "vatNumber" TEXT,
    "insurance" TEXT,
    "trade" "Trade" NOT NULL DEFAULT 'AUTRE',
    "vatStatus" "VatStatus" NOT NULL DEFAULT 'ASSUJETTI',
    "defaultVatRate" DECIMAL(5,2) NOT NULL DEFAULT 20,
    "defaultHourlyCents" INTEGER NOT NULL DEFAULT 4500,
    "paymentTerms" TEXT,
    "quoteValidityDays" INTEGER NOT NULL DEFAULT 30,
    "quoteFooter" TEXT,
    "quoteTerms" TEXT,
    "brandColor" TEXT NOT NULL DEFAULT '#0F62FE',
    "logoFileId" UUID,
    "onboardingCompleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "business_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "settings" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "notifyOnQuoteViewed" BOOLEAN NOT NULL DEFAULT true,
    "notifyOnQuoteAccepted" BOOLEAN NOT NULL DEFAULT true,
    "notifyOnQuoteRefused" BOOLEAN NOT NULL DEFAULT true,
    "notifyOnNewLead" BOOLEAN NOT NULL DEFAULT true,
    "notifyByEmail" BOOLEAN NOT NULL DEFAULT true,
    "followUpsEnabled" BOOLEAN NOT NULL DEFAULT true,
    "aiTone" TEXT NOT NULL DEFAULT 'professionnel',
    "aiSignature" TEXT,
    "publicLeadFormEnabled" BOOLEAN NOT NULL DEFAULT true,
    "publicLeadFormToken" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "document_counters" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "kind" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "lastNumber" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "document_counters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customers" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "firstName" TEXT,
    "lastName" TEXT,
    "companyName" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "addressLine1" TEXT,
    "addressLine2" TEXT,
    "city" TEXT,
    "postalCode" TEXT,
    "country" TEXT NOT NULL DEFAULT 'FR',
    "notes" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "source" "LeadSourceType" NOT NULL DEFAULT 'MANUEL',
    "lastContactAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leads" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "customerId" UUID,
    "contactName" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "city" TEXT,
    "postalCode" TEXT,
    "addressLine1" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "jobType" TEXT,
    "status" "LeadStatus" NOT NULL DEFAULT 'NOUVEAU',
    "source" "LeadSourceType" NOT NULL DEFAULT 'MANUEL',
    "sourceDetail" TEXT,
    "estimatedCents" INTEGER,
    "lastActivityAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "nextFollowUpAt" TIMESTAMP(3),
    "lostReason" TEXT,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "leads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "jobs" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "customerId" UUID NOT NULL,
    "leadId" UUID,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" "JobStatus" NOT NULL DEFAULT 'A_PLANIFIER',
    "addressLine1" TEXT,
    "city" TEXT,
    "postalCode" TEXT,
    "scheduledAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quotes" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "customerId" UUID NOT NULL,
    "leadId" UUID,
    "jobId" UUID,
    "createdById" UUID,
    "number" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT,
    "introduction" TEXT,
    "status" "QuoteStatus" NOT NULL DEFAULT 'BROUILLON',
    "subtotalCents" INTEGER NOT NULL DEFAULT 0,
    "discountRate" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "discountCents" INTEGER NOT NULL DEFAULT 0,
    "netSubtotalCents" INTEGER NOT NULL DEFAULT 0,
    "vatCents" INTEGER NOT NULL DEFAULT 0,
    "totalCents" INTEGER NOT NULL DEFAULT 0,
    "depositRate" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "depositCents" INTEGER NOT NULL DEFAULT 0,
    "estimatedDurationMin" INTEGER,
    "notes" TEXT,
    "terms" TEXT,
    "paymentTerms" TEXT,
    "validUntil" TIMESTAMP(3),
    "publicToken" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3),
    "firstViewedAt" TIMESTAMP(3),
    "lastViewedAt" TIMESTAMP(3),
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "respondedAt" TIMESTAMP(3),
    "acceptedAt" TIMESTAMP(3),
    "refusedAt" TIMESTAMP(3),
    "clientMessage" TEXT,
    "signatureName" TEXT,
    "aiGenerated" BOOLEAN NOT NULL DEFAULT false,
    "aiConfidence" INTEGER,
    "aiWarnings" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "aiQuestions" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "quotes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quote_items" (
    "id" UUID NOT NULL,
    "quoteId" UUID NOT NULL,
    "priceBookItemId" UUID,
    "kind" "QuoteItemKind" NOT NULL DEFAULT 'MATERIAU',
    "label" TEXT NOT NULL,
    "description" TEXT,
    "unit" TEXT NOT NULL DEFAULT 'u',
    "quantity" DECIMAL(12,3) NOT NULL DEFAULT 1,
    "unitPriceCents" INTEGER NOT NULL DEFAULT 0,
    "costPriceCents" INTEGER,
    "discountRate" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "vatRate" DECIMAL(5,2) NOT NULL DEFAULT 20,
    "lineTotalCents" INTEGER NOT NULL DEFAULT 0,
    "vatCents" INTEGER NOT NULL DEFAULT 0,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "quote_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quote_events" (
    "id" UUID NOT NULL,
    "quoteId" UUID NOT NULL,
    "type" "QuoteEventType" NOT NULL,
    "actor" TEXT,
    "ipHash" TEXT,
    "userAgent" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "quote_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "price_book_items" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "reference" TEXT,
    "sku" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" "PriceBookCategory" NOT NULL DEFAULT 'MATERIAU',
    "unit" TEXT NOT NULL DEFAULT 'u',
    "costPriceCents" INTEGER NOT NULL DEFAULT 0,
    "salePriceCents" INTEGER NOT NULL DEFAULT 0,
    "vatRate" DECIMAL(5,2) NOT NULL DEFAULT 20,
    "supplier" TEXT,
    "keywords" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "price_book_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "automations" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "trigger" "AutomationTrigger" NOT NULL,
    "channel" "FollowUpChannel" NOT NULL DEFAULT 'EMAIL',
    "delayHours" INTEGER NOT NULL DEFAULT 24,
    "maxAttempts" INTEGER NOT NULL DEFAULT 3,
    "requireApproval" BOOLEAN NOT NULL DEFAULT true,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "template" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "automations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "follow_ups" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "quoteId" UUID,
    "invoiceId" UUID,
    "automationId" UUID,
    "channel" "FollowUpChannel" NOT NULL DEFAULT 'EMAIL',
    "status" "FollowUpStatus" NOT NULL DEFAULT 'SUGGEREE',
    "attempt" INTEGER NOT NULL DEFAULT 1,
    "subject" TEXT,
    "body" TEXT NOT NULL,
    "scheduledFor" TIMESTAMP(3) NOT NULL,
    "sentAt" TIMESTAMP(3),
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "follow_ups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conversations" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "customerId" UUID,
    "channel" "MessageChannel" NOT NULL DEFAULT 'EMAIL',
    "subject" TEXT,
    "lastMessageAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "conversations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "messages" (
    "id" UUID NOT NULL,
    "conversationId" UUID NOT NULL,
    "direction" "MessageDirection" NOT NULL DEFAULT 'SORTANT',
    "channel" "MessageChannel" NOT NULL DEFAULT 'EMAIL',
    "authorName" TEXT,
    "subject" TEXT,
    "body" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoices" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "customerId" UUID NOT NULL,
    "quoteId" UUID,
    "jobId" UUID,
    "number" TEXT NOT NULL,
    "status" "InvoiceStatus" NOT NULL DEFAULT 'BROUILLON',
    "issuedAt" TIMESTAMP(3),
    "dueAt" TIMESTAMP(3),
    "subtotalCents" INTEGER NOT NULL DEFAULT 0,
    "vatCents" INTEGER NOT NULL DEFAULT 0,
    "totalCents" INTEGER NOT NULL DEFAULT 0,
    "paidCents" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "invoiceId" UUID NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "method" "PaymentMethod" NOT NULL DEFAULT 'VIREMENT',
    "reference" TEXT,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscriptions" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "plan" "SubscriptionPlan" NOT NULL DEFAULT 'ESSENTIEL',
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'trialing',
    "stripeCustomerId" TEXT,
    "stripeSubscriptionId" TEXT,
    "currentPeriodEnd" TIMESTAMP(3),
    "trialEndsAt" TIMESTAMP(3),
    "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
    "seats" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usage_records" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "metric" "UsageMetric" NOT NULL,
    "period" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "usage_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "files" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "kind" "FileKind" NOT NULL DEFAULT 'AUTRE',
    "storageKey" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "width" INTEGER,
    "height" INTEGER,
    "quoteId" UUID,
    "leadId" UUID,
    "jobId" UUID,
    "uploadedById" UUID,
    "metadata" JSONB,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "files_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_requests" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "userId" UUID,
    "kind" "AIRequestKind" NOT NULL,
    "provider" TEXT NOT NULL,
    "model" TEXT,
    "status" "AIRequestStatus" NOT NULL DEFAULT 'OK',
    "latencyMs" INTEGER,
    "inputTokens" INTEGER,
    "outputTokens" INTEGER,
    "costCents" INTEGER,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL,
    "organizationId" UUID,
    "userId" UUID,
    "action" TEXT NOT NULL,
    "entityType" TEXT,
    "entityId" TEXT,
    "ipHash" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "userId" UUID,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT,
    "href" TEXT,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "integrations" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "provider" "IntegrationProvider" NOT NULL,
    "status" "IntegrationStatus" NOT NULL DEFAULT 'DISPONIBLE',
    "externalId" TEXT,
    "config" JSONB,
    "connectedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "integrations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "analytics_events" (
    "id" UUID NOT NULL,
    "organizationId" UUID,
    "userId" UUID,
    "name" TEXT NOT NULL,
    "properties" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "analytics_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "webhook_events" (
    "id" UUID NOT NULL,
    "provider" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "processedAt" TIMESTAMP(3),
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "webhook_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_deletedAt_idx" ON "users"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_tokenHash_key" ON "sessions"("tokenHash");

-- CreateIndex
CREATE INDEX "sessions_userId_idx" ON "sessions"("userId");

-- CreateIndex
CREATE INDEX "sessions_expiresAt_idx" ON "sessions"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "auth_tokens_tokenHash_key" ON "auth_tokens"("tokenHash");

-- CreateIndex
CREATE INDEX "auth_tokens_userId_kind_idx" ON "auth_tokens"("userId", "kind");

-- CreateIndex
CREATE UNIQUE INDEX "organizations_slug_key" ON "organizations"("slug");

-- CreateIndex
CREATE INDEX "organizations_deletedAt_idx" ON "organizations"("deletedAt");

-- CreateIndex
CREATE INDEX "organization_members_userId_idx" ON "organization_members"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "organization_members_organizationId_userId_key" ON "organization_members"("organizationId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "team_invitations_tokenHash_key" ON "team_invitations"("tokenHash");

-- CreateIndex
CREATE INDEX "team_invitations_organizationId_status_idx" ON "team_invitations"("organizationId", "status");

-- CreateIndex
CREATE INDEX "team_invitations_email_idx" ON "team_invitations"("email");

-- CreateIndex
CREATE UNIQUE INDEX "business_profiles_organizationId_key" ON "business_profiles"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "settings_organizationId_key" ON "settings"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "settings_publicLeadFormToken_key" ON "settings"("publicLeadFormToken");

-- CreateIndex
CREATE UNIQUE INDEX "document_counters_organizationId_kind_year_key" ON "document_counters"("organizationId", "kind", "year");

-- CreateIndex
CREATE INDEX "customers_organizationId_deletedAt_idx" ON "customers"("organizationId", "deletedAt");

-- CreateIndex
CREATE INDEX "customers_organizationId_lastName_idx" ON "customers"("organizationId", "lastName");

-- CreateIndex
CREATE INDEX "customers_organizationId_email_idx" ON "customers"("organizationId", "email");

-- CreateIndex
CREATE INDEX "leads_organizationId_status_deletedAt_idx" ON "leads"("organizationId", "status", "deletedAt");

-- CreateIndex
CREATE INDEX "leads_organizationId_nextFollowUpAt_idx" ON "leads"("organizationId", "nextFollowUpAt");

-- CreateIndex
CREATE INDEX "jobs_organizationId_status_deletedAt_idx" ON "jobs"("organizationId", "status", "deletedAt");

-- CreateIndex
CREATE INDEX "jobs_customerId_idx" ON "jobs"("customerId");

-- CreateIndex
CREATE UNIQUE INDEX "quotes_publicToken_key" ON "quotes"("publicToken");

-- CreateIndex
CREATE INDEX "quotes_organizationId_status_deletedAt_idx" ON "quotes"("organizationId", "status", "deletedAt");

-- CreateIndex
CREATE INDEX "quotes_organizationId_createdAt_idx" ON "quotes"("organizationId", "createdAt");

-- CreateIndex
CREATE INDEX "quotes_customerId_idx" ON "quotes"("customerId");

-- CreateIndex
CREATE UNIQUE INDEX "quotes_organizationId_number_key" ON "quotes"("organizationId", "number");

-- CreateIndex
CREATE INDEX "quote_items_quoteId_position_idx" ON "quote_items"("quoteId", "position");

-- CreateIndex
CREATE INDEX "quote_events_quoteId_createdAt_idx" ON "quote_events"("quoteId", "createdAt");

-- CreateIndex
CREATE INDEX "price_book_items_organizationId_category_deletedAt_idx" ON "price_book_items"("organizationId", "category", "deletedAt");

-- CreateIndex
CREATE INDEX "price_book_items_organizationId_name_idx" ON "price_book_items"("organizationId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "price_book_items_organizationId_reference_key" ON "price_book_items"("organizationId", "reference");

-- CreateIndex
CREATE INDEX "automations_organizationId_isActive_idx" ON "automations"("organizationId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "automations_organizationId_trigger_delayHours_key" ON "automations"("organizationId", "trigger", "delayHours");

-- CreateIndex
CREATE INDEX "follow_ups_organizationId_status_scheduledFor_idx" ON "follow_ups"("organizationId", "status", "scheduledFor");

-- CreateIndex
CREATE INDEX "follow_ups_quoteId_idx" ON "follow_ups"("quoteId");

-- CreateIndex
CREATE INDEX "conversations_organizationId_lastMessageAt_idx" ON "conversations"("organizationId", "lastMessageAt");

-- CreateIndex
CREATE INDEX "messages_conversationId_createdAt_idx" ON "messages"("conversationId", "createdAt");

-- CreateIndex
CREATE INDEX "invoices_organizationId_status_idx" ON "invoices"("organizationId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_organizationId_number_key" ON "invoices"("organizationId", "number");

-- CreateIndex
CREATE INDEX "payments_organizationId_receivedAt_idx" ON "payments"("organizationId", "receivedAt");

-- CreateIndex
CREATE UNIQUE INDEX "subscriptions_organizationId_key" ON "subscriptions"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "subscriptions_stripeCustomerId_key" ON "subscriptions"("stripeCustomerId");

-- CreateIndex
CREATE UNIQUE INDEX "subscriptions_stripeSubscriptionId_key" ON "subscriptions"("stripeSubscriptionId");

-- CreateIndex
CREATE INDEX "subscriptions_status_idx" ON "subscriptions"("status");

-- CreateIndex
CREATE UNIQUE INDEX "usage_records_organizationId_metric_period_key" ON "usage_records"("organizationId", "metric", "period");

-- CreateIndex
CREATE UNIQUE INDEX "files_storageKey_key" ON "files"("storageKey");

-- CreateIndex
CREATE INDEX "files_organizationId_kind_idx" ON "files"("organizationId", "kind");

-- CreateIndex
CREATE INDEX "ai_requests_organizationId_createdAt_idx" ON "ai_requests"("organizationId", "createdAt");

-- CreateIndex
CREATE INDEX "ai_requests_kind_createdAt_idx" ON "ai_requests"("kind", "createdAt");

-- CreateIndex
CREATE INDEX "audit_logs_organizationId_createdAt_idx" ON "audit_logs"("organizationId", "createdAt");

-- CreateIndex
CREATE INDEX "audit_logs_action_createdAt_idx" ON "audit_logs"("action", "createdAt");

-- CreateIndex
CREATE INDEX "notifications_organizationId_readAt_createdAt_idx" ON "notifications"("organizationId", "readAt", "createdAt");

-- CreateIndex
CREATE INDEX "notifications_userId_readAt_idx" ON "notifications"("userId", "readAt");

-- CreateIndex
CREATE UNIQUE INDEX "integrations_organizationId_provider_key" ON "integrations"("organizationId", "provider");

-- CreateIndex
CREATE INDEX "analytics_events_name_createdAt_idx" ON "analytics_events"("name", "createdAt");

-- CreateIndex
CREATE INDEX "analytics_events_organizationId_createdAt_idx" ON "analytics_events"("organizationId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "webhook_events_provider_externalId_key" ON "webhook_events"("provider", "externalId");

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auth_tokens" ADD CONSTRAINT "auth_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organization_members" ADD CONSTRAINT "organization_members_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organization_members" ADD CONSTRAINT "organization_members_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_invitations" ADD CONSTRAINT "team_invitations_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_profiles" ADD CONSTRAINT "business_profiles_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_profiles" ADD CONSTRAINT "business_profiles_logoFileId_fkey" FOREIGN KEY ("logoFileId") REFERENCES "files"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "settings" ADD CONSTRAINT "settings_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_counters" ADD CONSTRAINT "document_counters_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customers" ADD CONSTRAINT "customers_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "leads"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "leads"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "jobs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quote_items" ADD CONSTRAINT "quote_items_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "quotes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quote_items" ADD CONSTRAINT "quote_items_priceBookItemId_fkey" FOREIGN KEY ("priceBookItemId") REFERENCES "price_book_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quote_events" ADD CONSTRAINT "quote_events_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "quotes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "price_book_items" ADD CONSTRAINT "price_book_items_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "automations" ADD CONSTRAINT "automations_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "follow_ups" ADD CONSTRAINT "follow_ups_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "follow_ups" ADD CONSTRAINT "follow_ups_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "quotes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "follow_ups" ADD CONSTRAINT "follow_ups_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "follow_ups" ADD CONSTRAINT "follow_ups_automationId_fkey" FOREIGN KEY ("automationId") REFERENCES "automations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "quotes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "jobs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "invoices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usage_records" ADD CONSTRAINT "usage_records_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "files" ADD CONSTRAINT "files_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "files" ADD CONSTRAINT "files_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "quotes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "files" ADD CONSTRAINT "files_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "leads"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "files" ADD CONSTRAINT "files_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "jobs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_requests" ADD CONSTRAINT "ai_requests_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_requests" ADD CONSTRAINT "ai_requests_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "integrations" ADD CONSTRAINT "integrations_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "analytics_events" ADD CONSTRAINT "analytics_events_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
