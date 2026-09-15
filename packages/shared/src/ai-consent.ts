/**
 * Consentement explicite avant tout envoi de données à un fournisseur d'IA tiers.
 *
 * Apple (Guidelines 5.1.1 (i) et 5.1.2 (i)) exige que l'utilisateur sache,
 * avant le premier envoi, quelles données partent, vers quelle société et
 * pourquoi, et qu'il l'accepte lui-même. Ce module est la seule source de
 * vérité du texte présenté et de sa version : le serveur, l'application iOS
 * et le web l'affichent tel quel, et enregistrent la version acceptée.
 *
 * Toute modification du texte, du fournisseur ou des données transmises doit
 * incrémenter `AI_CONSENT_VERSION` : l'autorisation précédente ne vaut alors
 * plus et l'application redemande.
 */

export type AiProviderKind = 'gemini' | 'anthropic' | 'local';
export type AiConsentStatus = 'GRANTED' | 'DECLINED' | 'REVOKED';

/** Version du texte de consentement. À incrémenter à chaque changement de fond. */
export const AI_CONSENT_VERSION = 1;

export interface AiConsentDTO {
  /** Dernière décision enregistrée ; `null` tant que l'utilisateur n'a rien décidé. */
  status: AiConsentStatus | null;
  /** Version du texte sur laquelle porte la décision. */
  version: number | null;
  /** Fournisseur nommé dans le texte accepté. */
  provider: AiProviderKind | null;
  /** Horodatage ISO de la décision. */
  decidedAt: string | null;
}

export const NO_AI_CONSENT: AiConsentDTO = { status: null, version: null, provider: null, decidedAt: null };

/** Société et service réellement destinataires, tels que nommés à l'utilisateur. */
export const AI_PROVIDER_NAMES: Record<AiProviderKind, { fr: string; en: string }> = {
  gemini: { fr: 'Google (service Gemini API)', en: 'Google (Gemini API service)' },
  anthropic: { fr: 'Anthropic (service Claude API)', en: 'Anthropic (Claude API service)' },
  local: { fr: 'aucun fournisseur externe', en: 'no external provider' },
};

/** Le moteur local ne transmet rien à un tiers : aucun consentement à demander. */
export function aiConsentRequired(provider: AiProviderKind | null | undefined): boolean {
  return provider != null && provider !== 'local';
}

/**
 * Vrai seulement si l'utilisateur a accepté le texte courant pour le
 * fournisseur courant. Un refus, un retrait, un texte plus ancien ou un
 * changement de fournisseur redemandent l'autorisation.
 */
export function aiConsentGranted(
  consent: AiConsentDTO | null | undefined,
  provider: AiProviderKind | null | undefined,
): boolean {
  if (!aiConsentRequired(provider)) return true;
  return (
    consent != null &&
    consent.status === 'GRANTED' &&
    consent.version === AI_CONSENT_VERSION &&
    consent.provider === provider
  );
}

export interface AiConsentCopy {
  kicker: string;
  title: string;
  intro: string;
  /** Données transmises, une ligne par catégorie. */
  sent: string[];
  purpose: string;
  withdraw: string;
  allow: string;
  decline: string;
  /** Explication affichée quand l'utilisateur a refusé et tente une action IA. */
  declined: string;
  /** Libellés d'état pour Mon espace / Paramètres. */
  stateGranted: string;
  stateNotGranted: string;
}

/** Texte de consentement, identique sur iOS et sur le web. */
export function aiConsentCopy(provider: AiProviderKind, locale: 'fr' | 'en' = 'fr'): AiConsentCopy {
  const name = AI_PROVIDER_NAMES[provider][locale];
  if (locale === 'en') {
    return {
      kicker: 'Artificial intelligence',
      title: 'Use of artificial intelligence',
      intro: `To prepare your quote, DEVISERA may send the information you provide to ${name}: the job description you type or dictate and, if you add them, the photos of the job site.`,
      sent: [
        'The job description (typed, or dictated on your device) and any photos you attach.',
        'Your trade, hourly rate, tax rate, usual terms and an extract of your price book, so the quote matches your business.',
        'For a follow-up message: the client name, quote number, subject, amount and any reply they left.',
      ],
      purpose: 'This data is used only to process your request and generate the quote or message. It is never used to train models, and one business’s data is never used for another.',
      withdraw: 'You can withdraw this permission at any time in My space → Privacy & AI. DEVISERA then stops sending data to the provider.',
      allow: 'Allow and continue',
      decline: 'Not now',
      declined: 'AI-assisted preparation needs your permission. Nothing was sent. You can allow it from My space → Privacy & AI, or whenever you next use this feature.',
      stateGranted: 'Allowed',
      stateNotGranted: 'Not allowed',
    };
  }
  return {
    kicker: 'Intelligence artificielle',
    title: 'Utilisation de l’intelligence artificielle',
    intro: `Pour préparer votre devis, DEVISERA peut transmettre à ${name} les informations que vous fournissez : la description du chantier que vous saisissez ou dictez et, si vous les ajoutez, les photos du chantier.`,
    sent: [
      'La description du chantier (saisie, ou dictée sur votre appareil) et les photos que vous joignez.',
      'Votre métier, votre taux horaire, votre taux de TVA, vos conditions habituelles et un extrait de votre catalogue de prix, pour adapter le devis à votre entreprise.',
      'Pour une relance : le nom du client, le numéro, l’objet et le montant du devis, ainsi que sa réponse éventuelle.',
    ],
    purpose: 'Ces données sont utilisées uniquement pour traiter votre demande et générer le devis ou le message. Elles ne servent jamais à entraîner des modèles, et les données d’une entreprise ne sont jamais utilisées pour une autre.',
    withdraw: 'Vous pouvez retirer cette autorisation à tout moment dans Mon espace → Confidentialité et IA. DEVISERA cesse alors tout envoi au fournisseur.',
    allow: 'Autoriser et continuer',
    decline: 'Pas maintenant',
    declined: 'La préparation assistée par IA nécessite votre autorisation. Rien n’a été envoyé. Vous pouvez l’accorder depuis Mon espace → Confidentialité et IA, ou à la prochaine utilisation de cette fonction.',
    stateGranted: 'Autorisée',
    stateNotGranted: 'Non autorisée',
  };
}
