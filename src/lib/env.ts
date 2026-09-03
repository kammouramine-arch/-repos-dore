/**
 * Chargement et validation centralisés de la configuration.
 * Aucun secret n'est jamais exposé au client : seules les clés préfixées
 * NEXT_PUBLIC_ traversent la frontière serveur/navigateur.
 */
import { z } from 'zod';

const serverSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL est requis'),
  APP_URL: z.string().url().default('http://localhost:3000'),
  AUTH_SECRET: z.string().min(16).default('devisia-development-secret-change-me'),

  // IA — laissé vide, le fournisseur est déduit de la présence de la clé.
  AI_PROVIDER: z.preprocess(
    (value) => (value === '' || value == null ? undefined : value),
    z.enum(['gemini', 'anthropic', 'local']).optional(),
  ),
  // Gemini est le fournisseur retenu : son palier gratuit couvre la
  // préparation des devis, texte et photos comprises.
  GEMINI_API_KEY: z.preprocess(
    (value) => (typeof value === 'string' && value.trim() === '' ? undefined : value),
    z.string().optional(),
  ),
  /**
   * Modèle hérité, appliqué à la préparation des devis seulement.
   *
   * Un même modèle ne convient pas aux deux usages : rédiger un devis
   * structuré demande de la finesse et tolère l'attente, lire une photo doit
   * répondre tout de suite. Les deux réglages ci-dessous priment.
   */
  GEMINI_MODEL: z.string().optional(),
  /** Rédaction des devis : on privilégie la qualité. */
  GEMINI_QUOTE_MODEL: z.string().optional(),
  /** Lecture des photos : on privilégie la rapidité. */
  GEMINI_VISION_MODEL: z.string().optional(),
  // Une valeur vide (« ANTHROPIC_API_KEY= » dans .env) équivaut à l'absence de clé.
  ANTHROPIC_API_KEY: z.preprocess(
    (value) => (typeof value === 'string' && value.trim() === '' ? undefined : value),
    z.string().optional(),
  ),
  ANTHROPIC_MODEL: z.string().default('claude-opus-5'),

  // Transcription audio (API compatible OpenAI : OpenAI, Groq, Whisper auto-hébergé)
  TRANSCRIPTION_PROVIDER: z.enum(['openai', 'none']).default('none'),
  TRANSCRIPTION_API_KEY: z.string().optional(),
  TRANSCRIPTION_BASE_URL: z.string().url().default('https://api.openai.com/v1'),
  TRANSCRIPTION_MODEL: z.string().default('whisper-1'),

  // Email
  EMAIL_PROVIDER: z.enum(['resend', 'console']).default('console'),
  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().default('DEVISIA <bonjour@devisia.fr>'),

  // Stockage
  // `database` : le binaire vit dans PostgreSQL. Aucune configuration externe,
  //              et surtout aucun disque à écrire — les hébergeurs serverless
  //              montent le système de fichiers en lecture seule.
  // `s3`       : stockage objet, à préférer dès que le volume grandit.
  // `local`    : disque, réservé au développement.
  STORAGE_PROVIDER: z.enum(['database', 'local', 's3']).default('database'),
  STORAGE_LOCAL_DIR: z.string().default('./storage'),
  S3_ENDPOINT: z.string().optional(),
  S3_REGION: z.string().optional(),
  S3_BUCKET: z.string().optional(),
  S3_ACCESS_KEY_ID: z.string().optional(),
  S3_SECRET_ACCESS_KEY: z.string().optional(),

  // Messagerie (SMS / WhatsApp) — architecture prête, non requise pour le MVP
  MESSAGING_PROVIDER: z.enum(['twilio', 'whatsapp', 'none']).default('none'),
  TWILIO_ACCOUNT_SID: z.string().optional(),
  TWILIO_AUTH_TOKEN: z.string().optional(),
  TWILIO_FROM_NUMBER: z.string().optional(),
  WHATSAPP_PHONE_NUMBER_ID: z.string().optional(),
  WHATSAPP_ACCESS_TOKEN: z.string().optional(),

  // Paiements
  STRIPE_SECRET_KEY: z.string().optional(),
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  STRIPE_PRICE_ESSENTIEL: z.string().optional(),
  STRIPE_PRICE_PRO: z.string().optional(),
  STRIPE_PRICE_ENTREPRISE: z.string().optional(),

  // Notifications push mobiles (Expo)
  EXPO_ACCESS_TOKEN: z.string().optional(),
  PUSH_ENABLED: z
    .enum(['true', 'false'])
    .default('true')
    .transform((value) => value === 'true'),

  // Automatisations
  CRON_SECRET: z.string().optional(),
});

type ServerEnv = z.infer<typeof serverSchema>;

let cached: ServerEnv | null = null;

export function env(): ServerEnv {
  if (cached) return cached;
  const parsed = serverSchema.safeParse(process.env);
  if (!parsed.success) {
    const details = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join(', ');
    throw new Error(`Configuration d'environnement invalide — ${details}`);
  }
  cached = parsed.data;
  return cached;
}

/**
 * Fournisseur d'IA effectif.
 *
 * `ANTHROPIC_API_KEY` suffit à activer Claude : aucune seconde variable n'est
 * nécessaire au déploiement. `AI_PROVIDER` reste un forçage explicite, utile
 * pour désactiver l'IA externe (`local`) alors qu'une clé est présente.
 */
export function aiProviderKind(): 'gemini' | 'anthropic' | 'local' {
  const config = env();
  if (config.AI_PROVIDER) return config.AI_PROVIDER;
  // Gemini d'abord : c'est le fournisseur choisi pour la production. Anthropic
  // reste utilisable sans changer une ligne, en posant sa clé.
  if (config.GEMINI_API_KEY) return 'gemini';
  return config.ANTHROPIC_API_KEY ? 'anthropic' : 'local';
}

export const isProduction = () => env().NODE_ENV === 'production';
export const isTest = () => env().NODE_ENV === 'test';

/** URL absolue de l'application, utilisée dans les emails et liens publics. */
export function appUrl(path = ''): string {
  const base = env().APP_URL.replace(/\/$/, '');
  return path ? `${base}${path.startsWith('/') ? path : `/${path}`}` : base;
}
