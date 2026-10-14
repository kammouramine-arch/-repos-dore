import { env } from '@/config';
import type { HttpClient } from '@/services/http/httpClient';
import type { TranscriptEvent } from '@/core/domain/ports/speechRecognizer';

export const createGatewayTranscriber = ({ http, getAccessToken }: { http: HttpClient; getAccessToken(): Promise<string | null> }) =>
  async (audio: string, locales: readonly string[], signal: AbortSignal): Promise<TranscriptEvent | null> => {
    if (signal.aborted) return null;
    const token = await getAccessToken();
    if (!token || signal.aborted || !env.backendUrl.startsWith('https://')) return null;
    const language = locales.length > 1 ? 'auto' : locales[0]?.startsWith('fr') ? 'fr' : 'en';
    return http.postJson(`${env.backendUrl}/speech/transcribe`, { audio, language, consent: true }, value => {
      if (!value || typeof value !== 'object' || !('text' in value)) return null;
      return typeof value.text === 'string' && value.text.trim() && value.text.length <= 500 ? { text: value.text, isFinal: true, confidence: undefined } : null;
    }, { signal, timeoutMs: 12000, operation: 'speech.transcribe', headers: { Authorization: `Bearer ${token}` } });
  };
