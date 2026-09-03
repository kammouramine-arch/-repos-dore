/**
 * Contrats d'API DEVISIA.
 *
 * Ces types décrivent exactement ce que le serveur renvoie. Le web et le mobile
 * consomment les mêmes définitions : une évolution de l'API casse la
 * compilation des deux clients plutôt que de passer inaperçue.
 */
import type { PlanId, SubscriptionStatusId } from './plans';
import type {
  FollowUpTone,
  LeadStatusId,
  PriceBookCategoryId,
  QuoteEventTypeId,
  QuoteItemKindId,
  QuoteStatusId,
} from './labels';

export interface ApiError {
  code:
    | 'UNAUTHENTICATED'
    | 'FORBIDDEN'
    | 'NOT_FOUND'
    | 'VALIDATION'
    | 'CONFLICT'
    | 'RATE_LIMITED'
    | 'PLAN_LIMIT'
    | 'PROVIDER_UNAVAILABLE'
    // Émis par le client seul : la requête n'a jamais atteint le serveur.
    | 'NETWORK'
    | 'TIMEOUT'
    | 'INTERNAL';
  message: string;
  details?: Record<string, string[]>;
  retryable?: boolean;
}

export type ApiResponse<T> = { data: T } | { error: ApiError };

export interface SessionUserDTO {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  emailVerified: boolean;
}

export interface SessionOrganizationDTO {
  id: string;
  name: string;
  role: 'OWNER' | 'ADMIN' | 'MEMBER';
  trade: string | null;
  onboardingCompleted: boolean;
}

export interface SubscriptionDTO {
  plan: PlanId;
  status: SubscriptionStatusId;
  trialEndsAt: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
}

export interface SessionDTO {
  user: SessionUserDTO;
  organization: SessionOrganizationDTO;
  subscription: SubscriptionDTO | null;
  capabilities: {
    generation: boolean;
    vision: boolean;
    transcription: boolean;
    /** Fournisseur d'IA réellement actif côté serveur. */
    provider: 'gemini' | 'anthropic' | 'local';
  };
}

/** Réponse d'authentification mobile : jeton porteur + contexte. */
export interface AuthTokenDTO {
  token: string;
  expiresAt: string;
  session: SessionDTO;
}

export interface QuoteItemDTO {
  id: string;
  kind: QuoteItemKindId;
  label: string;
  description: string | null;
  unit: string;
  quantity: number;
  unitPriceCents: number;
  discountRate: number;
  vatRate: number;
  lineTotalCents: number;
  vatCents: number;
  position: number;
  priceBookItemId: string | null;
}

export interface QuoteSummaryDTO {
  id: string;
  number: string;
  title: string;
  status: QuoteStatusId;
  totalCents: number;
  customerId: string;
  customerName: string;
  sentAt: string | null;
  viewCount: number;
  createdAt: string;
  validUntil: string | null;
}

export interface QuoteDetailDTO extends QuoteSummaryDTO {
  summary: string | null;
  notes: string | null;
  terms: string | null;
  paymentTerms: string | null;
  subtotalCents: number;
  discountRate: number;
  discountCents: number;
  netSubtotalCents: number;
  vatCents: number;
  depositRate: number;
  depositCents: number;
  publicToken: string;
  publicUrl: string;
  acceptedAt: string | null;
  refusedAt: string | null;
  clientMessage: string | null;
  aiGenerated: boolean;
  aiConfidence: number | null;
  aiWarnings: string[];
  aiQuestions: string[];
  items: QuoteItemDTO[];
}

export interface CustomerDTO {
  id: string;
  firstName: string | null;
  lastName: string | null;
  companyName: string | null;
  displayName: string;
  email: string | null;
  phone: string | null;
  city: string | null;
  postalCode: string | null;
  addressLine1: string | null;
  quoteCount: number;
  acceptedCount: number;
  revenueCents: number;
}

export interface LeadDTO {
  id: string;
  contactName: string;
  title: string;
  description: string | null;
  status: LeadStatusId;
  source: string;
  email: string | null;
  phone: string | null;
  city: string | null;
  estimatedCents: number | null;
  customerId: string | null;
  lastActivityAt: string;
  createdAt: string;
}

export interface FollowUpSuggestionDTO {
  situation: 'NON_CONSULTE' | 'CONSULTE_SANS_REPONSE' | 'ANCIEN' | 'MODIFICATION_ATTENDUE' | 'RECENT';
  priority: number;
  tone: FollowUpTone;
  reason: string;
  recommended: boolean;
}

export interface RecoverableQuoteDTO {
  id: string;
  number: string;
  title: string;
  totalCents: number;
  status: QuoteStatusId;
  customerName: string;
  customerEmail: string | null;
  daysWaiting: number;
  viewCount: number;
  lastFollowUpAt: string | null;
  suggestion: FollowUpSuggestionDTO;
}

export interface DashboardDTO {
  greetingName: string;
  period: number;
  /** Montant total des devis envoyés : ce que l'artisan a chiffré. */
  quotedRevenueCents: number;
  revenuePotentialCents: number;
  quotesSent: number;
  averageQuoteCents: number;
  pendingQuotes: number;
  newLeads: number;
  toRecover: {
    totalCents: number;
    quoteCount: number;
    customerCount: number;
    quotes: RecoverableQuoteDTO[];
  };
  recentActivity: {
    id: string;
    type: QuoteEventTypeId;
    quoteId: string;
    quoteNumber: string;
    quoteTitle: string;
    totalCents: number;
    createdAt: string;
  }[];
}

export interface GeneratedLineDTO {
  kind: QuoteItemKindId;
  label: string;
  description: string | null;
  unit: string;
  quantity: number;
  unitPriceCents: number;
  discountRate: number;
  vatRate: number;
  priceBookItemId: string | null;
  fromCatalog: boolean;
}

export interface GeneratedQuoteDTO {
  title: string;
  summary: string;
  workDescription: string[];
  lines: GeneratedLineDTO[];
  questions: string[];
  warnings: string[];
  observations: string[];
  assumptions: string[];
  confidence: number;
  estimatedDurationMin: number | null;
  degraded: boolean;
  provider: string;
  /** Modèle qui a réellement rédigé le devis ; nul en mode dégradé. */
  model: string | null;
  /** Pourquoi le moteur local a pris le relais ; nul quand l'IA a répondu. */
  degradedReason: string | null;
  /** Jetons consommés ; nul en mode dégradé. Sert à chiffrer le coût réel. */
  usage: {
    inputTokens: number | null;
    outputTokens: number | null;
    thoughtsTokens: number | null;
    totalTokens: number | null;
    latencyMs: number;
  } | null;
  totals: {
    subtotalCents: number;
    discountCents: number;
    netSubtotalCents: number;
    vatCents: number;
    totalCents: number;
    depositCents: number;
  };
}

export interface FollowUpDraftDTO {
  objet: string;
  message: string;
  degraded: boolean;
}

export interface PriceBookItemDTO {
  id: string;
  reference: string | null;
  name: string;
  description: string | null;
  category: PriceBookCategoryId;
  unit: string;
  costPriceCents: number;
  salePriceCents: number;
  vatRate: number;
  keywords: string[];
  archivedAt?: string | null;
}

/** Profil d'entreprise, tel que l'API `/api/organisation` le rend et l'accepte. */
export interface BusinessProfileDTO {
  legalName: string;
  ownerName: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  postalCode: string | null;
  country: string;
  siret: string | null;
  vatNumber: string | null;
  insurance: string | null;
  trade: string;
  vatStatus: string;
  defaultVatRate: number | string;
  defaultHourlyCents: number;
  quoteValidityDays: number;
  paymentTerms: string | null;
  quoteTerms: string | null;
  quoteFooter: string | null;
  brandColor: string;
  logoFileId: string | null;
}

export interface NotificationDTO {
  id: string;
  title: string;
  body: string | null;
  href: string | null;
  readAt: string | null;
  createdAt: string;
}

export interface UsageDTO {
  period: string;
  aiGenerations: { used: number; limit: number | null };
  followUps: { used: number; limit: number | null };
  quotesSent: { used: number; limit: number | null };
  seats: number;
}

export interface BillingOverviewDTO {
  subscription: SubscriptionDTO;
  usage: UsageDTO;
  billingReady: boolean;
  canManage: boolean;
}
