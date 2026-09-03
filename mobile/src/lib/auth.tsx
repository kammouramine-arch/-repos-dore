import * as React from 'react';
import { DevisiaApiError, type SessionDTO } from '@devisia/shared';
import { api, setUnauthenticatedHandler } from './api';
import { clearToken, readToken, writeToken } from './storage';
import { registerForPush, unregisterPush } from './push';

/**
 * Contexte d'authentification mobile.
 *
 * Le jeton vit dans le trousseau sécurisé ; la session est revalidée à chaque
 * démarrage pour refléter immédiatement un changement d'abonnement ou de rôle.
 */
interface AuthState {
  status: 'chargement' | 'connecte' | 'deconnecte';
  session: SessionDTO | null;
  error: string | null;
  /** Vrai lorsque la session n'a pas pu être revalidée faute de réseau. */
  offline: boolean;
}

interface AuthContextValue extends AuthState {
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (input: {
    email: string;
    password: string;
    companyName: string;
    firstName?: string;
    lastName?: string;
  }) => Promise<void>;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
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
export function describeAuthError(error: unknown): string {
  if (!(error instanceof DevisiaApiError)) {
    return 'Connexion impossible. Vérifiez votre réseau, puis réessayez.';
  }
  switch (error.code) {
    case 'VALIDATION': {
      const champs = error.details ?? {};
      if (champs.email?.length) return 'Cette adresse email n’est pas valide.';
      if (champs.password?.length) {
        return 'Le mot de passe doit contenir au moins 10 caractères.';
      }
      if (champs.companyName?.length) return 'Indiquez le nom de votre entreprise.';
      return 'Vérifiez votre adresse email et votre mot de passe.';
    }
    case 'UNAUTHENTICATED':
      return 'Adresse email ou mot de passe incorrect.';
    case 'CONFLICT':
      return 'Un compte existe déjà avec cette adresse. Connectez-vous.';
    case 'RATE_LIMITED':
      return 'Trop de tentatives. Patientez quelques minutes avant de réessayer.';
    case 'NETWORK':
    case 'TIMEOUT':
      return error.message;
    default:
      return 'La connexion n’a pas abouti. Réessayez dans un instant.';
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = React.useState<AuthState>({
    status: 'chargement',
    session: null,
    error: null,
    offline: false,
  });

  const loadSession = React.useCallback(async () => {
    // `readToken` est asynchrone : aucun état n'est posé pendant le rendu.
    const token = await readToken();
    if (!token) {
      setState({ status: 'deconnecte', session: null, error: null, offline: false });
      return;
    }
    try {
      const session = await api.auth.me();
      setState({ status: 'connecte', session, error: null, offline: false });
    } catch (cause) {
      // Une panne de réseau n'est pas une session invalide : sur un chantier
      // sans couverture, l'artisan doit retrouver son application, pas l'écran
      // de connexion. Le jeton n'est effacé que si le serveur l'a refusé.
      const refused = cause instanceof DevisiaApiError && cause.status === 401;
      if (!refused) {
        setState((current) => ({ ...current, status: 'chargement', offline: true }));
        return;
      }
      await clearToken();
      setState({ status: 'deconnecte', session: null, error: null, offline: false });
    }
  }, []);

  React.useEffect(() => {
    // Rappel différé : déclenché par une réponse 401 de l'API, jamais au rendu.
    setUnauthenticatedHandler(() => {
      setState({ status: 'deconnecte', session: null, error: null, offline: false });
    });
    // Restauration de session au démarrage : c'est précisément le rôle de cet
    // effet, et l'état n'est posé qu'après lecture du trousseau sécurisé.
    void loadSession();
    return () => setUnauthenticatedHandler(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // L'appareil ne s'enregistre pour les notifications qu'une fois connecté.
  React.useEffect(() => {
    if (state.status !== 'connecte') return;
    void registerForPush();
  }, [state.status]);

  const handle = React.useCallback(async (action: () => Promise<{ token: string; session: SessionDTO }>) => {
    setState((current) => ({ ...current, error: null }));
    try {
      const result = await action();
      await writeToken(result.token);
      setState({ status: 'connecte', session: result.session, error: null, offline: false });
    } catch (error) {
      setState((current) => ({ ...current, error: describeAuthError(error) }));
      throw error;
    }
  }, []);

  const value = React.useMemo<AuthContextValue>(
    () => ({
      ...state,
      signIn: (email, password) => handle(() => api.auth.signIn(email, password, 'DEVISIA mobile')),
      signUp: (input) => handle(() => api.auth.signUp({ ...input, deviceName: 'DEVISIA mobile' })),
      signOut: async () => {
        await unregisterPush().catch(() => undefined);
        await api.auth.signOut().catch(() => undefined);
        await clearToken();
        setState({ status: 'deconnecte', session: null, error: null, offline: false });
      },
      refresh: loadSession,
    }),
    [state, handle, loadSession],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
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
