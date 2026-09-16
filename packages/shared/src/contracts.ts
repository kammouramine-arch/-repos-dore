import type { AiConsentDTO } from './ai-consent';
/**
 * Contrats d'API DEVISERA.
 *
 * Ces types décrivent exactement ce que le serveur renvoie. Le web et le mobile
 * consomment les mêmes définitions : une évolution de l'API casse la
 * compilation des deux clients plutôt que de passer inaperçue.
 */
import type { PlanId, SubscriptionStatusId } from './plans';
import type { AccessState } from './entitlements';
import type { AuthIdentityProvider, AuthNextStep } from './auth-flow';
import type {
  DocumentTemplateId,
  ExpenseCategoryId,
  FollowUpTone,
  InvoiceStatusId,
  LeadStatusId,
  MemberRoleId,
  PaymentMethodId,
  PaymentProviderId,
  PaymentStatusId,
  PriceBookCategoryId,
  QuoteEventTypeId,
  QuoteItemKindId,
  QuoteStatusId,
  StripeAccountStatusId,
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
    // Aucune donnée n'a été transmise au fournisseur d'IA : l'utilisateur doit d'abord autoriser.
    | 'AI_CONSENT_REQUIRED'
    // Émis par le client seul : la requête n'a jamais atteint le serveur.
    | 'NETWORK'
    | 'TIMEOUT'
    | 'INTERNAL';
  message: string;
  details?: Record<string, string[]>;
  retryable?: boolean;
  retryAfterSeconds?: number;
  /** Référence courte d'une erreur serveur, pour retrouver la ligne de journal. */
  requestId?: string;
}

export type ApiResponse<T> = { data: T } | { error: ApiError };

/** Where a language value comes from; only `explicit` may override the device language. */
export type LanguageSource = 'explicit' | 'inferred' | 'reset';

export interface SessionUserDTO {
  /** Optional for older cached sessions; French is the compatible default. */
  locale?: 'fr' | 'en';
  /**
   * ISO date of the user's explicit language choice, or null when `locale`
   * was only inferred (sign-up device, defaults). Clients follow the device
   * language until a choice exists; an inferred value never overrides it.
   */
  localeChosenAt?: string | null;
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  emailVerified: boolean;
  /** False for an account created with Apple or Google that never set a password. */
  hasPassword?: boolean;
  /** Sign-in providers attached to this account. */
  identities?: AuthIdentityProvider[];
}

export interface SessionOrganizationDTO {
  id: string;
  name: string;
  role: MemberRoleId;
  trade: string | null;
  onboardingCompleted: boolean;
  /** True until an Apple/Google sign-up names their business (`nextStep` = onboarding). */
  setupPending?: boolean;
}

/** Native Sign in with Apple result, verified server-side. */
export interface AppleSignInInput {
  identityToken: string;
  authorizationCode?: string | null;
  /** Raw nonce whose SHA-256 was handed to Apple; proves the token was minted for this request. */
  nonce?: string | null;
  /** Provided by Apple on the first authorization only. */
  fullName?: { givenName?: string | null; familyName?: string | null } | null;
  deviceName?: string;
  locale?: 'fr' | 'en';
}

export interface GoogleSignInInput {
  idToken: string;
  deviceName?: string;
  locale?: 'fr' | 'en';
}

export interface OnboardingInput {
  companyName: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  trade?: string;
}

export interface SubscriptionDTO {
  provider?: 'apple' | 'stripe' | 'trial';
  appleEnvironment?: string | null;
  plan: PlanId;
  status: SubscriptionStatusId;
  trialEndsAt: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  /** Formule que Apple appliquera au prochain renouvellement (rétrogradation enregistrée). */
  pendingPlan?: PlanId | null;
  /** Date à laquelle `pendingPlan` prend effet (fin de la période en cours). */
  pendingAt?: string | null;
}

export interface SessionDTO {
  user: SessionUserDTO;
  organization: SessionOrganizationDTO;
  subscription: SubscriptionDTO | null;
  /** Server-authoritative entitlement state used by clients for routing/UI. */
  access: AccessState;
  /** The only valid next destination for this authenticated session. */
  nextStep: AuthNextStep;
  capabilities: {
    generation: boolean;
    vision: boolean;
    transcription: boolean;
    /** Fournisseur d'IA réellement actif côté serveur. */
    provider: 'gemini' | 'anthropic' | 'local';
  };
  /**
   * Décision de l'utilisateur sur l'envoi de données au fournisseur d'IA.
   * Optionnel pour les sessions mises en cache avant son introduction.
   */
  aiConsent?: AiConsentDTO | null;
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
  sentCount: number;
  /** Montant cumulé des devis envoyés, pas un chiffre d’affaires supposé gagné. */
  revenueCents: number;
}

export interface CustomerProfileDTO {
  customer: CustomerDTO & { notes: string | null; tags: string[]; createdAt: string };
  stats: { quoteCount: number; sentCount: number; jobCount: number; revenueCents: number; pendingCents: number };
  quotes: { id: string; number: string; title: string; status: string; totalCents: number; createdAt: string; sentAt: string | null }[];
  /** Latest recorded events only; never inferred opens or fabricated activity. */
  activity?: { id: string; type: string; at: string; quoteId: string; quoteNumber: string }[];
  jobs?: { id: string; title: string; status: string; scheduledAt: string | null; completedAt: string | null }[];
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
  /** Faux quand le message est un modèle local, sans envoi au fournisseur d'IA. */
  aiUsed?: boolean;
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
  aiTranscriptions: { used: number; limit: number | null };
  aiImageAnalyses: { used: number; limit: number | null };
  followUps: { used: number; limit: number | null };
  quotesSent: { used: number; limit: number | null };
  seats: number;
}

/**
 * Un paiement tel que l'application le présente. Source et statut viennent du
 * serveur (Apple ou web) ; l'application n'invente ni devise ni montant.
 */
export interface PaymentDTO {
  id: string;
  /** Date ISO du paiement. */
  date: string;
  amountCents: number;
  /** Code ISO 4217 tel que renvoyé par le fournisseur (EUR, USD…). */
  currency: string;
  source: 'apple' | 'web';
  status: 'paid' | 'pending' | 'failed' | 'refunded';
  /** Libellé court : formule et période. */
  label: string;
  /** Reçu ou facture consultable, s'il existe. */
  receiptUrl: string | null;
}

export interface PaymentHistoryDTO {
  items: PaymentDTO[];
}

export interface BillingOverviewDTO {
  subscription: SubscriptionDTO;
  usage: UsageDTO;
  billingReady: boolean;
  canManage: boolean;
}

export interface BillingHistoryEntryDTO {
  id: string;
  date: string;
  amountCents: number;
  currency: string;
  status: 'paid' | 'open' | 'failed' | 'void' | 'uncollectible' | 'unknown';
  description: string;
  receiptUrl: string | null;
}

/**
 * Billing history is deliberately provider-aware. Apple does not expose
 * subscription invoices to the app API, so the mobile client receives links
 * to Apple's own management/history surfaces instead of fabricated records.
 */
export interface BillingHistoryDTO {
  provider: 'apple' | 'stripe' | 'trial';
  entries: BillingHistoryEntryDTO[];
  manageUrl: string | null;
  receiptsUrl: string | null;
  manageAction: 'apple_subscriptions' | 'stripe_portal' | null;
  note: string;
}

// ---------------------------------------------------------------------------
// Signature du devis par le client
// ---------------------------------------------------------------------------

/**
 * Signature apposée par le client sur un devis.
 *
 * Acceptation électronique simple : identité déclarée, case d'acceptation
 * explicite et tracé manuscrit. Ce n'est pas une signature électronique
 * qualifiée au sens eIDAS, et aucun écran ne le laisse entendre.
 */
export interface QuoteSignatureDTO {
  id: string;
  signerName: string;
  signerEmail: string | null;
  /** Tracé normalisé dans un carré de 1000 × 400, prêt à rendre en SVG. */
  strokePath: string;
  signedAt: string;
  totalCents: number;
  /** Renseigné quand une modification du devis a invalidé cette signature. */
  invalidatedAt: string | null;
}

export interface SignQuoteInput {
  signerName: string;
  signerEmail?: string;
  strokePath: string;
  accepted: true;
}

/** Devis tel que le client le voit sur son lien public, avant signature. */
export interface PublicQuoteDTO {
  id: string;
  number: string;
  title: string;
  status: QuoteStatusId;
  businessName: string;
  businessEmail: string | null;
  businessPhone: string | null;
  brandColor: string;
  logoUrl: string | null;
  customerName: string;
  introduction: string | null;
  items: {
    kind: QuoteItemKindId;
    label: string;
    description: string | null;
    unit: string;
    quantity: number;
    unitPriceCents: number;
    lineTotalCents: number;
    vatRate: number;
  }[];
  subtotalCents: number;
  discountCents: number;
  vatCents: number;
  totalCents: number;
  depositCents: number;
  validUntil: string | null;
  terms: string | null;
  paymentTerms: string | null;
  notes: string | null;
  signature: QuoteSignatureDTO | null;
  /** Faux quand le devis n'accepte plus de signature (expiré, annulé, déjà signé). */
  signable: boolean;
  pdfUrl: string;
}

// ---------------------------------------------------------------------------
// Factures et encaissement
// ---------------------------------------------------------------------------

export interface InvoiceItemDTO {
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
}

/**
 * Encaissement d'une facture de l'artisan par son client.
 *
 * À ne pas confondre avec `PaymentDTO`, qui décrit les prélèvements de
 * l'abonnement DEVISERA lui-même. Les deux flux d'argent sont distincts :
 * celui-ci part vers le compte Stripe de l'artisan.
 */
export interface InvoicePaymentDTO {
  id: string;
  amountCents: number;
  currency: string;
  method: PaymentMethodId;
  provider: PaymentProviderId;
  status: PaymentStatusId;
  reference: string | null;
  receivedAt: string;
  refundedAt: string | null;
  failureReason: string | null;
}

export interface InvoiceSummaryDTO {
  id: string;
  number: string;
  title: string;
  status: InvoiceStatusId;
  customerId: string;
  customerName: string;
  totalCents: number;
  paidCents: number;
  /** Restant dû après acompte et encaissements. */
  balanceCents: number;
  issuedAt: string | null;
  dueAt: string | null;
  paidAt: string | null;
  /** Vrai quand l'échéance est dépassée et le solde non nul. */
  overdue: boolean;
  quoteId: string | null;
  createdAt: string;
}

export interface InvoiceDetailDTO extends InvoiceSummaryDTO {
  customerEmail: string | null;
  subtotalCents: number;
  discountRate: number;
  discountCents: number;
  netSubtotalCents: number;
  vatCents: number;
  depositCents: number;
  notes: string | null;
  terms: string | null;
  paymentTerms: string | null;
  sentAt: string | null;
  items: InvoiceItemDTO[];
  payments: InvoicePaymentDTO[];
  publicUrl: string;
  pdfUrl: string;
  /** Vrai quand l'entreprise peut encaisser en ligne (Stripe actif). */
  onlinePaymentAvailable: boolean;
}

export interface CreateInvoiceFromQuoteInput {
  quoteId: string;
  /** Échéance en jours à compter de l'émission ; par défaut celle du profil. */
  dueInDays?: number;
  /** Déduire l'acompte déjà réglé sur le devis. */
  deductDeposit?: boolean;
}

export interface RecordPaymentInput {
  amountCents: number;
  method: PaymentMethodId;
  reference?: string;
  receivedAt?: string;
}

/** Facture telle que le client la voit sur sa page de règlement. */
export interface PublicInvoiceDTO {
  id: string;
  number: string;
  title: string;
  status: InvoiceStatusId;
  businessName: string;
  businessEmail: string | null;
  brandColor: string;
  logoUrl: string | null;
  customerName: string;
  totalCents: number;
  paidCents: number;
  balanceCents: number;
  currency: string;
  dueAt: string | null;
  paymentDetails: string | null;
  pdfUrl: string;
  /** Vrai quand le bouton « Payer maintenant » peut être présenté. */
  payable: boolean;
  /** Motif lisible quand le paiement en ligne n'est pas proposé. */
  unavailableReason: string | null;
}

export interface StartInvoicePaymentResponse {
  /** URL de la page de paiement hébergée par Stripe. */
  checkoutUrl: string;
  paymentIntentId: string;
}

/** État de l'inscription Stripe Connect de l'entreprise. */
export interface PaymentAccountDTO {
  status: StripeAccountStatusId;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  onboardedAt: string | null;
  /** Vrai quand la formule inclut l'encaissement en ligne. */
  includedInPlan: boolean;
  /** Motif lisible quand la formule ne l'inclut pas. */
  planReason: string | null;
  /** Configuré côté serveur : sans clé Stripe, rien n'est proposé. */
  configured: boolean;
}

// ---------------------------------------------------------------------------
// Dépenses et justificatifs
// ---------------------------------------------------------------------------

/**
 * Lecture IA d'un justificatif.
 *
 * Chaque champ est optionnel : quand le ticket est illisible sur un point,
 * l'IA le laisse vide plutôt que d'inventer une valeur. `confidence` dit à
 * quel point la lecture globale est sûre ; l'artisan relit toujours.
 */
export interface ReceiptExtractionDTO {
  merchant: string | null;
  spentAt: string | null;
  amountCents: number | null;
  vatCents: number | null;
  currency: string | null;
  reference: string | null;
  category: ExpenseCategoryId | null;
  confidence: number;
  /** Champs que l'IA n'a pas pu lire et que l'artisan doit compléter. */
  missing: string[];
  warnings: string[];
}

export interface ExpenseDTO {
  id: string;
  merchant: string;
  category: ExpenseCategoryId;
  description: string | null;
  spentAt: string;
  amountCents: number;
  vatCents: number;
  currency: string;
  reference: string | null;
  paymentMethod: PaymentMethodId;
  receiptFileId: string | null;
  receiptUrl: string | null;
  aiExtracted: boolean;
  createdAt: string;
}

export interface ExpenseInput {
  merchant: string;
  category: ExpenseCategoryId;
  description?: string;
  spentAt: string;
  amountCents: number;
  vatCents?: number;
  reference?: string;
  paymentMethod?: PaymentMethodId;
  receiptFileId?: string | null;
  /** Lecture IA d'origine, conservée pour comparaison. */
  parsed?: ReceiptExtractionDTO | null;
}

export interface ExpenseListDTO {
  expenses: ExpenseDTO[];
  totalCents: number;
  vatCents: number;
  count: number;
  byCategory: { category: ExpenseCategoryId; totalCents: number; count: number }[];
}

// ---------------------------------------------------------------------------
// Marque documentaire et export comptable
// ---------------------------------------------------------------------------

export interface BrandingDTO {
  legalName: string;
  brandColor: string;
  documentTemplate: DocumentTemplateId;
  documentFooter: string | null;
  paymentDetails: string | null;
  logoFileId: string | null;
  logoUrl: string | null;
  signatureFileId: string | null;
  signatureUrl: string | null;
  /** Vrai quand la formule ouvre les modèles Moderne et Exécutif. */
  advancedTemplatesAvailable: boolean;
  planReason: string | null;
}

export interface BrandingInput {
  brandColor?: string;
  documentTemplate?: DocumentTemplateId;
  documentFooter?: string | null;
  paymentDetails?: string | null;
  logoFileId?: string | null;
  signatureFileId?: string | null;
}

export type AccountingExportDataset = 'expenses' | 'sales' | 'payments';

export interface AccountingExportInput {
  from: string;
  to: string;
  datasets: AccountingExportDataset[];
  /** Joindre les PDF de factures et les justificatifs dans l'archive. */
  includeDocuments?: boolean;
}

export interface AccountingExportSummaryDTO {
  from: string;
  to: string;
  salesCount: number;
  salesTotalCents: number;
  salesVatCents: number;
  expenseCount: number;
  expenseTotalCents: number;
  expenseVatCents: number;
  paymentCount: number;
  paymentTotalCents: number;
  documentCount: number;
}
