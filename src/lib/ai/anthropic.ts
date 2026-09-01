import Anthropic from '@anthropic-ai/sdk';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
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

const MAX_IMAGES = 6;
/**
 * Les modèles Claude 4.6 et suivants (Opus 5, Sonnet 5, Opus 4.6/4.7/4.8…)
 * rejettent `temperature` avec une erreur 400. Le paramètre n'est donc envoyé
 * qu'aux modèles antérieurs, que `ANTHROPIC_MODEL` permet toujours de choisir.
 */
function samplingParams(model: string, temperature: number): { temperature?: number } {
  const legacy = /^claude-(3|opus-4-5|sonnet-4-5|haiku-4-5|sonnet-4-0|opus-4-0|opus-4-1)/.test(model);
  return legacy ? { temperature } : {};
}

const SUPPORTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

/**
 * Modèles qui n'acceptent plus la sortie structurée par appel d'outil forcé.
 *
 * Sur Opus 5 et suivants, la réflexion est active par défaut, et elle est
 * incompatible avec un `tool_choice` imposé : l'API répond 400, l'appel
 * échouait, et le moteur local prenait silencieusement le relais — la
 * production annonçait « IA disponible » tout en produisant des devis
 * heuristiques. Ces modèles utilisent `output_config.format`, prévu pour ça.
 */
function usesOutputConfig(model: string): boolean {
  return !/^claude-(3|opus-4-5|sonnet-4-5|haiku-4-5|sonnet-4-0|opus-4-0|opus-4-1)/.test(model);
}

/** Fournisseur IA principal : Claude (sortie structurée via appel d'outil). */
export class AnthropicProvider implements AIProvider {
  readonly name = 'anthropic' as const;
  private client: Anthropic;
  private model: string;

  constructor(apiKey: string, model: string) {
    this.client = new Anthropic({ apiKey });
    this.model = model;
  }

  get available() {
    return true;
  }

  async generateStructuredOutput<TSchema extends z.ZodType>(
    request: StructuredRequest<TSchema>,
  ): Promise<AIResult<z.infer<TSchema>>> {
    const started = Date.now();
    const content = buildContent(request.context, request.untrusted, request.images);
    const commun = {
      model: this.model,
      max_tokens: request.maxTokens ?? 4096,
      ...samplingParams(this.model, request.temperature ?? 0.2),
      system: request.system,
      messages: [{ role: 'user' as const, content }],
    };

    let brut: unknown;
    let usage: Anthropic.Usage;

    if (usesOutputConfig(this.model)) {
      const response = await this.call(() =>
        this.client.messages.parse({
          ...commun,
          output_config: { format: zodOutputFormat(request.schema) },
        }),
      );
      brut = response.parsed_output;
      usage = response.usage;
    } else {
      // Modèles antérieurs : l'appel d'outil forcé reste la seule voie.
      const response = await this.call(() =>
        this.client.messages.create({
          ...commun,
          tools: [
            {
              name: request.schemaName,
              description: `Renvoie le résultat structuré ${request.schemaName}.`,
              input_schema: toJsonSchema(request.schema) as Anthropic.Tool['input_schema'],
            },
          ],
          tool_choice: { type: 'tool', name: request.schemaName },
        }),
      );
      const toolUse = response.content.find((block) => block.type === 'tool_use');
      if (!toolUse || toolUse.type !== 'tool_use') {
        throw new AppError('PROVIDER_UNAVAILABLE', "L'IA n'a pas renvoyé de résultat exploitable.");
      }
      brut = toolUse.input;
      usage = response.usage;
    }

    if (brut == null) {
      throw new AppError('PROVIDER_UNAVAILABLE', "L'IA n'a pas renvoyé de résultat exploitable.");
    }

    const parsed = request.schema.safeParse(brut);
    if (!parsed.success) {
      throw new AppError('PROVIDER_UNAVAILABLE', "La réponse de l'IA était incomplète.", {
        cause: parsed.error,
      });
    }

    return {
      data: parsed.data,
      degraded: false,
      usage: {
        latencyMs: Date.now() - started,
        inputTokens: usage.input_tokens,
        outputTokens: usage.output_tokens,
        model: this.model,
        provider: this.name,
      },
    };
  }

  async generateText(request: TextRequest): Promise<AIResult<string>> {
    const started = Date.now();
    const response = await this.call(() =>
      this.client.messages.create({
        model: this.model,
        max_tokens: request.maxTokens ?? 1024,
        ...samplingParams(this.model, request.temperature ?? 0.4),
        system: request.system,
        messages: [
          { role: 'user', content: buildContent(request.context, request.untrusted, undefined) },
        ],
      }),
    );

    const text = response.content
      .filter((block) => block.type === 'text')
      .map((block) => (block.type === 'text' ? block.text : ''))
      .join('\n')
      .trim();

    return {
      data: text,
      degraded: false,
      usage: {
        latencyMs: Date.now() - started,
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
        model: this.model,
        provider: this.name,
      },
    };
  }

  async analyzeImage(request: ImageAnalysisRequest): Promise<AIResult<ImageAnalysis>> {
    const result = await this.generateStructuredOutput({
      system: IMAGE_ANALYSIS_SYSTEM,
      context: request.trade ? `Métier de l'entreprise : ${request.trade}.` : undefined,
      untrusted: wrapUntrusted(request.untrusted, 'description_chantier'),
      images: request.images,
      schema: imageAnalysisSchema,
      schemaName: 'analyse_photos',
      maxTokens: 2048,
    });
    return result;
  }

  /**
   * Traduit les erreurs SDK en erreurs applicatives, sans fuite de secret.
   *
   * Le motif exact est journalisé : une requête refusée pour cause de forme
   * (400) tombait auparavant dans le même sac qu'une panne réseau, et le
   * moteur local prenait le relais sans que rien n'indique pourquoi. La clé
   * n'apparaît jamais — seuls le statut et le message de l'API sont retenus.
   */
  private async call<T>(fn: () => Promise<T>): Promise<T> {
    try {
      return await fn();
    } catch (error) {
      if (error instanceof Anthropic.APIError) {
        console.error(
          `[ai] appel refusé par l'API — statut ${error.status}, modèle ${this.model} : ${error.message}`,
        );
        if (error.status === 429) {
          throw new AppError('RATE_LIMITED', "Le service d'IA est saturé. Réessayez dans un instant.");
        }
        if (error.status === 401 || error.status === 403) {
          throw new AppError('PROVIDER_UNAVAILABLE', "La clé d'API IA est invalide ou expirée.");
        }
        if (error.status === 400) {
          // Une requête mal formée ne se répare pas en réessayant : c'est un
          // défaut de notre côté, et il doit se voir.
          throw new AppError(
            'PROVIDER_UNAVAILABLE',
            `Requête refusée par le service d'IA (${error.message}).`,
            { cause: error },
          );
        }
      } else {
        console.error("[ai] appel impossible :", error);
      }
      throw new AppError('PROVIDER_UNAVAILABLE', "Le service d'IA est momentanément indisponible.", {
        cause: error,
      });
    }
  }
}

function buildContent(
  context: string | undefined,
  untrusted: string,
  images: StructuredRequest<z.ZodType>['images'],
): Anthropic.MessageParam['content'] {
  const blocks: Anthropic.ContentBlockParam[] = [];

  for (const image of (images ?? []).slice(0, MAX_IMAGES)) {
    if (!SUPPORTED_IMAGE_TYPES.includes(image.mimeType)) continue;
    blocks.push({
      type: 'image',
      source: {
        type: 'base64',
        media_type: image.mimeType as 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif',
        data: image.base64,
      },
    });
  }

  const text = [context ? `Contexte de l'entreprise :\n${context}` : null, untrusted]
    .filter(Boolean)
    .join('\n\n');

  blocks.push({ type: 'text', text: text || 'Aucune information fournie.' });
  return blocks;
}

/** Conversion Zod -> JSON Schema attendu par l'API d'outils. */
function toJsonSchema(schema: z.ZodType): Record<string, unknown> {
  const json = z.toJSONSchema(schema, { target: 'draft-7', io: 'input' }) as Record<string, unknown>;
  delete json.$schema;
  return { ...json, type: 'object' };
}

export function createAnthropicProvider(): AnthropicProvider | null {
  const config = env();
  if (!config.ANTHROPIC_API_KEY) return null;
  return new AnthropicProvider(config.ANTHROPIC_API_KEY, config.ANTHROPIC_MODEL);
}
