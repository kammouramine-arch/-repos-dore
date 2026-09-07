/**
 * Chargement et validation centralisés de la configuration.
 * Aucun secret n'est jamais exposé au client : seules les clés préfixées
 * NEXT_PUBLIC_ traversent la frontière serveur/navigateur.
 */
import { z } from 'zod';

/** `Nom <adresse@domaine>` ou `adresse@domaine`, après normalisation. */
const ADDRESS_PATTERN = /^(?:[^<>\n]+ )?<?[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+>?$/;

/**
 * Normalise une adresse d'expédition ou de réponse.
 *
 * Retire espaces et guillemets périphériques, un éventuel préfixe `mailto:`,
 * et ramène `<adresse>` seul à l'adresse nue. Une valeur vide vaut absence.
 */
export function normalizeAddress(value: unknown): unknown {
  if (typeof value !== 'string') return value;
  let address = value.trim().replace(/^["']+|["']+$/g, '').trim();
  if (address === '') return undefined;
  address = address.replace(/^mailto:/i, '');
  const bare = /^<([^<>]+)>$/.exec(address);
  if (bare) address = bare[1]!.trim();
  return address;
}

const serverSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL est requis'),
  // Une URL saisie sans schéma (« devisera.fr ») est complétée en https plutôt
  // que rejetée : un lien d'email légèrement faux vaut mieux qu'une API à terre.
  APP_URL: z.preprocess(
    (value) =>
      typeof value === 'string' && value.trim() !== '' && !/^https?:\/\//i.test(value.trim())
        ? `https://${value.trim()}`
        : value,
    z.string().url().default('http://localhost:3000'),
  ),
  AUTH_SECRET: z.string().min(16).default('devisera-development-secret-change-me'),

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
  EMAIL_FROM: z.string().default('DEVISERA <contact@devisera.fr>'),
  /**
   * Adresse de réponse par défaut ; l'email du profil d'entreprise la remplace.
   *
   * Resend accepte aussi bien `contact@devisera.fr` que
   * `DEVISERA <contact@devisera.fr>`. Le schéma n'admettait que la forme nue :
   * la valeur avec nom d'affichage posée en production était rejetée, ce qui
   * a d'abord fait tomber toutes les routes (validation en bloc), puis, une
   * fois la lecture rendue tolérante, l'a classée « ignorée » alors qu'elle
   * est voulue. La forme est normalisée et l'adresse qu'elle contient validée.
   */
  EMAIL_REPLY_TO: z.preprocess(normalizeAddress, z.string().regex(ADDRESS_PATTERN).default('contact@devisera.fr')),

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

/**
 * Variables sans lesquelles rien ne peut fonctionner. Tout le reste décrit un
 * service optionnel — email, IA, stockage objet, messagerie, paiements — et
 * une valeur mal saisie pour l'un d'eux ne doit jamais rendre la connexion,
 * les clients ou les devis indisponibles.
 */
const CRITICAL_KEYS = ['DATABASE_URL'] as const;

export interface ConfigurationReport {
  /** Variables critiques absentes ou invalides : le service ne peut pas démarrer. */
  missing: string[];
  /** Variables optionnelles ignorées (valeur invalide, défaut appliqué). Noms seuls. */
  ignored: string[];
}

let report: ConfigurationReport = { missing: [], ignored: [] };
let reported = false;

/**
 * Lit la configuration variable par variable.
 *
 * Auparavant, le schéma était validé d'un bloc : une seule valeur invalide —
 * un fournisseur d'email mal orthographié, une adresse de réponse au mauvais
 * format — faisait lever `env()` sur toutes les routes qui le consultent, et
 * l'application entière répondait 500 alors que la base et l'authentification
 * étaient saines. Désormais, seule une variable critique bloque ; une variable
 * optionnelle invalide est remplacée par sa valeur par défaut et signalée par
 * son nom, jamais par sa valeur.
 */
function readEnvironment(source: NodeJS.ProcessEnv): { value: ServerEnv; report: ConfigurationReport } {
  const shape = serverSchema.shape;
  const value: Record<string, unknown> = {};
  const missing: string[] = [];
  const ignored: string[] = [];
  for (const key of Object.keys(shape) as (keyof typeof shape)[]) {
    const field = shape[key];
    const parsed = field.safeParse(source[key]);
    if (parsed.success) {
      value[key] = parsed.data;
      continue;
    }
    if ((CRITICAL_KEYS as readonly string[]).includes(key)) {
      missing.push(key);
      continue;
    }
    // Une valeur présente mais invalide : on repart de la valeur par défaut du
    // champ, comme si la variable n'était pas définie.
    const fallback = field.safeParse(undefined);
    value[key] = fallback.success ? fallback.data : undefined;
    if (source[key] !== undefined) ignored.push(key);
  }
  return { value: value as ServerEnv, report: { missing, ignored } };
}

export function env(): ServerEnv {
  if (cached) return cached;
  const read = readEnvironment(process.env);
  report = read.report;
  if (read.report.missing.length > 0) {
    throw new Error(`Configuration d'environnement invalide — variables critiques : ${read.report.missing.join(', ')}`);
  }
  if (read.report.ignored.length > 0 && !reported) {
    reported = true;
    console.warn(`[config] variables ignorées (valeur invalide, défaut appliqué) : ${read.report.ignored.join(', ')}`);
  }
  cached = read.value;
  return cached;
}

/** État de la configuration, noms de variables seulement — jamais de valeur. */
export function configurationReport(): ConfigurationReport {
  if (!cached) {
    try {
      env();
    } catch {
      // `report` porte déjà les variables manquantes.
    }
  }
  return { missing: [...report.missing], ignored: [...report.ignored] };
}

/** Réinitialise le cache (tests). */
export function resetEnv() {
  cached = null;
  reported = false;
  report = { missing: [], ignored: [] };
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
