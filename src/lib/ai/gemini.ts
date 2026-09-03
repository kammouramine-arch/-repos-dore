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
/**
 * Deux usages, deux exigences.
 *
 * Rédiger un devis structuré demande de la finesse et tolère une attente que
 * l'écran couvre par une progression. Lire une photo doit répondre tout de
 * suite : mesuré en production, un devis a pris quatre-vingt-neuf secondes, et
 * l'analyse de photo qui suivait a expiré. Un même modèle et un même délai ne
 * peuvent pas servir les deux.
 */
export interface ProfilTache {
  /** Modèle souhaité en premier. */
  prefere: string;
  /** Repli, du plus souhaitable au moins, si le préféré ne répond pas. */
  preferences: string[];
  /** Budget d'un envoi. Au-delà, mieux vaut échouer que faire attendre. */
  timeoutMs: number;
  /** Modèles alternatifs essayés avant d'abandonner. */
  essaisMax: number;
}

const PREFERENCES_DEVIS = [
  'gemini-3.5-flash',
  'gemini-flash-latest',
  'gemini-2.5-flash',
  'gemini-2.0-flash',
  'gemini-2.5-flash-lite',
];

/**
 * Pour la vision, les modèles les plus rapides d'abord — y compris les
 * variantes « lite », qui suffisent à décrire une photo de chantier et
 * portent un quota distinct.
 */
const PREFERENCES_VISION = [
  'gemini-2.5-flash',
  'gemini-flash-lite-latest',
  'gemini-3.5-flash-lite',
  'gemini-flash-latest',
  'gemini-3.5-flash',
];

/**
 * Modèles écartés de la préparation d'un devis.
 *
 * Trois familles, pour trois raisons distinctes :
 * — ceux qui ne rédigent pas de texte structuré (embeddings, images, audio) ;
 * — les expérimentaux et préversions, qui répondent 404 sans prévenir — un
 *   essai gâché sur « gemini-flash-latest-high-res-exp » a suffi à faire
 *   basculer un devis sur le moteur local ;
 * — les modèles « pro », qui raisonnent longuement : sur le palier gratuit ils
 *   sont les plus contraints, et un artisan attend devant son écran. Un modèle
 *   rapide qui chiffre vaut mieux qu'un modèle savant qui arrive trop tard.
 */
const HORS_SUJET =
  /embedding|aqa|imagen|veo|tts|image|gemma|learnlm|[-.]exp\b|exp$|preview|\bpro\b|-pro/i;
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
 * Signal interne : ce couple version/modèle n'a pas abouti, mais un autre
 * pourrait aboutir.
 *
 * Couvre le modèle absent (404) comme le modèle saturé (5xx) : Google répond
 * « high demand, try again later » sur un modèle très demandé alors qu'un
 * autre répond normalement. Retomber sur le moteur local dans ce cas prive
 * l'artisan de ce qu'on lui promet, pour une panne qui dure quelques secondes.
 *
 * Volontairement distinct d'AppError : il ne remonte jamais à l'utilisateur.
 */
class ModeleIndisponible extends Error {}

/**
 * Signal interne : ce modèle-là a épuisé son quota.
 *
 * Distinct de l'indisponibilité pour que le message final dise la vérité —
 * « saturé, réessayez » plutôt que « aucun modèle disponible » — quand tous
 * les candidats sont épuisés.
 */
class QuotaEpuise extends ModeleIndisponible {}

interface GeminiPart {
  text?: string;
  inlineData?: { mimeType: string; data: string };
}

export class GeminiProvider implements AIProvider {
  readonly name = 'gemini' as const;
  private apiKey: string;
  private devis: ProfilTache;
  private vision: ProfilTache;
  /** Couple retenu par tâche après repli, mémorisé pour le processus. */
  private resolus = new Map<string, { version: string; modele: string }>();
  /**
   * Ce qu'a donné la dernière recherche de modèle.
   *
   * Remonté dans le message d'erreur, pas seulement journalisé : un opérateur
   * qui n'a pas accès aux journaux de l'hébergeur doit pouvoir comprendre une
   * panne de configuration depuis la réponse elle-même. Un statut HTTP et des
   * noms de modèles ne sont pas des secrets.
   */
  private diagnostic: string | null = null;
  /** Modèles que l'API annonce mais refuse : inutile d'y revenir. */
  private condamnes = new Set<string>();

  constructor(apiKey: string, devis: ProfilTache, vision: ProfilTache) {
    this.apiKey = apiKey;
    this.devis = devis;
    this.vision = vision;
  }

  get available() {
    return true;
  }

  private modeleActif(profil: ProfilTache): string {
    return this.resolus.get(profil.prefere)?.modele ?? profil.prefere;
  }

  /**
   * Énumère les modèles réellement servis, du plus souhaitable au moins.
   *
   * La liste vient de l'API : aucune valeur écrite en dur ne peut devenir
   * fausse avec le temps. Le modèle configuré passe en tête, puis les
   * préférences, puis le reste — ainsi un modèle retiré n'arrête pas le
   * produit, et un modèle listé mais non servi laisse sa place au suivant.
   */
  private async candidats(profil: ProfilTache): Promise<string[]> {
    let reponse: Response;
    try {
      reponse = await fetch(`${BASE}/models`, {
        headers: { 'x-goog-api-key': this.apiKey },
        signal: AbortSignal.timeout(15_000),
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
      .filter((id) => id && !HORS_SUJET.test(id))
      // Un modèle que l'API a déjà refusé ne mérite pas un second essai : elle
      // continue de l'annoncer après l'avoir fermé aux nouveaux comptes.
      .filter((id) => !this.condamnes.has(id));

    if (servis.length === 0) {
      this.diagnostic = `aucun modèle de génération parmi ${models.length} entrées`;
      return [];
    }
    this.diagnostic = `modèles servis : ${servis.slice(0, 8).join(', ')}`;

    // L'ordre vient du profil : la vision accepte les variantes rapides que la
    // rédaction d'un devis relègue en dernier.
    const ordonnes = [
      profil.prefere,
      ...profil.preferences.filter((p) => servis.includes(p)),
      ...servis,
    ];
    return [...new Set(ordonnes)].filter((m) => servis.includes(m));
  }

  async generateStructuredOutput<TSchema extends z.ZodType>(
    request: StructuredRequest<TSchema>,
    profil: ProfilTache = this.devis,
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
        // Un devis structuré complet dépasse 4096 jetons sur les modèles qui
        // raisonnent avant de répondre : le JSON était coupé en plein objet,
        // et la réponse déclarée inexploitable.
        maxOutputTokens: request.maxTokens ?? 8192,
        temperature: request.temperature ?? 0.2,
      },
    }, profil);

    const texte = textOf(reponse);
    if (!texte) {
      throw new AppError('PROVIDER_UNAVAILABLE', "L'IA n'a pas renvoyé de résultat exploitable.");
    }

    let brut: unknown;
    try {
      brut = JSON.parse(deballer(texte));
    } catch {
      throw new AppError('PROVIDER_UNAVAILABLE', "La réponse de l'IA n'était pas exploitable.");
    }

    const parsed = request.schema.safeParse(brut);
    if (!parsed.success) {
      throw new AppError('PROVIDER_UNAVAILABLE', "La réponse de l'IA était incomplète.", {
        cause: parsed.error,
      });
    }

    return { data: parsed.data, degraded: false, usage: this.usage(reponse, started, profil) };
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
    }, this.devis);
    return {
      data: textOf(reponse).trim(),
      degraded: false,
      usage: this.usage(reponse, started, this.devis),
    };
  }

  async analyzeImage(request: ImageAnalysisRequest): Promise<AIResult<ImageAnalysis>> {
    // Profil vision : modèles rapides et budget court. Une photo lue en trente
    // secondes n'a plus d'intérêt sur un chantier.
    return this.generateStructuredOutput({
      system: IMAGE_ANALYSIS_SYSTEM,
      context: request.trade ? `Métier de l'entreprise : ${request.trade}.` : undefined,
      untrusted: wrapUntrusted(request.untrusted ?? '', 'description_chantier'),
      images: request.images,
      schema: imageAnalysisSchema,
      schemaName: 'analyse_photos',
      maxTokens: 2048,
    }, this.vision);
  }

  private usage(reponse: GeminiResponse, started: number, profil: ProfilTache) {
    return {
      latencyMs: Date.now() - started,
      inputTokens: reponse.usageMetadata?.promptTokenCount,
      outputTokens: reponse.usageMetadata?.candidatesTokenCount,
      thoughtsTokens: reponse.usageMetadata?.thoughtsTokenCount,
      totalTokens: reponse.usageMetadata?.totalTokenCount,
      model: this.modeleActif(profil),
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
  private async call(
    corps: Record<string, unknown>,
    profil: ProfilTache,
  ): Promise<GeminiResponse> {
    const memo = this.resolus.get(profil.prefere);
    if (memo) {
      try {
        return await this.envoyer(memo.version, memo.modele, corps, profil);
      } catch (erreur) {
        if (!(erreur instanceof ModeleIndisponible)) throw erreur;
        this.resolus.delete(profil.prefere);
      }
    }

    // Chaque échec est retenu : ne rapporter que le dernier oblige à
    // redéployer pour découvrir les précédents, ce qui a coûté plusieurs
    // allers-retours.
    const motifs: string[] = [];
    let derniere: Error | null = null;
    for (const version of VERSIONS) {
      try {
        const reponse = await this.envoyer(version, profil.prefere, corps, profil);
        this.resolus.set(profil.prefere, { version, modele: profil.prefere });
        return reponse;
      } catch (erreur) {
        derniere = erreur as Error;
        if (!(erreur instanceof ModeleIndisponible)) throw erreur;
        motifs.push((erreur as Error).message);
      }
    }

    let essais = 0;
    for (const modele of await this.candidats(profil)) {
      if (modele === profil.prefere) continue;
      if (essais >= profil.essaisMax) break;
      essais += 1;
      for (const version of VERSIONS) {
        try {
          const reponse = await this.envoyer(version, modele, corps, profil);
          this.resolus.set(profil.prefere, { version, modele });
          console.warn(
            `[ia] « ${profil.prefere} » indisponible — bascule sur « ${modele} » (${version}). ` +
              'Fixez GEMINI_QUOTE_MODEL ou GEMINI_VISION_MODEL pour supprimer cette recherche.',
          );
          return reponse;
        } catch (erreur) {
          derniere = erreur as Error;
          if (!(erreur instanceof ModeleIndisponible)) throw erreur;
          motifs.push((erreur as Error).message);
        }
      }
    }

    if (derniere instanceof QuotaEpuise) {
      throw new AppError('RATE_LIMITED', "Le service d'IA est saturé. Réessayez dans un instant.", {
        cause: derniere,
      });
    }
    throw new AppError(
      'PROVIDER_UNAVAILABLE',
      `Aucun modèle d'IA disponible. Essais : ${motifs.join(' | ') || 'aucun'}` +
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
    profil: ProfilTache,
  ): Promise<GeminiResponse> {
    let reponse: Response;
    try {
      reponse = await fetch(`${RACINE}/${version}/models/${modele}:generateContent`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-goog-api-key': this.apiKey },
        body: JSON.stringify(corps),
        signal: AbortSignal.timeout(profil.timeoutMs),
      });
    } catch (cause) {
      console.error(`[ia] gemini injoignable — ${version}/${modele} :`, cause);
      // Le motif fait partie du message : diagnostiquer une panne de
      // production ne doit pas exiger l'accès aux journaux de l'hébergeur.
      // Un nom d'erreur réseau n'est pas un secret.
      const motif = cause instanceof Error ? `${cause.name}: ${cause.message}` : String(cause);
      // Un modèle qui dépasse son budget n'est pas une panne du service : un
      // autre répondra peut-être dans les temps. C'est le cas exact qui a fait
      // expirer une analyse de photo pendant qu'un devis occupait la ligne.
      if (cause instanceof Error && /timeout|abort/i.test(cause.name + cause.message)) {
        throw new ModeleIndisponible(`${version}/${modele} : délai de ${profil.timeoutMs} ms dépassé.`);
      }
      throw new AppError(
        'PROVIDER_UNAVAILABLE',
        `Service d'IA injoignable (${motif.slice(0, 120)}).`,
        { cause },
      );
    }

    if (!reponse.ok) {
      const message = extractMessage(await reponse.text().catch(() => ''));
      console.error(`[ia] gemini a refusé — statut ${reponse.status}, ${version}/${modele} : ${message}`);
      // Les quotas du palier gratuit sont comptés par modèle, pas par projet :
      // un modèle épuisé n'empêche pas les autres de répondre. Constaté en
      // production, où une analyse de photo a réussi dans la seconde qui
      // suivait un 429 sur la génération de devis.
      if (reponse.status === 429) {
        throw new QuotaEpuise(`${version}/${modele} : quota atteint.`);
      }
      if (reponse.status === 401 || reponse.status === 403) {
        throw new AppError('PROVIDER_UNAVAILABLE', "La clé d'API IA est invalide ou expirée.");
      }
      // Codes internes : ils ne remontent jamais à l'utilisateur, ils servent
      // à savoir s'il vaut la peine d'essayer autre chose. Un 5xx sur un
      // modèle très demandé n'est pas une panne du service : les modèles ont
      // des capacités distinctes.
      if (reponse.status === 404) this.condamnes.add(modele);
      if (reponse.status === 404 || reponse.status >= 500) {
        throw new ModeleIndisponible(
          `${version}/${modele} indisponible (${reponse.status} ${message.slice(0, 100)}).`,
        );
      }
      if (reponse.status === 400) {
        throw new AppError('PROVIDER_UNAVAILABLE', `Requête refusée par le service d'IA : ${message}`);
      }
      throw new AppError(
        'PROVIDER_UNAVAILABLE',
        `Service d'IA en erreur (${reponse.status} sur ${version}/${modele} : ${message.slice(0, 140)}).`,
      );
    }

    return (await reponse.json()) as GeminiResponse;
  }
}

interface GeminiResponse {
  candidates?: { content?: { parts?: GeminiPart[] }; finishReason?: string }[];
  usageMetadata?: {
    promptTokenCount?: number;
    candidatesTokenCount?: number;
    /** Jetons consommés à réfléchir, facturés à part par Google. */
    thoughtsTokenCount?: number;
    totalTokenCount?: number;
  };
}

/**
 * Retire un éventuel encadrement Markdown autour du JSON.
 *
 * `responseMimeType: application/json` suffit presque toujours ; certains
 * modèles ajoutent malgré tout une clôture ```json. Refuser la réponse pour
 * trois caractères de décoration serait absurde.
 */
function deballer(texte: string): string {
  const encadre = texte.trim().match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return encadre ? encadre[1]! : texte;
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

/**
 * Mots-clés conservés dans le schéma transmis à Gemini.
 *
 * Liste blanche plutôt que liste noire : `z.toJSONSchema` produit des
 * contraintes de validation — bornes, longueurs, motifs — que l'API refuse
 * par « Request contains an invalid argument », et qui n'apportent rien ici
 * puisque Zod revalide la réponse de toute façon. Seule la structure compte
 * pour guider le modèle ; la validation reste de notre côté.
 */
const CONSERVES = new Set([
  'type',
  'properties',
  'required',
  'items',
  'enum',
  'nullable',
  'description',
  'anyOf',
]);

function nettoyer(noeud: unknown): unknown {
  if (Array.isArray(noeud)) return noeud.map(nettoyer);
  if (noeud === null || typeof noeud !== 'object') return noeud;

  const source = noeud as Record<string, unknown>;
  const sortie: Record<string, unknown> = {};

  for (const [cle, valeur] of Object.entries(source)) {
    if (!CONSERVES.has(cle)) continue;

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

    // Sous `properties`, les clés sont des noms de champs choisis par le
    // schéma, pas des mots-clés : elles traversent sans filtrage.
    if (cle === 'properties' && valeur && typeof valeur === 'object') {
      sortie.properties = Object.fromEntries(
        Object.entries(valeur as Record<string, unknown>).map(([nom, sous]) => [nom, nettoyer(sous)]),
      );
      continue;
    }

    sortie[cle] = nettoyer(valeur);
  }

  return sortie;
}

/** Profil de rédaction : la qualité prime, l'écran couvre l'attente. */
export function profilDevis(prefere?: string): ProfilTache {
  return {
    prefere: prefere?.trim() || PREFERENCES_DEVIS[0]!,
    preferences: PREFERENCES_DEVIS,
    timeoutMs: 90_000,
    essaisMax: 3,
  };
}

/**
 * Profil de lecture de photo : la rapidité prime.
 *
 * Vingt secondes par envoi, deux replis : au pire, l'artisan attend une minute
 * et reçoit un message clair, au lieu de patienter sans savoir. Le devis, lui,
 * garde son budget long — il est couvert par une progression à l'écran.
 */
export function profilVision(prefere?: string): ProfilTache {
  return {
    prefere: prefere?.trim() || PREFERENCES_VISION[0]!,
    preferences: PREFERENCES_VISION,
    timeoutMs: 20_000,
    // Un échec de vision est rapide — quota ou modèle fermé répondent en une
    // demi-seconde. Trois replis restent très loin du budget de vingt secondes.
    essaisMax: 3,
  };
}

export function createGeminiProvider(): GeminiProvider | null {
  const config = env();
  if (!config.GEMINI_API_KEY) return null;
  return new GeminiProvider(
    config.GEMINI_API_KEY,
    // `GEMINI_MODEL` est hérité : il ne s'applique plus qu'aux devis.
    profilDevis(config.GEMINI_QUOTE_MODEL ?? config.GEMINI_MODEL),
    profilVision(config.GEMINI_VISION_MODEL),
  );
}
