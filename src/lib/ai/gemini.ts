import { z } from 'zod';
import { env } from '../env';
import { AppError } from '../errors';
import { imageAnalysisSchema } from './schemas';
import { IMAGE_ANALYSIS_SYSTEM } from './prompts';
import { wrapUntrusted } from './sanitize';
import type {
  AIProvider,
  AIResult,
  ImageAnalysis,
  ImageAnalysisRequest,
  StructuredRequest,
  TextRequest,
} from './types';

const RACINE = 'https://generativelanguage.googleapis.com';
/**
 * Versions d'API essayées, dans l'ordre.
 *
 * Un modèle listé par une version n'est pas toujours servi par elle : mieux
 * vaut essayer l'autre que déclarer le modèle introuvable.
 */
const VERSIONS = ['v1beta', 'v1'] as const;
const BASE = `${RACINE}/${VERSIONS[0]}`;
const MAX_IMAGES = 6;

/**
 * Modèles retenus, du plus souhaitable au moins.
 *
 * Les modèles « flash » couvrent le palier gratuit avec les quotas les plus
 * larges et acceptent texte comme images. La liste sert de repli quand le
 * modèle configuré n'existe pas : un nom de modèle a une durée de vie, et
 * DEVISIA ne doit pas tomber en panne le jour où Google en retire un.
 */
const PREFERENCES = [
  'gemini-2.5-flash',
  'gemini-flash-latest',
  'gemini-2.0-flash',
  'gemini-2.5-flash-lite',
  'gemini-2.0-flash-lite',
];

/** Modèles inaptes à préparer un devis, quel que soit leur nom. */
const HORS_SUJET = /embedding|aqa|imagen|veo|tts|image-generation|gemma/i;
const SUPPORTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];

/**
 * Fournisseur IA Gemini.
 *
 * Appelé en REST plutôt que par un SDK : la surface utilisée tient en une
 * requête, et une dépendance de moins est une version de moins à suivre sur un
 * chemin critique. La clé voyage dans un en-tête, jamais dans l'URL — une URL
 * finit toujours par apparaître dans un journal.
 */
/**
 * Signal interne : ce modèle-là n'est pas servi.
 *
 * Volontairement distinct d'AppError — il ne remonte jamais à l'utilisateur,
 * il sert seulement à décider s'il vaut la peine d'essayer un autre modèle.
 */
class ModeleAbsent extends Error {}

interface GeminiPart {
  text?: string;
  inlineData?: { mimeType: string; data: string };
}

export class GeminiProvider implements AIProvider {
  readonly name = 'gemini' as const;
  private apiKey: string;
  private model: string;
  /** Modèle retenu après repli automatique, mémorisé pour le processus. */
  private resolu: { version: string; modele: string } | null = null;
  /**
   * Ce qu'a donné la dernière recherche de modèle.
   *
   * Remonté dans le message d'erreur, pas seulement journalisé : un opérateur
   * qui n'a pas accès aux journaux de l'hébergeur doit pouvoir comprendre une
   * panne de configuration depuis la réponse elle-même. Un statut HTTP et des
   * noms de modèles ne sont pas des secrets.
   */
  private diagnostic: string | null = null;

  constructor(apiKey: string, model: string) {
    this.apiKey = apiKey;
    this.model = model;
  }

  get available() {
    return true;
  }

  private get modeleActif(): string {
    return this.resolu?.modele ?? this.model;
  }

  /**
   * Énumère les modèles réellement servis, du plus souhaitable au moins.
   *
   * La liste vient de l'API : aucune valeur écrite en dur ne peut devenir
   * fausse avec le temps. Le modèle configuré passe en tête, puis les
   * préférences, puis le reste — ainsi un modèle retiré n'arrête pas le
   * produit, et un modèle listé mais non servi laisse sa place au suivant.
   */
  private async candidats(): Promise<string[]> {
    let reponse: Response;
    try {
      reponse = await fetch(`${BASE}/models`, {
        headers: { 'x-goog-api-key': this.apiKey },
        signal: AbortSignal.timeout(30_000),
      });
    } catch (cause) {
      this.diagnostic = 'liste des modèles injoignable';
      console.error('[ia] liste des modèles injoignable :', cause);
      return [];
    }
    if (!reponse.ok) {
      const detail = extractMessage(await reponse.text().catch(() => ''));
      this.diagnostic = `liste des modèles refusée (${reponse.status} ${detail.slice(0, 120)})`;
      console.error(`[ia] liste des modèles refusée — statut ${reponse.status} : ${detail}`);
      return [];
    }

    const { models = [] } = (await reponse.json().catch(() => ({ models: [] }))) as {
      models?: { name?: string; supportedGenerationMethods?: string[] }[];
    };
    const servis = models
      .filter((m) => (m.supportedGenerationMethods ?? []).includes('generateContent'))
      .map((m) => (m.name ?? '').replace(/^models\//, ''))
      .filter((id) => id && !HORS_SUJET.test(id));

    if (servis.length === 0) {
      this.diagnostic = `aucun modèle de génération parmi ${models.length} entrées`;
      return [];
    }
    this.diagnostic = `modèles servis : ${servis.slice(0, 8).join(', ')}`;

    const ordonnes = [
      this.model,
      ...PREFERENCES.filter((p) => servis.includes(p)),
      ...servis,
    ];
    return [...new Set(ordonnes)].filter((m) => servis.includes(m));
  }

  async generateStructuredOutput<TSchema extends z.ZodType>(
    request: StructuredRequest<TSchema>,
  ): Promise<AIResult<z.infer<TSchema>>> {
    const started = Date.now();
    const reponse = await this.call({
      systemInstruction: { parts: [{ text: request.system }] },
      contents: [
        { role: 'user', parts: buildParts(request.context, request.untrusted, request.images) },
      ],
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: toGeminiSchema(request.schema),
        maxOutputTokens: request.maxTokens ?? 4096,
        temperature: request.temperature ?? 0.2,
      },
    });

    const texte = textOf(reponse);
    if (!texte) {
      throw new AppError('PROVIDER_UNAVAILABLE', "L'IA n'a pas renvoyé de résultat exploitable.");
    }

    let brut: unknown;
    try {
      brut = JSON.parse(texte);
    } catch {
      throw new AppError('PROVIDER_UNAVAILABLE', "La réponse de l'IA n'était pas exploitable.");
    }

    const parsed = request.schema.safeParse(brut);
    if (!parsed.success) {
      throw new AppError('PROVIDER_UNAVAILABLE', "La réponse de l'IA était incomplète.", {
        cause: parsed.error,
      });
    }

    return { data: parsed.data, degraded: false, usage: this.usage(reponse, started) };
  }

  async generateText(request: TextRequest): Promise<AIResult<string>> {
    const started = Date.now();
    const reponse = await this.call({
      systemInstruction: { parts: [{ text: request.system }] },
      contents: [{ role: 'user', parts: buildParts(request.context, request.untrusted, undefined) }],
      generationConfig: {
        maxOutputTokens: request.maxTokens ?? 1024,
        temperature: request.temperature ?? 0.4,
      },
    });
    return { data: textOf(reponse).trim(), degraded: false, usage: this.usage(reponse, started) };
  }

  async analyzeImage(request: ImageAnalysisRequest): Promise<AIResult<ImageAnalysis>> {
    return this.generateStructuredOutput({
      system: IMAGE_ANALYSIS_SYSTEM,
      context: request.trade ? `Métier de l'entreprise : ${request.trade}.` : undefined,
      untrusted: wrapUntrusted(request.untrusted ?? '', 'description_chantier'),
      images: request.images,
      schema: imageAnalysisSchema,
      schemaName: 'analyse_photos',
      maxTokens: 2048,
    });
  }

  private usage(reponse: GeminiResponse, started: number) {
    return {
      latencyMs: Date.now() - started,
      inputTokens: reponse.usageMetadata?.promptTokenCount,
      outputTokens: reponse.usageMetadata?.candidatesTokenCount,
      model: this.modeleActif,
      provider: this.name,
    };
  }

  /**
   * Envoie la requête et traduit les échecs.
   *
   * Le motif exact est journalisé — statut, modèle, message de l'API — parce
   * qu'une panne d'IA se présente sinon comme un simple mode dégradé, sans
   * qu'on sache si la cause est un quota, un modèle inconnu ou une clé morte.
   * Ni la clé ni l'URL complète n'y figurent jamais.
   */
  private async call(corps: Record<string, unknown>): Promise<GeminiResponse> {
    // Le couple déjà retenu est rejoué directement : la recherche ne coûte
    // qu'une fois par processus.
    if (this.resolu) return this.envoyer(this.resolu.version, this.resolu.modele, corps);

    let derniere: Error | null = null;
    for (const version of VERSIONS) {
      try {
        const reponse = await this.envoyer(version, this.model, corps);
        this.resolu = { version, modele: this.model };
        return reponse;
      } catch (erreur) {
        derniere = erreur as Error;
        // Seul un modèle introuvable justifie d'en essayer un autre : une clé
        // refusée ou un quota atteint ne se répare pas en changeant de nom.
        if (!(erreur instanceof ModeleAbsent)) throw erreur;
      }
    }

    for (const modele of await this.candidats()) {
      if (modele === this.model) continue;
      for (const version of VERSIONS) {
        try {
          const reponse = await this.envoyer(version, modele, corps);
          this.resolu = { version, modele };
          console.warn(
            `[ia] modèle « ${this.model} » indisponible — bascule sur « ${modele} » (${version}). ` +
              'Fixez GEMINI_MODEL pour supprimer cette recherche.',
          );
          return reponse;
        } catch (erreur) {
          derniere = erreur as Error;
          if (!(erreur instanceof ModeleAbsent)) throw erreur;
        }
      }
    }

    throw new AppError(
      'PROVIDER_UNAVAILABLE',
      `Aucun modèle d'IA utilisable — essayé « ${this.model} »` +
        (this.diagnostic ? ` ; ${this.diagnostic}` : '') +
        '.',
      { cause: derniere ?? undefined },
    );
  }

  /** Un envoi, sur une version d'API et un modèle donnés. */
  private async envoyer(
    version: string,
    modele: string,
    corps: Record<string, unknown>,
  ): Promise<GeminiResponse> {
    let reponse: Response;
    try {
      reponse = await fetch(`${RACINE}/${version}/models/${modele}:generateContent`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-goog-api-key': this.apiKey },
        body: JSON.stringify(corps),
        signal: AbortSignal.timeout(90_000),
      });
    } catch (cause) {
      console.error(`[ia] gemini injoignable — ${version}/${modele} :`, cause);
      throw new AppError('PROVIDER_UNAVAILABLE', "Le service d'IA est momentanément indisponible.", {
        cause,
      });
    }

    if (!reponse.ok) {
      const message = extractMessage(await reponse.text().catch(() => ''));
      console.error(`[ia] gemini a refusé — statut ${reponse.status}, ${version}/${modele} : ${message}`);
      if (reponse.status === 429) {
        throw new AppError('RATE_LIMITED', "Le service d'IA est saturé. Réessayez dans un instant.");
      }
      if (reponse.status === 401 || reponse.status === 403) {
        throw new AppError('PROVIDER_UNAVAILABLE', "La clé d'API IA est invalide ou expirée.");
      }
      // Code interne : il ne remonte jamais à l'utilisateur, il sert à savoir
      // s'il vaut la peine d'essayer un autre modèle.
      if (reponse.status === 404) {
        throw new ModeleAbsent(`Modèle ${modele} non servi par ${version}.`);
      }
      if (reponse.status === 400) {
        throw new AppError('PROVIDER_UNAVAILABLE', `Requête refusée par le service d'IA : ${message}`);
      }
      throw new AppError('PROVIDER_UNAVAILABLE', "Le service d'IA est momentanément indisponible.");
    }

    return (await reponse.json()) as GeminiResponse;
  }
}

interface GeminiResponse {
  candidates?: { content?: { parts?: GeminiPart[] }; finishReason?: string }[];
  usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number };
}

function textOf(reponse: GeminiResponse): string {
  return (reponse.candidates?.[0]?.content?.parts ?? [])
    .map((part) => part.text ?? '')
    .join('')
    .trim();
}

/** Extrait le message d'erreur de l'API sans laisser fuir le reste. */
function extractMessage(corps: string): string {
  try {
    const json = JSON.parse(corps) as { error?: { message?: string; status?: string } };
    return json.error?.message ?? json.error?.status ?? corps.slice(0, 200);
  } catch {
    return corps.slice(0, 200);
  }
}

function buildParts(
  context: string | undefined,
  untrusted: string,
  images: StructuredRequest<z.ZodType>['images'],
): GeminiPart[] {
  const parts: GeminiPart[] = [];
  for (const image of (images ?? []).slice(0, MAX_IMAGES)) {
    if (!SUPPORTED_IMAGE_TYPES.includes(image.mimeType)) continue;
    parts.push({ inlineData: { mimeType: image.mimeType, data: image.base64 } });
  }
  if (context) parts.push({ text: context });
  parts.push({ text: untrusted });
  return parts;
}

/**
 * Traduit un schéma Zod vers le sous-ensemble OpenAPI accepté par Gemini.
 *
 * Gemini refuse plusieurs mots-clés que produit `z.toJSONSchema` —
 * `additionalProperties`, `$schema`, `format`, les bornes exclusives — et
 * n'exprime pas la nullité par un type composite mais par `nullable`. Un
 * schéma non nettoyé fait échouer l'appel en 400, c'est-à-dire, ici, un
 * basculement silencieux sur le moteur local.
 */
export function toGeminiSchema(schema: z.ZodType): Record<string, unknown> {
  const json = z.toJSONSchema(schema, { target: 'draft-7', io: 'input' }) as Record<string, unknown>;
  return nettoyer(json) as Record<string, unknown>;
}

const REFUSES = new Set([
  '$schema',
  '$id',
  'additionalProperties',
  'exclusiveMinimum',
  'exclusiveMaximum',
  'default',
  'const',
  'examples',
  'patternProperties',
  'definitions',
  '$defs',
]);

function nettoyer(noeud: unknown): unknown {
  if (Array.isArray(noeud)) return noeud.map(nettoyer);
  if (noeud === null || typeof noeud !== 'object') return noeud;

  const source = noeud as Record<string, unknown>;
  const sortie: Record<string, unknown> = {};

  for (const [cle, valeur] of Object.entries(source)) {
    if (REFUSES.has(cle)) continue;

    // `type: ['string', 'null']` devient `type: 'string'` + `nullable: true`.
    if (cle === 'type' && Array.isArray(valeur)) {
      const types = valeur.filter((t) => t !== 'null');
      if (valeur.includes('null')) sortie.nullable = true;
      sortie.type = types[0] ?? 'string';
      continue;
    }

    // `anyOf: [X, {type:'null'}]` exprime la même chose : on aplatit.
    if (cle === 'anyOf' && Array.isArray(valeur)) {
      const branches = valeur.filter(
        (b) => !(b && typeof b === 'object' && (b as Record<string, unknown>).type === 'null'),
      );
      if (branches.length < valeur.length) sortie.nullable = true;
      if (branches.length === 1) {
        Object.assign(sortie, nettoyer(branches[0]) as Record<string, unknown>);
        continue;
      }
      sortie.anyOf = branches.map(nettoyer);
      continue;
    }

    sortie[cle] = nettoyer(valeur);
  }

  return sortie;
}

export function createGeminiProvider(): GeminiProvider | null {
  const config = env();
  if (!config.GEMINI_API_KEY) return null;
  return new GeminiProvider(config.GEMINI_API_KEY, config.GEMINI_MODEL);
}
