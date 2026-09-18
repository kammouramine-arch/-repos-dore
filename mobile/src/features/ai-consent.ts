import {
  AI_CONSENT_VERSION,
  NO_AI_CONSENT,
  aiConsentCopy,
  aiConsentGranted,
  aiConsentRequired,
  type AiConsentDTO,
  type AiProviderKind,
  type SessionDTO,
} from '@devisia/shared';

/**
 * État du consentement IA tel que l'application le lit dans la session.
 *
 * La décision vit sur le serveur, par personne et par entreprise ; la session
 * la rapporte à chaque connexion. Ici, aucune décision implicite : tant que
 * `granted` est faux, aucune requête ne doit partir vers l'API d'IA.
 */
export interface AiConsentState {
  /** Faux quand le serveur tourne sur le moteur local : rien ne quitte DEVISERA. */
  required: boolean;
  granted: boolean;
  provider: AiProviderKind;
  consent: AiConsentDTO;
  /** Version du texte que l'utilisateur doit accepter. */
  version: number;
}

export function aiConsentState(session: Pick<SessionDTO, 'capabilities' | 'aiConsent'> | null | undefined): AiConsentState {
  const provider = session?.capabilities?.provider ?? 'gemini';
  const consent = session?.aiConsent ?? NO_AI_CONSENT;
  return {
    required: aiConsentRequired(provider),
    granted: aiConsentGranted(consent, provider),
    provider,
    consent,
    version: AI_CONSENT_VERSION,
  };
}

/** Texte présenté dans la feuille et dans « Confidentialité et IA ». */
export function aiConsentText(state: Pick<AiConsentState, 'provider'>, locale: 'fr' | 'en') {
  return aiConsentCopy(state.provider === 'local' ? 'gemini' : state.provider, locale);
}

/**
 * Exécute une action IA seulement après autorisation.
 *
 * `ensure` ouvre la feuille si nécessaire et résout vrai uniquement sur
 * « Autoriser et continuer ». Sur refus, `run` n'est jamais appelé : c'est la
 * garantie testée « aucune requête avant consentement ».
 */
export async function withAiConsent<T>(
  ensure: () => Promise<boolean>,
  run: () => Promise<T>,
): Promise<{ allowed: true; result: T } | { allowed: false }> {
  const allowed = await ensure();
  if (!allowed) return { allowed: false };
  return { allowed: true, result: await run() };
}
