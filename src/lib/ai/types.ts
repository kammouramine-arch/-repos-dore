/**
 * Abstraction de fournisseur IA.
 *
 * Aucun appel direct à un SDK d'IA ne doit exister ailleurs dans le code :
 * changer de fournisseur revient à ajouter un fichier dans `lib/ai/`.
 */
import type { z } from 'zod';

export type AIProviderName = 'gemini' | 'anthropic' | 'local';

export interface AIUsage {
  inputTokens?: number;
  outputTokens?: number;
  latencyMs: number;
  model?: string;
  provider: AIProviderName;
}

export interface AIResult<T> {
  data: T;
  usage: AIUsage;
  /** Vrai lorsque le résultat provient du moteur local et non d'un LLM. */
  degraded: boolean;
}

export interface ImageInput {
  /** Contenu encodé en base64, sans préfixe data:. */
  base64: string;
  mimeType: string;
  fileName?: string;
}

export interface StructuredRequest<TSchema extends z.ZodType> {
  /** Instructions système — contenu de confiance, jamais fourni par un client. */
  system: string;
  /** Contexte métier de confiance (catalogue, paramètres de l'entreprise). */
  context?: string;
  /** Contenu non fiable (saisie utilisateur, transcription, message client). */
  untrusted: string;
  images?: ImageInput[];
  schema: TSchema;
  schemaName: string;
  maxTokens?: number;
  temperature?: number;
}

export interface TextRequest {
  system: string;
  context?: string;
  untrusted: string;
  maxTokens?: number;
  temperature?: number;
}

export interface TranscriptionRequest {
  audio: { base64: string; mimeType: string; fileName?: string };
  language?: 'fr' | 'en';
  /** Vocabulaire métier pour améliorer la reconnaissance. */
  hints?: string[];
}

export interface ImageAnalysisRequest {
  images: ImageInput[];
  trade?: string;
  untrusted?: string;
}

export interface ImageAnalysis {
  description: string;
  observations: string[];
  detectedItems: string[];
  missingInformation: string[];
}

export interface AIProvider {
  readonly name: AIProviderName;
  readonly available: boolean;
  generateStructuredOutput<TSchema extends z.ZodType>(
    request: StructuredRequest<TSchema>,
  ): Promise<AIResult<z.infer<TSchema>>>;
  generateText(request: TextRequest): Promise<AIResult<string>>;
  analyzeImage(request: ImageAnalysisRequest): Promise<AIResult<ImageAnalysis>>;
}

export interface TranscriptionProvider {
  readonly name: string;
  readonly available: boolean;
  transcribeAudio(request: TranscriptionRequest): Promise<AIResult<{ text: string }>>;
}
