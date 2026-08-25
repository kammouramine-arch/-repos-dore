import Anthropic from '@anthropic-ai/sdk';
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
    const jsonSchema = toJsonSchema(request.schema);

    const response = await this.call(() =>
      this.client.messages.create({
        model: this.model,
        max_tokens: request.maxTokens ?? 4096,
        ...samplingParams(this.model, request.temperature ?? 0.2),
        system: request.system,
        tools: [
          {
            name: request.schemaName,
            description: `Renvoie le résultat structuré ${request.schemaName}.`,
            input_schema: jsonSchema as Anthropic.Tool['input_schema'],
          },
        ],
        tool_choice: { type: 'tool', name: request.schemaName },
        messages: [
          {
            role: 'user',
            content: buildContent(request.context, request.untrusted, request.images),
          },
        ],
      }),
    );

    const toolUse = response.content.find((block) => block.type === 'tool_use');
    if (!toolUse || toolUse.type !== 'tool_use') {
      throw new AppError('PROVIDER_UNAVAILABLE', "L'IA n'a pas renvoyé de résultat exploitable.");
    }

    const parsed = request.schema.safeParse(toolUse.input);
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
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
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

  /** Traduit les erreurs SDK en erreurs applicatives, sans fuite de secret. */
  private async call<T>(fn: () => Promise<T>): Promise<T> {
    try {
      return await fn();
    } catch (error) {
      if (error instanceof Anthropic.APIError) {
        if (error.status === 429) {
          throw new AppError('RATE_LIMITED', "Le service d'IA est saturé. Réessayez dans un instant.");
        }
        if (error.status === 401 || error.status === 403) {
          throw new AppError('PROVIDER_UNAVAILABLE', "La clé d'API IA est invalide ou expirée.");
        }
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
