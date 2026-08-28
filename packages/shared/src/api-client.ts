import type {
  ApiError,
  ApiResponse,
  AuthTokenDTO,
  BillingOverviewDTO,
  CustomerDTO,
  DashboardDTO,
  FollowUpDraftDTO,
  GeneratedQuoteDTO,
  LeadDTO,
  NotificationDTO,
  QuoteDetailDTO,
  QuoteSummaryDTO,
  SessionDTO,
} from './contracts';
import type { PlanId } from './plans';
import type { FollowUpTone } from './labels';

/**
 * Client d'API DEVISIA.
 *
 * Utilisé tel quel par l'application mobile ; le web s'appuie sur ses propres
 * routes serveur mais partage les mêmes types. L'authentification passe par un
 * jeton porteur pour le mobile, par le cookie de session pour le navigateur.
 */

export class DevisiaApiError extends Error {
  readonly code: ApiError['code'];
  readonly status: number;
  readonly details?: Record<string, string[]>;
  readonly retryable: boolean;

  constructor(error: ApiError, status: number) {
    super(error.message);
    this.name = 'DevisiaApiError';
    this.code = error.code;
    this.status = status;
    this.details = error.details;
    this.retryable = error.retryable ?? false;
  }
}

/** Délai au-delà duquel une requête est abandonnée (réseau de chantier). */
export const DEFAULT_TIMEOUT_MS = 20_000;

/**
 * Construit l'erreur rendue lorsque la requête n'a jamais atteint le serveur :
 * pas de réseau, DNS injoignable, ou délai dépassé. Le code `NETWORK` permet
 * aux écrans de distinguer une panne de connexion d'un refus du serveur.
 */
function networkError(cause: unknown): DevisiaApiError {
  const aborted = cause instanceof Error && cause.name === 'AbortError';
  return new DevisiaApiError(
    {
      code: 'NETWORK',
      message: aborted
        ? 'Le serveur met trop de temps à répondre. Vérifiez votre connexion.'
        : 'Pas de connexion. Vérifiez votre réseau et réessayez.',
      retryable: true,
    },
    0,
  );
}

export interface ApiClientOptions {
  baseUrl: string;
  /** Délai maximal par requête, en millisecondes. */
  timeoutMs?: number;
  /** Renvoie le jeton courant (mobile) ; absent, les cookies sont utilisés. */
  getToken?: () => Promise<string | null> | string | null;
  /** Appelé lorsque le serveur répond 401 : permet de déconnecter proprement. */
  onUnauthenticated?: () => void;
  fetchImpl?: typeof fetch;
}

export interface UploadFile {
  uri: string;
  name: string;
  type: string;
}

export function createApiClient(options: ApiClientOptions) {
  const doFetch = options.fetchImpl ?? fetch;
  const base = options.baseUrl.replace(/\/$/, '');
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  /**
   * Enveloppe chaque appel : délai maximal, et traduction des pannes réseau en
   * `DevisiaApiError` afin qu'aucun écran ne reçoive un `TypeError` brut.
   */
  async function send(url: string, init: RequestInit): Promise<Response> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      return await doFetch(url, { ...init, signal: controller.signal });
    } catch (cause) {
      throw networkError(cause);
    } finally {
      clearTimeout(timer);
    }
  }

  async function authHeaders(): Promise<Record<string, string>> {
    if (!options.getToken) return {};
    const token = await options.getToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  async function unwrap<T>(response: Response): Promise<T> {
    let payload: ApiResponse<T> | null = null;
    try {
      payload = (await response.json()) as ApiResponse<T>;
    } catch {
      payload = null;
    }

    if (!response.ok || !payload || 'error' in payload) {
      const error: ApiError =
        payload && 'error' in payload
          ? payload.error
          : {
              code: response.status === 401 ? 'UNAUTHENTICATED' : 'INTERNAL',
              message:
                response.status === 401
                  ? 'Votre session a expiré. Reconnectez-vous.'
                  : "Une erreur inattendue s'est produite. Merci de réessayer.",
              retryable: response.status >= 500,
            };
      if (error.code === 'UNAUTHENTICATED') options.onUnauthenticated?.();
      throw new DevisiaApiError(error, response.status);
    }

    return payload.data;
  }

  async function request<T>(
    path: string,
    init: RequestInit & { json?: unknown } = {},
  ): Promise<T> {
    const { json, headers, ...rest } = init;
    const response = await send(`${base}${path}`, {
      ...rest,
      headers: {
        ...(json !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(await authHeaders()),
        ...(headers as Record<string, string> | undefined),
      },
      body: json !== undefined ? JSON.stringify(json) : rest.body,
      credentials: options.getToken ? 'omit' : 'include',
    });
    return unwrap<T>(response);
  }

  async function upload<T>(
    path: string,
    form: FormData,
  ): Promise<T> {
    const response = await send(`${base}${path}`, {
      method: 'POST',
      headers: await authHeaders(),
      body: form,
      credentials: options.getToken ? 'omit' : 'include',
    });
    return unwrap<T>(response);
  }

  return {
    request,
    upload,

    auth: {
      signIn: (email: string, password: string, deviceName?: string) =>
        request<AuthTokenDTO>('/api/auth/session', {
          method: 'POST',
          json: { email, password, deviceName },
        }),
      signUp: (input: {
        email: string;
        password: string;
        companyName: string;
        firstName?: string;
        lastName?: string;
        deviceName?: string;
      }) => request<AuthTokenDTO>('/api/auth/inscription', { method: 'POST', json: input }),
      signOut: () => request<{ signedOut: boolean }>('/api/auth/session', { method: 'DELETE' }),
      me: () => request<SessionDTO>('/api/auth/session'),
      requestPasswordReset: (email: string) =>
        request<{ requested: boolean }>('/api/auth/mot-de-passe', { method: 'POST', json: { email } }),
    },

    dashboard: (period = 30) => request<DashboardDTO>(`/api/dashboard?periode=${period}`),

    quotes: {
      list: (params: { statut?: string; take?: number } = {}) => {
        const search = new URLSearchParams();
        if (params.statut) search.set('statut', params.statut);
        if (params.take) search.set('take', String(params.take));
        const suffix = search.toString();
        return request<{ total: number; items: QuoteSummaryDTO[] }>(
          `/api/quotes${suffix ? `?${suffix}` : ''}`,
        );
      },
      get: (id: string) => request<QuoteDetailDTO>(`/api/quotes/${id}`),
      create: (input: unknown) => request<QuoteDetailDTO>('/api/quotes', { method: 'POST', json: input }),
      update: (id: string, input: unknown) =>
        request<QuoteDetailDTO>(`/api/quotes/${id}`, { method: 'PATCH', json: input }),
      send: (id: string, input: { message?: string | null; to?: string | null } = {}) =>
        request<{ quote: QuoteDetailDTO; publicUrl: string; recipient: string }>(
          `/api/quotes/${id}/envoi`,
          { method: 'POST', json: input },
        ),
      followUpDraft: (id: string, tone: FollowUpTone = 'professionnel') =>
        request<FollowUpDraftDTO>(`/api/quotes/${id}/relance?ton=${tone}`),
      sendFollowUp: (id: string, input: { subject: string; body: string }) =>
        request<{ id: string; sentAt: string | null }>(`/api/quotes/${id}/relance`, {
          method: 'POST',
          json: input,
        }),
      pdfUrl: (id: string) => `${base}/api/quotes/${id}/pdf`,
    },

    customers: {
      list: (search?: string) =>
        request<{ total: number; items: CustomerDTO[] }>(
          `/api/customers${search ? `?q=${encodeURIComponent(search)}` : ''}`,
        ),
      create: (input: unknown) => request<CustomerDTO>('/api/customers', { method: 'POST', json: input }),
    },

    leads: {
      list: () => request<LeadDTO[]>('/api/leads'),
      create: (input: unknown) => request<LeadDTO>('/api/leads', { method: 'POST', json: input }),
      update: (id: string, input: unknown) =>
        request<LeadDTO>(`/api/leads/${id}`, { method: 'PATCH', json: input }),
      convert: (id: string) =>
        request<{ customerId: string; jobId: string | null }>(`/api/leads/${id}/convertir`, {
          method: 'POST',
        }),
    },

    ai: {
      generateQuote: (input: { description: string; fileIds?: string[]; leadId?: string | null }) =>
        request<GeneratedQuoteDTO>('/api/ai/quote', { method: 'POST', json: input }),
      assistant: (question: string) =>
        request<{ answer: string; actions: { label: string; href?: string | null }[]; degraded: boolean }>(
          '/api/ai/assistant',
          { method: 'POST', json: { question } },
        ),
    },

    files: {
      upload: (file: UploadFile, kind = 'PHOTO_CHANTIER') => {
        const form = new FormData();
        // React Native accepte un objet {uri,name,type} là où le web attend un File.
        form.append('file', file as unknown as Blob);
        form.append('kind', kind);
        return upload<{ id: string; url: string; fileName: string }>('/api/files', form);
      },
      transcribe: (file: UploadFile) => {
        const form = new FormData();
        form.append('audio', file as unknown as Blob);
        return upload<{ text: string }>('/api/ai/transcribe', form);
      },
    },

    notifications: {
      list: () => request<{ unread: number; items: NotificationDTO[] }>('/api/notifications'),
      markAllRead: () => request<{ read: boolean }>('/api/notifications', { method: 'POST' }),
      registerDevice: (input: { token: string; platform: 'ios' | 'android'; deviceName?: string }) =>
        request<{ registered: boolean }>('/api/notifications/appareils', {
          method: 'POST',
          json: input,
        }),
      unregisterDevice: (token: string) =>
        request<{ removed: boolean }>('/api/notifications/appareils', {
          method: 'DELETE',
          json: { token },
        }),
    },

    billing: {
      overview: () => request<BillingOverviewDTO>('/api/billing'),
      checkout: (plan: PlanId) => request<{ url: string }>('/api/billing/checkout', { method: 'POST', json: { plan } }),
      portal: () => request<{ url: string }>('/api/billing/portail', { method: 'POST' }),
      changePlan: (plan: PlanId) =>
        request<{ plan: PlanId; effectiveAt: string | null }>('/api/billing/formule', {
          method: 'POST',
          json: { plan },
        }),
      cancel: (immediate = false) =>
        request<{ cancelAtPeriodEnd: boolean; endsAt: string | null }>('/api/billing/annulation', {
          method: 'POST',
          json: { immediate },
        }),
      resume: () => request<{ resumed: boolean }>('/api/billing/reprise', { method: 'POST' }),
    },
  };
}

export type DevisiaApi = ReturnType<typeof createApiClient>;
