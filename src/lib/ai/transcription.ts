import { env } from '../env';
import { AppError } from '../errors';
import type { AIResult, TranscriptionProvider, TranscriptionRequest } from './types';

const MAX_AUDIO_BYTES = 20 * 1024 * 1024;

/**
 * Transcription audio via une API compatible OpenAI (OpenAI, Groq, Whisper auto-hébergé).
 * L'URL de base est configurable : changer de fournisseur ne demande aucune modification de code.
 */
export class OpenAICompatibleTranscription implements TranscriptionProvider {
  readonly name = 'openai-compatible';

  constructor(
    private apiKey: string,
    private baseUrl: string,
    private model: string,
  ) {}

  get available() {
    return true;
  }

  async transcribeAudio(request: TranscriptionRequest): Promise<AIResult<{ text: string }>> {
    const started = Date.now();
    const bytes = Buffer.from(request.audio.base64, 'base64');
    if (bytes.byteLength > MAX_AUDIO_BYTES) {
      throw new AppError('VALIDATION', "L'enregistrement audio dépasse 20 Mo.");
    }

    const form = new FormData();
    form.append('file', new Blob([new Uint8Array(bytes)], { type: request.audio.mimeType }), request.audio.fileName ?? 'audio.webm');
    form.append('model', this.model);
    form.append('language', request.language ?? 'fr');
    if (request.hints?.length) {
      form.append('prompt', request.hints.join(', ').slice(0, 800));
    }

    const response = await fetch(`${this.baseUrl.replace(/\/$/, '')}/audio/transcriptions`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${this.apiKey}` },
      body: form,
    }).catch((cause) => {
      throw new AppError('PROVIDER_UNAVAILABLE', 'Le service de transcription est injoignable.', {
        cause,
      });
    });

    if (!response.ok) {
      if (response.status === 429) {
        throw new AppError('RATE_LIMITED', 'Service de transcription saturé. Réessayez dans un instant.');
      }
      throw new AppError('PROVIDER_UNAVAILABLE', "La transcription audio a échoué.");
    }

    const payload = (await response.json()) as { text?: string };
    return {
      data: { text: (payload.text ?? '').trim() },
      degraded: false,
      usage: { latencyMs: Date.now() - started, model: this.model, provider: 'anthropic' },
    };
  }
}

export function createTranscriptionProvider(): TranscriptionProvider | null {
  const config = env();
  if (config.TRANSCRIPTION_PROVIDER === 'none' || !config.TRANSCRIPTION_API_KEY) return null;
  return new OpenAICompatibleTranscription(
    config.TRANSCRIPTION_API_KEY,
    config.TRANSCRIPTION_BASE_URL,
    config.TRANSCRIPTION_MODEL,
  );
}

/** Vocabulaire métier transmis au moteur de transcription pour fiabiliser la reconnaissance. */
export const TRADE_VOCABULARY = [
  'siphon', 'flexible', 'robinet thermostatique', 'chaudière', 'ballon d’eau chaude',
  'groupe de sécurité', 'mitigeur', 'évier', 'VMC', 'tableau électrique', 'disjoncteur',
  'différentiel', 'gaine', 'prise', 'va-et-vient', 'radiateur', 'plancher chauffant',
  'enduit', 'placo', 'BA13', 'sous-couche', 'zinguerie', 'faîtage', 'liteaux', 'chevron',
  'gouttière', 'velux', 'main-d’œuvre', 'devis', 'TVA', 'HT', 'TTC',
];
