import { z } from 'zod';

/** Schémas partagés entre les routes API et les formulaires. */

export const emailSchema = z
  .string()
  .trim()
  .min(1, 'Adresse email requise.')
  .email('Adresse email invalide.')
  .max(180)
  .transform((value) => value.toLowerCase());

export const passwordSchema = z
  .string()
  .min(10, 'Le mot de passe doit contenir au moins 10 caractères.')
  .max(200);

export const phoneSchema = z
  .string()
  .trim()
  .max(30)
  .regex(/^[0-9+().\s-]*$/, 'Numéro de téléphone invalide.')
  .optional()
  .or(z.literal(''));

export const signUpSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  firstName: z.string().trim().max(80).optional(),
  lastName: z.string().trim().max(80).optional(),
  companyName: z.string().trim().min(2, "Nom de l'entreprise requis.").max(160),
  phone: phoneSchema,
});

export const signInSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Mot de passe requis.'),
});

export const customerSchema = z
  .object({
    firstName: z.string().trim().max(80).nullish(),
    lastName: z.string().trim().max(80).nullish(),
    companyName: z.string().trim().max(160).nullish(),
    email: z.union([emailSchema, z.literal('')]).nullish(),
    phone: z.string().trim().max(30).nullish(),
    addressLine1: z.string().trim().max(200).nullish(),
    addressLine2: z.string().trim().max(200).nullish(),
    city: z.string().trim().max(120).nullish(),
    postalCode: z.string().trim().max(12).nullish(),
    country: z.string().trim().length(2).default('FR'),
    notes: z.string().trim().max(4000).nullish(),
    tags: z.array(z.string().trim().max(40)).max(12).default([]),
  })
  .refine(
    (value) => Boolean(value.lastName?.trim() || value.companyName?.trim() || value.firstName?.trim()),
    { message: 'Indiquez au moins un nom ou une raison sociale.', path: ['lastName'] },
  );

export const leadSchema = z.object({
  contactName: z.string().trim().min(2, 'Nom du contact requis.').max(120),
  title: z.string().trim().min(3, 'Objet de la demande requis.').max(160),
  description: z.string().trim().max(4000).nullish(),
  jobType: z.string().trim().max(120).nullish(),
  email: z.union([emailSchema, z.literal('')]).nullish(),
  phone: z.string().trim().max(30).nullish(),
  city: z.string().trim().max(120).nullish(),
  postalCode: z.string().trim().max(12).nullish(),
  addressLine1: z.string().trim().max(200).nullish(),
  status: z
    .enum(['NOUVEAU', 'CONTACTE', 'QUALIFIE', 'DEVIS_ENVOYE', 'RELANCE', 'GAGNE', 'PERDU'])
    .optional(),
  source: z
    .enum(['MANUEL', 'FORMULAIRE_WEB', 'EMAIL', 'SMS', 'WHATSAPP', 'TELEPHONE', 'STANDARD_IA', 'IMPORT', 'AUTRE'])
    .optional(),
  estimatedCents: z.number().int().min(0).max(100_000_000).nullish(),
  nextFollowUpAt: z.coerce.date().nullish(),
  lostReason: z.string().trim().max(400).nullish(),
});

export const quoteItemSchema = z.object({
  id: z.string().uuid().optional(),
  kind: z.enum(['MATERIAU', 'MAIN_OEUVRE', 'SERVICE', 'PACK', 'FRAIS', 'REMISE']).default('MATERIAU'),
  label: z.string().trim().min(1, 'Désignation requise.').max(200),
  description: z.string().trim().max(2000).nullish(),
  unit: z.string().trim().max(16).default('u'),
  quantity: z.number().min(0).max(1_000_000),
  unitPriceCents: z.number().int().min(0).max(1_000_000_000),
  costPriceCents: z.number().int().min(0).max(1_000_000_000).nullish(),
  discountRate: z.number().min(0).max(100).default(0),
  vatRate: z.number().min(0).max(100).default(20),
  priceBookItemId: z.string().uuid().nullish(),
});

export const quoteSchema = z.object({
  customerId: z.string().uuid("Sélectionnez un client."),
  leadId: z.string().uuid().nullish(),
  jobId: z.string().uuid().nullish(),
  title: z.string().trim().min(3, 'Objet du devis requis.').max(160),
  summary: z.string().trim().max(2000).nullish(),
  introduction: z.string().trim().max(2000).nullish(),
  notes: z.string().trim().max(4000).nullish(),
  terms: z.string().trim().max(4000).nullish(),
  paymentTerms: z.string().trim().max(1000).nullish(),
  validUntil: z.coerce.date().nullish(),
  discountRate: z.number().min(0).max(100).default(0),
  depositRate: z.number().min(0).max(100).default(0),
  estimatedDurationMin: z.number().int().min(0).max(100_000).nullish(),
  items: z.array(quoteItemSchema).min(1, 'Ajoutez au moins une ligne.').max(120),
  aiGenerated: z.boolean().default(false),
  aiConfidence: z.number().int().min(0).max(100).nullish(),
  aiWarnings: z.array(z.string().max(400)).max(12).default([]),
  aiQuestions: z.array(z.string().max(400)).max(12).default([]),
});

export const priceBookSchema = z.object({
  name: z.string().trim().min(2, 'Nom requis.').max(160),
  reference: z.string().trim().max(64).nullish(),
  sku: z.string().trim().max(64).nullish(),
  description: z.string().trim().max(2000).nullish(),
  category: z.enum(['MATERIAU', 'SERVICE', 'MAIN_OEUVRE', 'PACK']).default('MATERIAU'),
  unit: z.string().trim().max(16).default('u'),
  costPriceCents: z.number().int().min(0).max(1_000_000_000).default(0),
  salePriceCents: z.number().int().min(0).max(1_000_000_000),
  vatRate: z.number().min(0).max(100).default(20),
  supplier: z.string().trim().max(120).nullish(),
  keywords: z.array(z.string().trim().max(40)).max(20).default([]),
  isActive: z.boolean().default(true),
});

export const businessProfileSchema = z.object({
  legalName: z.string().trim().min(2, "Nom de l'entreprise requis.").max(160),
  ownerName: z.string().trim().max(120).nullish(),
  email: z.union([emailSchema, z.literal('')]).nullish(),
  phone: z.string().trim().max(30).nullish(),
  website: z.string().trim().max(200).nullish(),
  addressLine1: z.string().trim().max(200).nullish(),
  city: z.string().trim().max(120).nullish(),
  postalCode: z.string().trim().max(12).nullish(),
  country: z.string().trim().length(2).default('FR'),
  siret: z
    .string()
    .trim()
    .max(20)
    .regex(/^[0-9\s]*$/, 'Le SIRET ne contient que des chiffres.')
    .nullish(),
  vatNumber: z.string().trim().max(20).nullish(),
  insurance: z.string().trim().max(200).nullish(),
  trade: z
    .enum([
      'PLOMBIER', 'ELECTRICIEN', 'CHAUFFAGISTE', 'CLIMATICIEN', 'PEINTRE', 'COUVREUR',
      'MENUISIER', 'MACON', 'PAYSAGISTE', 'RENOVATION', 'NETTOYAGE', 'DEPANNAGE', 'AUTRE',
    ])
    .default('AUTRE'),
  vatStatus: z.enum(['ASSUJETTI', 'FRANCHISE_EN_BASE', 'AUTOLIQUIDATION']).default('ASSUJETTI'),
  defaultVatRate: z.number().min(0).max(100).default(20),
  defaultHourlyCents: z.number().int().min(0).max(100_000_000).default(4500),
  paymentTerms: z.string().trim().max(1000).nullish(),
  quoteValidityDays: z.number().int().min(1).max(365).default(30),
  quoteTerms: z.string().trim().max(4000).nullish(),
  quoteFooter: z.string().trim().max(1000).nullish(),
  brandColor: z
    .string()
    .trim()
    .regex(/^#[0-9a-fA-F]{6}$/, 'Couleur hexadécimale attendue (ex. #2547E0).')
    .default('#2547E0'),
});

export const publicLeadSchema = z.object({
  contactName: z.string().trim().min(2, 'Votre nom est requis.').max(120),
  email: z.union([emailSchema, z.literal('')]).optional(),
  phone: z.string().trim().max(30).optional(),
  city: z.string().trim().max(120).optional(),
  postalCode: z.string().trim().max(12).optional(),
  addressLine1: z.string().trim().max(200).optional(),
  description: z.string().trim().min(10, 'Décrivez votre besoin en quelques mots.').max(4000),
  fileIds: z.array(z.string().uuid()).max(8).optional(),
});

export const publicDecisionSchema = z.object({
  decision: z.enum(['ACCEPTE', 'REFUSE', 'MODIFICATION_DEMANDEE']),
  message: z.string().trim().max(2000).optional(),
  signatureName: z.string().trim().max(120).optional(),
});
