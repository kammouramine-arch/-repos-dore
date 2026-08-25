/**
 * Speech to text.
 *
 * Transcription is a different shape from text generation — multipart audio in, a
 * transcript out, and priced per minute rather than per token — so it has its own
 * adapter contract rather than being forced through a chat completion.
 */

import type { ModelConfig, ProviderConfig } from '../registry.ts';
import { AIError } from '../types.ts';
import { providerError } from './shared.ts';

export type TranscriptionRequest = {
  requestId: string;
  file: File;
  /** Best known length, used for metering. The adapter may correct it from the provider. */
  durationSeconds: number;
  language?: string;
};

export type TranscriptionResult = {
  text: string;
  provider: string;
  model: string;
  durationSeconds: number;
  latencyMs: number;
  providerRequestId: string | null;
};

/**
 * Groq and OpenAI both expose Whisper at an OpenAI-compatible
 * `POST /audio/transcriptions` taking multipart form data.
 */
export async function transcribeOpenAIStyle(
  request: TranscriptionRequest,
  model: ModelConfig,
  provider: ProviderConfig,
  apiKey: string,
  timeoutMs: number,
): Promise<TranscriptionResult> {
  const started = Date.now();
  const form = new FormData();
  form.append('file', request.file);
  form.append('model', model.modelId);
  // Verbose JSON returns the true duration, which is what should be metered rather
  // than whatever the client claimed.
  form.append('response_format', 'verbose_json');
  if (request.language) form.append('language', request.language);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${provider.baseUrl}/audio/transcriptions`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}` },
      body: form,
      signal: controller.signal,
    });
    const body = await res.text();
    if (!res.ok) throw providerError(provider.label, res.status, body);

    let json: any = null;
    try { json = body ? JSON.parse(body) : null; } catch { /* handled below */ }
    if (!json || typeof json.text !== 'string') {
      throw new AIError('UNKNOWN_PROVIDER_ERROR', `${provider.label} returned no transcript.`);
    }

    return {
      text: json.text,
      provider: provider.provider,
      model: model.modelId,
      // Charge the provider's measured duration where it gives one; never less than
      // what the client reported, so a client cannot under-report to pay less.
      durationSeconds: Math.max(request.durationSeconds, Number(json.duration ?? 0)),
      latencyMs: Date.now() - started,
      providerRequestId: res.headers.get('x-request-id'),
    };
  } catch (e: any) {
    if (e instanceof AIError) throw e;
    if (e?.name === 'AbortError') {
      throw new AIError('PROVIDER_TIMEOUT', `${provider.label} did not respond within ${timeoutMs}ms`, { retryable: true });
    }
    throw new AIError('UNKNOWN_PROVIDER_ERROR', `${provider.label}: ${e?.message ?? 'request failed'}`, { retryable: true });
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Audio adapters by provider. All three expose the same OpenAI-compatible multipart
 * endpoint, so one implementation serves them; the registry decides which is eligible
 * for a given recording's privacy class.
 */
export const AUDIO_ADAPTERS: Record<string, typeof transcribeOpenAIStyle> = {
  groq: transcribeOpenAIStyle,
  mistral: transcribeOpenAIStyle,
  openai: transcribeOpenAIStyle,
};
