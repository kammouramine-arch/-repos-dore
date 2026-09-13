import * as React from 'react';
import { DevisiaApiError, type AiConsentDTO, type AiConsentStatus } from '@devisia/shared';
import { AiConsentSheet } from '@/components/ai-consent-sheet';
import { aiConsentState, aiConsentText, type AiConsentState } from '@/features/ai-consent';
import { api } from './api';
import { useAuth } from './auth';
import { mobileLocale } from './i18n';

/**
 * Garde unique devant toute requête vers l'API d'IA.
 *
 * `ensure()` répond vrai seulement si l'autorisation est déjà enregistrée ou
 * si l'utilisateur vient de presser « Autoriser et continuer ». Dans tous les
 * autres cas (refus, fermeture, erreur réseau à l'enregistrement), elle répond
 * faux et l'appelant ne lance pas la requête. La décision est enregistrée sur
 * le serveur, puis reflétée dans la session locale : elle survit à la
 * déconnexion et vaut pour ce compte dans cette entreprise.
 */
export interface AiConsentContextValue {
  state: AiConsentState;
  ensure: () => Promise<boolean>;
  /** Retire l'autorisation : les prochaines actions IA redemanderont. */
  revoke: () => Promise<void>;
  /** Marque localement l'autorisation comme manquante (réponse serveur AI_CONSENT_REQUIRED). */
  markRequired: () => void;
}

const AiConsentContext = React.createContext<AiConsentContextValue | null>(null);

export function AiConsentProvider({ children }: { children: React.ReactNode }) {
  const { session, adoptSession } = useAuth();
  // La session est la seule source : chaque décision y est adoptée après
  // enregistrement, et une nouvelle session (autre compte) repart du serveur.
  const state = React.useMemo(() => aiConsentState(session), [session]);
  const locale = mobileLocale(session);
  const en = locale === 'en';
  const copy = React.useMemo(() => aiConsentText(state, locale), [state, locale]);

  const [visible, setVisible] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const pending = React.useRef<((allowed: boolean) => void) | null>(null);

  const remember = React.useCallback((consent: AiConsentDTO) => {
    if (session) adoptSession({ ...session, aiConsent: consent });
  }, [adoptSession, session]);

  const record = React.useCallback(async (status: AiConsentStatus) => {
    const consent = await api.ai.setConsent(status, state.version);
    remember(consent);
    return consent;
  }, [remember, state.version]);

  const settle = React.useCallback((allowed: boolean) => {
    const resolve = pending.current;
    pending.current = null;
    setVisible(false);
    setBusy(false);
    setError(null);
    resolve?.(allowed);
  }, []);

  const ensure = React.useCallback((): Promise<boolean> => {
    if (!session) return Promise.resolve(false);
    if (state.granted) return Promise.resolve(true);
    if (pending.current) return Promise.resolve(false);
    return new Promise<boolean>((resolve) => {
      pending.current = resolve;
      setError(null);
      setVisible(true);
    });
  }, [session, state.granted]);

  const allow = React.useCallback(async () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await record('GRANTED');
      settle(true);
    } catch (cause) {
      setBusy(false);
      setError(
        cause instanceof DevisiaApiError
          ? cause.message
          : (en ? 'Your permission could not be saved. Check your connection and try again.' : 'Votre autorisation n’a pas pu être enregistrée. Vérifiez la connexion et réessayez.'),
      );
    }
  }, [busy, en, record, settle]);

  const decline = React.useCallback(() => {
    if (busy) return;
    // Le refus est enregistré au mieux ; qu'il soit enregistré ou non, rien ne part.
    void record('DECLINED').catch(() => undefined);
    settle(false);
  }, [busy, record, settle]);

  const revoke = React.useCallback(async () => {
    await record('REVOKED');
  }, [record]);

  const markRequired = React.useCallback(() => {
    if (!session) return;
    remember({ ...(session.aiConsent ?? { status: null, version: null, provider: null, decidedAt: null }), status: 'REVOKED' });
  }, [remember, session]);

  const value = React.useMemo<AiConsentContextValue>(() => ({ state, ensure, revoke, markRequired }), [state, ensure, revoke, markRequired]);

  return (
    <AiConsentContext.Provider value={value}>
      {children}
      <AiConsentSheet visible={visible} copy={copy} busy={busy} error={error} en={en} onAllow={() => void allow()} onDecline={decline} />
    </AiConsentContext.Provider>
  );
}

export function useAiConsent(): AiConsentContextValue {
  const value = React.useContext(AiConsentContext);
  if (!value) throw new Error('useAiConsent doit être utilisé sous AiConsentProvider.');
  return value;
}

/** Vrai quand le serveur a refusé une action IA faute d'autorisation. */
export function isAiConsentError(error: unknown): boolean {
  return error instanceof DevisiaApiError && error.code === 'AI_CONSENT_REQUIRED';
}
