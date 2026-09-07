import * as React from 'react';
import { Alert, AppState, Platform } from 'react-native';
import { listenForApplePurchases } from './apple-purchases';
import { DevisiaApiError, type SessionDTO } from '@devisia/shared';
import { api, setUnauthenticatedHandler } from './api';
import { clearToken, readToken, writeToken, readSessionSnapshot, writeSessionSnapshot, persistPreferredLocale, readPreferredLocale } from './storage';
import { clearQueryCache } from './query-cache';
import { registerForPush, unregisterPush } from './push';
import { recordDiagnostic } from './diagnostics';
import { MobileLocaleProvider, deviceLocale, localizeText, mobileLocale, type MobileLocale } from './i18n';

/**
 * Contexte d'authentification mobile.
 *
 * Le jeton vit dans le trousseau sécurisé ; la session est revalidée à chaque
 * démarrage pour refléter immédiatement un changement d'abonnement ou de rôle.
 */
/** Famille de la panne qui empêche de revalider la session. */
export type Outage = 'network' | 'server';

interface AuthState {
  status: 'chargement' | 'connecte' | 'deconnecte';
  session: SessionDTO | null;
  error: string | null;
  /** Référence serveur de la dernière erreur d'authentification, à citer au support. */
  errorReference: string | null;
  /** Vrai lorsque la session n'a pas pu être revalidée (réseau ou serveur). */
  offline: boolean;
  /** Ce qui a empêché la revalidation : le réseau, ou le serveur lui-même. */
  outage: Outage | null;
  outageReference: string | null;
}

const IDLE = { error: null, errorReference: null, offline: false, outage: null, outageReference: null } as const;

/** Classe une panne : le serveur n'a pas répondu, ou il a répondu qu'il échouait. */
export function classifyOutage(error: unknown): { outage: Outage; reference: string | null } {
  if (error instanceof DevisiaApiError) {
    if (error.code === 'NETWORK' || error.code === 'TIMEOUT') return { outage: 'network', reference: null };
    return { outage: 'server', reference: error.requestId ?? null };
  }
  return { outage: 'network', reference: null };
}

/**
 * Revalide la session avec un second essai.
 *
 * Une coupure d'une seconde au démarrage — bascule Wi-Fi/4G, réveil du
 * serveur — ne doit pas aboutir à l'écran de panne. Un refus explicite (401)
 * n'est jamais réessayé ; une erreur serveur l'est une fois, après une courte
 * pause, puis remontée telle quelle.
 */
async function restoreSession(): Promise<SessionDTO> {
  try {
    return await api.request<SessionDTO>('/api/auth/session', { timeoutMs: 8_000 });
  } catch (cause) {
    const refused = cause instanceof DevisiaApiError && cause.status === 401;
    if (refused) throw cause;
    await new Promise((resolve) => setTimeout(resolve, 1_200));
    return api.request<SessionDTO>('/api/auth/session', { timeoutMs: 8_000 });
  }
}

interface AuthContextValue extends AuthState {
  signIn: (email: string, password: string) => Promise<SessionDTO>;
  signUp: (input: {
    email: string;
    password: string;
    companyName: string;
    firstName?: string;
    lastName?: string;
  }) => Promise<SessionDTO>;
  signOut: () => Promise<void>;
  /** Revalidate and return the fresh server session for immediate routing. */
  refresh: () => Promise<SessionDTO | null>;
  /** Adopt a server-returned session without another round trip. */
  adoptSession: (session: SessionDTO) => void;
}

const AuthContext = React.createContext<AuthContextValue | null>(null);

/**
 * Message d'authentification destiné à un artisan.
 *
 * Le message du serveur passait tel quel : un refus de validation s'affichait
 * « Les informations transmises sont incomplètes ou invalides », phrase écrite
 * pour un développeur, sous un champ qui n'était pas forcément le fautif. Les
 * erreurs de champ sont donc reformulées, et le reste reçoit une phrase qui dit
 * quoi faire.
 */
export function describeAuthError(error: unknown, locale: MobileLocale = 'fr'): string {
  if (!(error instanceof DevisiaApiError)) {
    return 'Connexion impossible. Vérifiez votre réseau, puis réessayez.';
  }
  switch (error.code) {
    case 'VALIDATION': {
      const champs = error.details ?? {};
      if (champs.email?.length) return 'Cette adresse email n’est pas valide.';
      if (champs.password?.length) {
        return champs.password.join(' ');
      }
      if (champs.companyName?.length) return 'Indiquez le nom de votre entreprise.';
      return 'Vérifiez votre adresse email et votre mot de passe.';
    }
    case 'UNAUTHENTICATED':
      return 'Adresse email ou mot de passe incorrect.';
    case 'CONFLICT':
      if (error.details?.pendingVerification?.length) {
        return locale === 'en'
          ? 'This account already exists, but its email is not verified. Check your inbox or request a new code.'
          : 'Ce compte existe déjà mais son adresse email n’est pas vérifiée. Vérifiez votre boîte mail ou renvoyez un code.';
      }
      return 'Un compte existe déjà avec cette adresse. Connectez-vous.';
    case 'RATE_LIMITED':
      return 'Trop de tentatives. Patientez quelques minutes avant de réessayer.';
    case 'PROVIDER_UNAVAILABLE':
      return 'La vérification email est momentanément indisponible. Réessayez dans un instant.';
    case 'INTERNAL':
      return 'Le service rencontre un problème temporaire. Vos informations sont conservées, réessayez dans un instant.';
    case 'NETWORK':
    case 'TIMEOUT':
      return error.message;
    default:
      return 'La connexion n’a pas abouti. Réessayez dans un instant.';
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const sessionGeneration = React.useRef(0);
  const restoring = React.useRef<Promise<void> | null>(null);
  const [preferredLocale, setPreferredLocale] = React.useState<MobileLocale>(deviceLocale);
  const [state, setState] = React.useState<AuthState>({
    status: 'chargement',
    session: null,
    ...IDLE,
  });
  const authLocale = state.session ? mobileLocale(state.session) : preferredLocale;

  React.useEffect(() => {
    void readPreferredLocale().then((stored) => { if (stored) setPreferredLocale(stored); });
  }, []);

  const rememberLocale = React.useCallback((session: SessionDTO) => {
    const locale = mobileLocale(session);
    setPreferredLocale(locale);
    void persistPreferredLocale(locale);
  }, []);

  const loadSession = React.useCallback(async () => {
    if (restoring.current) return restoring.current;
    const generation = sessionGeneration.current;
    const pending = (async () => {
    // `readToken` est asynchrone : aucun état n'est posé pendant le rendu.
    const token = await readToken();
    if (generation !== sessionGeneration.current) return;
    if (!token) {
      setState({ status: 'deconnecte', session: null, ...IDLE });
      return;
    }
    const cached = await readSessionSnapshot(token);
    if (generation !== sessionGeneration.current) return;
    if (cached) {
      rememberLocale(cached);
      setState((current) => current.status === 'chargement'
        ? { status: 'connecte', session: cached, ...IDLE }
        : current);
    }
    try {
      // Session restore should never hold the native launch screen for the
      // full request budget. Cached data remains usable while a slow job-site
      // connection is reported as offline and can be retried from the shell.
      const session = await restoreSession();
      if (generation !== sessionGeneration.current) return;
      rememberLocale(session);
      setState({ status: 'connecte', session, ...IDLE });
      await writeSessionSnapshot(token, session);
    } catch (cause) {
      if (generation !== sessionGeneration.current) return;
      // Une panne de réseau n'est pas une session invalide : sur un chantier
      // sans couverture, l'artisan doit retrouver son application, pas l'écran
      // de connexion. Le jeton n'est effacé que si le serveur l'a refusé.
      const refused = cause instanceof DevisiaApiError && cause.status === 401;
      if (!refused) {
        const { outage, reference } = classifyOutage(cause);
        recordDiagnostic({ area: 'startup', durationMs: 0, code: outage === 'network' ? 'SESSION_RESTORE_NETWORK' : 'SESSION_RESTORE_SERVER', category: outage, ...(reference ? { requestId: reference } : {}) });
        setState((current) => ({ ...current, status: current.session ? 'connecte' : 'chargement', offline: true, outage, outageReference: reference }));
        return;
      }
      await clearToken();
      setState({ status: 'deconnecte', session: null, ...IDLE });
    }
    })();
    restoring.current = pending;
    try { await pending; } catch {
      // Secure storage can fail before the network try/catch. Always leave
      // startup in a recoverable state instead of an unhandled rejection.
      if (generation === sessionGeneration.current) setState(current => ({ ...current, offline: true, outage: current.outage ?? 'network' }));
    } finally { if (restoring.current === pending) restoring.current = null; }
  }, [rememberLocale]);

  // A mutation (purchase/profile update) must not reuse a read started before it.
  // This deliberately bypasses the display snapshot: after email confirmation
  // the very next route decision must observe `emailVerifiedAt` from the
  // server, not the pre-confirmation cached session.
  const refreshSession = React.useCallback(async (): Promise<SessionDTO | null> => {
    if (restoring.current) await restoring.current;
    const generation = sessionGeneration.current;
    const token = await readToken();
    if (!token) return null;
    try {
      const session = await api.auth.me();
      if (generation !== sessionGeneration.current) return null;
      rememberLocale(session);
      setState({ status: 'connecte', session, ...IDLE });
      await writeSessionSnapshot(token, session);
      return session;
    } catch (error) {
      if (generation === sessionGeneration.current) {
        const refused = error instanceof DevisiaApiError && error.status === 401;
        if (refused) {
          await clearToken();
          setState({ status: 'deconnecte', session: null, ...IDLE });
        }
      }
      throw error;
    }
  }, [rememberLocale]);

  const adoptSession = React.useCallback((session: SessionDTO) => {
    sessionGeneration.current += 1;
    clearQueryCache();
    rememberLocale(session);
    setState({ status: 'connecte', session, ...IDLE });
    void readToken().then((token) => { if (token) return writeSessionSnapshot(token, session); }).catch(() => undefined);
  }, [rememberLocale]);

  React.useEffect(() => {
    // Rappel différé : déclenché par une réponse 401 de l'API, jamais au rendu.
    setUnauthenticatedHandler(() => {
      sessionGeneration.current += 1;
      clearQueryCache();
      setState({ status: 'deconnecte', session: null, ...IDLE });
    });
    // Restauration de session au démarrage : c'est précisément le rôle de cet
    // effet, et l'état n'est posé qu'après lecture du trousseau sécurisé.
    void loadSession();
    return () => setUnauthenticatedHandler(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // L'appareil ne s'enregistre pour les notifications qu'une fois connecté.
  React.useEffect(() => {
    if (state.status !== 'connecte' || !state.session?.user.emailVerified) return;
    void registerForPush();
  }, [state.status, state.session?.user.emailVerified]);

  React.useEffect(() => {
    if (state.status !== 'connecte' || !state.session?.user.emailVerified || Platform.OS !== 'ios' || state.session.organization.role !== 'OWNER') return;
    let disposed = false;
    let cleanup: (() => void) | undefined;
    void listenForApplePurchases(() => { void refreshSession(); }, (error) => {
      if (!disposed) {
        const english = authLocale === 'en';
        Alert.alert(
          english ? 'Subscription' : 'Abonnement',
          error instanceof Error
            ? localizeText(english ? 'en' : 'fr', error.message)
            : english
              ? 'Apple confirmation failed. Restore your purchases.'
              : 'La confirmation Apple n’a pas abouti. Restaurez vos achats.',
        );
      }
    }).then((stop) => { if (disposed) stop(); else cleanup = stop; }).catch(() => undefined);
    const foreground = AppState.addEventListener('change', (next) => { if (next === 'active') void loadSession(); });
    return () => { disposed = true; cleanup?.(); foreground.remove(); };
  }, [state.status, state.session?.user.emailVerified, state.session?.organization.id, state.session?.organization.role, authLocale, loadSession, refreshSession]);

  const handle = React.useCallback(async (action: () => Promise<{ token: string; session: SessionDTO }>): Promise<SessionDTO> => {
    setState((current) => ({ ...current, error: null, errorReference: null }));
    try {
      const result = await action();
      sessionGeneration.current += 1;
      clearQueryCache();
      await writeToken(result.token);
      await writeSessionSnapshot(result.token, result.session);
      rememberLocale(result.session);
      setState({ status: 'connecte', session: result.session, ...IDLE });
      return result.session;
    } catch (error) {
      setState((current) => ({
        ...current,
        error: describeAuthError(error, preferredLocale),
        errorReference: error instanceof DevisiaApiError ? error.requestId ?? null : null,
      }));
      throw error;
    }
  }, [rememberLocale, preferredLocale]);

  const value = React.useMemo<AuthContextValue>(
    () => ({
      ...state,
      signIn: (email, password) => handle(() => api.auth.signIn(email, password, 'DEVISERA mobile')),
      signUp: (input) => handle(() => api.auth.signUp({
        ...input,
        deviceName: 'DEVISERA mobile',
        verificationMethod: 'code',
        ...(Platform.OS === 'ios' ? { billingProvider: 'apple' as const } : {}),
        locale: preferredLocale,
      })),
      signOut: async () => {
        sessionGeneration.current += 1;
        clearQueryCache();
        // Leave the auth screens immediately. Network revocation is best
        // effort and must never make Back/change-email feel frozen on a poor
        // job-site connection.
        const token = await readToken();
        const revocation = api.auth.signOut(token ?? undefined).catch(() => undefined);
        void unregisterPush().catch(() => undefined);
        await clearToken();
        setState({ status: 'deconnecte', session: null, ...IDLE });
        void revocation;
      },
      refresh: refreshSession,
      adoptSession,
    }),
    [state, handle, preferredLocale, refreshSession, adoptSession],
  );

  return (
    <AuthContext.Provider value={value}>
      <MobileLocaleProvider locale={authLocale}>{children}</MobileLocaleProvider>
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const context = React.useContext(AuthContext);
  if (!context) throw new Error('useAuth doit être utilisé dans un AuthProvider.');
  return context;
}

/** Session garantie non nulle dans les écrans protégés. */
export function useSession(): SessionDTO {
  const { session } = useAuth();
  if (!session) throw new Error('Session absente dans un écran protégé.');
  return session;
}
