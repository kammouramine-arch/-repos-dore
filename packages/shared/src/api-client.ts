import type {
  ApiError,
  ApiResponse,
  AuthTokenDTO,
  BillingOverviewDTO,
  BusinessProfileDTO,
  CustomerDTO,
  DashboardDTO,
  FollowUpDraftDTO,
  GeneratedQuoteDTO,
  LeadDTO,
  NotificationDTO,
  PriceBookItemDTO,
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
 * Délai propre aux téléversements.
 *
 * Vingt secondes conviennent à un appel JSON ; une photo de chantier envoyée
 * en 4G depuis un sous-sol met couramment plus longtemps. L'artisan voyait
 * alors « Vérifiez votre connexion » alors que sa connexion allait bien : le
 * client avait abandonné avant le serveur.
 */
export const UPLOAD_TIMEOUT_MS = 60_000;
/** AI has a bounded server-side budget, separate from ordinary JSON reads. */
export const AI_TIMEOUT_MS = 75_000;

/**
 * Construit l'erreur rendue lorsque la requête n'a jamais atteint le serveur.
 *
 * Le message ne prétend jamais savoir *pourquoi*. L'application ne peut
 * constater qu'une chose — elle n'a pas obtenu de réponse — et affirmer « pas
 * de connexion » à un artisan dont le téléphone affiche quatre barres de
 * réseau détruit la confiance dans tous les autres messages.
 */
function transportError(cause: unknown, timedOut = false): DevisiaApiError {
  const aborted = timedOut || (cause instanceof Error && /abort|timeout/i.test(cause.name));
  return new DevisiaApiError(
    {
      code: aborted ? 'TIMEOUT' : 'NETWORK',
      message: aborted
        ? 'Le serveur met trop de temps à répondre. Réessayez dans un instant.'
        : 'DEVISIA n’a pas pu joindre le serveur. Vérifiez votre connexion, puis réessayez.',
      retryable: true,
    },
    0,
  );
}

/** Traduit un statut HTTP nu, lorsque la réponse ne porte aucun corps JSON. */
function fromStatus(status: number): ApiError {
  if (status === 401) {
    return { code: 'UNAUTHENTICATED', message: 'Votre session a expiré. Reconnectez-vous.' };
  }
  if (status === 403) {
    return { code: 'FORBIDDEN', message: "Vous n'avez pas accès à cette action." };
  }
  if (status === 404) {
    return { code: 'NOT_FOUND', message: 'Cet élément est introuvable.' };
  }
  if (status === 413) {
    return { code: 'VALIDATION', message: 'Ce fichier est trop volumineux.', retryable: false };
  }
  if (status === 429) {
    return { code: 'RATE_LIMITED', message: 'Trop de demandes. Patientez un instant.', retryable: true };
  }
  if (status === 503) {
    return {
      code: 'PROVIDER_UNAVAILABLE',
      message: 'Ce service est momentanément indisponible.',
      retryable: true,
    };
  }
  if (status >= 500) {
    return {
      code: 'INTERNAL',
      message: 'Le serveur a rencontré un problème. Vos informations sont conservées.',
      retryable: true,
    };
  }
  return { code: 'INTERNAL', message: "Une erreur inattendue s'est produite.", retryable: false };
}

export interface ApiClientOptions {
  baseUrl: string;
  /** Délai maximal par requête, en millisecondes. */
  timeoutMs?: number;
  /** Renvoie le jeton courant (mobile) ; absent, les cookies sont utilisés. */
  getToken?: () => Promise<string | null> | string | null;
  /** Appelé lorsque le serveur répond 401 : permet de déconnecter proprement. */
  onUnauthenticated?: () => void;
  /** Invalidate display snapshots after a successful write. */
  onMutation?: () => void;
  fetchImpl?: typeof fetch;
  /** Convert native file URIs to actual Blobs supported by Expo's fetch. */
  readUploadFile?: (file: UploadFile) => Promise<Blob>;
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

  async function appendFile(form: FormData, field: string, file: UploadFile) {
    if (options.readUploadFile) {
      form.append(field, await options.readUploadFile(file), file.name);
    } else {
      // Compatibility for consumers using React Native's legacy transport.
      form.append(field, file as unknown as Blob);
    }
  }

  /**
   * Enveloppe chaque appel : délai maximal, et traduction des pannes réseau en
   * `DevisiaApiError` afin qu'aucun écran ne reçoive un `TypeError` brut.
   */
  async function send(
    url: string,
    init: RequestInit,
    delaiMax = timeoutMs,
    retry = true,
  ): Promise<Response> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), delaiMax);
    try {
      const response = await doFetch(url, { ...init, signal: controller.signal });
      if (retry && (init.method ?? 'GET') === 'GET' && [502, 503, 504].includes(response.status)) {
        clearTimeout(timer);
        await new Promise((resolve) => setTimeout(resolve, 300));
        return send(url, init, delaiMax, false);
      }
      return response;
    } catch (cause) {
      // Une erreur déjà normalisée (401 relayé par un appelant) ne doit pas
      // être repeinte en panne de transport.
      if (cause instanceof DevisiaApiError) throw cause;
      // A dropped connection can be retried for reads, never for writes:
      // replaying a quote creation or photo upload could create duplicates.
      if (retry && (init.method ?? 'GET') === 'GET' && !controller.signal.aborted) {
        clearTimeout(timer);
        await new Promise((resolve) => setTimeout(resolve, 300));
        return send(url, init, delaiMax, false);
      }
      throw transportError(cause, controller.signal.aborted);
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
      // Le serveur a répondu : son diagnostic prime toujours sur le nôtre. Ce
      // n'est que faute de corps exploitable — page d'erreur d'un proxy, 502
      // d'une passerelle — que l'on déduit un code du statut HTTP.
      const error: ApiError =
        payload && 'error' in payload ? payload.error : fromStatus(response.status);
      if (error.code === 'UNAUTHENTICATED') options.onUnauthenticated?.();
      throw new DevisiaApiError(error, response.status);
    }

    return payload.data;
  }

  async function request<T>(
    path: string,
    init: RequestInit & { json?: unknown; timeoutMs?: number } = {},
  ): Promise<T> {
    const { json, headers, timeoutMs: requestTimeout, ...rest } = init;
    const response = await send(`${base}${path}`, {
      ...rest,
      headers: {
        ...(json !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(await authHeaders()),
        ...(headers as Record<string, string> | undefined),
      },
      body: json !== undefined ? JSON.stringify(json) : rest.body,
      credentials: options.getToken ? 'omit' : 'include',
    }, requestTimeout);
    const data = await unwrap<T>(response);
    if ((rest.method ?? 'GET') !== 'GET') options.onMutation?.();
    return data;
  }

  async function upload<T>(
    path: string,
    form: FormData,
  ): Promise<T> {
    const response = await send(
      `${base}${path}`,
      {
        method: 'POST',
        // Surtout ne pas fixer `Content-Type` : la limite multipart est générée
        // par la plateforme, et l'écraser rend le corps illisible au serveur.
        headers: await authHeaders(),
        body: form,
        credentials: options.getToken ? 'omit' : 'include',
      },
      UPLOAD_TIMEOUT_MS,
    );
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
        billingProvider?: 'apple';
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
        request<{
          quote: QuoteDetailDTO;
          publicUrl: string;
          recipient: string;
          /** Faux quand aucun fournisseur d'email n'est configuré. */
          delivered: boolean;
          emailProvider: string;
        }>(
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
        request<GeneratedQuoteDTO>('/api/ai/quote', { method: 'POST', json: input, timeoutMs: AI_TIMEOUT_MS }),
      assistant: (question: string) =>
        request<{ answer: string; actions: { label: string; href?: string | null }[]; degraded: boolean }>(
          '/api/ai/assistant',
          { method: 'POST', json: { question } },
        ),
    },

    files: {
      upload: async (file: UploadFile, kind = 'PHOTO_CHANTIER') => {
        const form = new FormData();
        await appendFile(form, 'file', file);
        form.append('kind', kind);
        return upload<{ id: string; url: string; fileName: string }>('/api/files', form);
      },
      transcribe: async (file: UploadFile) => {
        const form = new FormData();
        await appendFile(form, 'audio', file);
        return upload<{ text: string }>('/api/ai/transcribe', form);
      },
    },

    priceBook: {
      list: (search?: string) =>
        request<PriceBookItemDTO[]>(
          `/api/pricebook${search ? `?q=${encodeURIComponent(search)}` : ''}`,
        ),
      create: (input: unknown) =>
        request<PriceBookItemDTO>('/api/pricebook', { method: 'POST', json: input }),
      update: (id: string, input: unknown) =>
        request<PriceBookItemDTO>(`/api/pricebook/${id}`, { method: 'PATCH', json: input }),
      remove: (id: string) =>
        request<{ deleted: boolean }>(`/api/pricebook/${id}`, { method: 'DELETE' }),
    },

    organisation: {
      profile: () => request<BusinessProfileDTO>('/api/organisation'),
      save: (input: Partial<BusinessProfileDTO>) =>
        request<BusinessProfileDTO>('/api/organisation', { method: 'PATCH', json: input }),
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
