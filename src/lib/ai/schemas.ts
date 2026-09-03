import { z } from 'zod';

/**
 * Schémas des sorties structurées attendues de l'IA.
 *
 * L'IA ne renvoie JAMAIS de total : elle propose des lignes (désignation,
 * quantité, unité, prix unitaire suggéré). Tous les montants sont recalculés
 * par `lib/money.ts` côté serveur.
 */

export const aiMaterialSchema = z.object({
  designation: z.string().min(1).max(160),
  description: z.string().max(600).nullish(),
  quantite: z.number().min(0).max(100_000),
  unite: z.string().max(16).default('u'),
  /** Prix unitaire HT en euros, uniquement si l'IA en est raisonnablement sûre. */
  prixUnitaireHT: z.number().min(0).max(1_000_000).nullish(),
  /** Référence exacte d'un article du catalogue de l'entreprise, si reconnue. */
  referenceCatalogue: z.string().max(64).nullish(),
  tauxTVA: z.number().min(0).max(30).nullish(),
});

export const aiLabourSchema = z.object({
  designation: z.string().min(1).max(160),
  description: z.string().max(600).nullish(),
  heures: z.number().min(0).max(2000).describe('Nombre d’heures, en heures décimales.'),
  tauxHoraire: z
    .number()
    .min(0)
    .max(100_000)
    .nullish()
    .describe('Taux horaire en euros hors taxes.'),
  referenceCatalogue: z.string().max(64).nullish(),
});

export const quoteDraftSchema = z.object({
  titre: z.string().min(1).max(140),
  resume: z.string().max(800).default(''),
  descriptionTravaux: z.array(z.string().max(600)).max(20).default([]),
  materiaux: z.array(aiMaterialSchema).max(40).default([]),
  mainOeuvre: z.array(aiLabourSchema).max(20).default([]),
  questions: z
    .array(z.string().max(300))
    .max(12)
    .default([])
    .describe('Informations manquantes que l’artisan doit compléter avant envoi.'),
  alertes: z
    .array(z.string().max(300))
    .max(12)
    .default([])
    .describe('Points de vigilance : risques, travaux non inclus.'),
  observations: z
    .array(z.string().max(300))
    .max(12)
    .default([])
    .describe('Ce qui est réellement visible sur les photos ou explicite dans la description.'),
  hypotheses: z
    .array(z.string().max(300))
    .max(12)
    .default([])
    .describe('Ce qui a été supposé faute d’information, à confirmer par l’artisan.'),
  dureeEstimeeMinutes: z
    .number()
    .int()
    .min(0)
    .max(100_000)
    .nullish()
    .describe('Durée totale d’intervention estimée, en minutes.'),
  confiance: z
    .number()
    .min(0)
    .max(100)
    .default(50)
    .describe(
      'Confiance sur l’exhaustivité du devis, entier de 0 à 100 — ' +
        '0 très incertain, 100 certain. Jamais une fraction entre 0 et 1.',
    ),
});

export type QuoteDraft = z.infer<typeof quoteDraftSchema>;

export const imageAnalysisSchema = z.object({
  description: z.string().max(1200).default(''),
  observations: z.array(z.string().max(300)).max(12).default([]),
  detectedItems: z.array(z.string().max(160)).max(20).default([]),
  missingInformation: z.array(z.string().max(300)).max(12).default([]),
});

export const priceBookExtractionSchema = z.object({
  articles: z
    .array(
      z.object({
        nom: z.string().min(1).max(160),
        description: z.string().max(600).nullish(),
        categorie: z.enum(['MATERIAU', 'SERVICE', 'MAIN_OEUVRE', 'PACK']).default('MATERIAU'),
        unite: z.string().max(16).default('u'),
        prixAchatHT: z.number().min(0).max(1_000_000).nullish(),
        prixVenteHT: z.number().min(0).max(1_000_000),
        tauxTVA: z.number().min(0).max(30).nullish(),
        reference: z.string().max(64).nullish(),
      }),
    )
    .max(200)
    .default([]),
  conditionsDetectees: z.array(z.string().max(400)).max(10).default([]),
  remarques: z.array(z.string().max(300)).max(10).default([]),
});

export type PriceBookExtraction = z.infer<typeof priceBookExtractionSchema>;

export const assistantAnswerSchema = z.object({
  reponse: z.string().max(2000),
  /** Suggestions d'actions proposées à l'utilisateur (jamais exécutées seules). */
  actions: z
    .array(
      z.object({
        libelle: z.string().max(80),
        href: z.string().max(200).nullish(),
      }),
    )
    .max(4)
    .default([]),
});

export const followUpDraftSchema = z.object({
  objet: z.string().max(160),
  message: z.string().max(2000),
});

export type FollowUpDraft = z.infer<typeof followUpDraftSchema>;
