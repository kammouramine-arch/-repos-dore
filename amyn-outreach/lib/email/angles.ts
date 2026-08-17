// ---------------------------------------------------------------------------
// ANGLES D'ACCROCHE PAR TYPE DE PROBLEME
//
// Chaque angle transforme un constat PROUVE en phrase utilisable dans un email.
// Aucun angle ne contient de chiffre, de promesse de resultat ni de superlatif.
//
// Ajouter un type de probleme = ajouter une entree ici.
// ---------------------------------------------------------------------------

import type { OfferKey } from "@/lib/constants";

export type Angle = {
  /** Sujet d'email, sans nom d'entreprise (ajoute ensuite). */
  subject: (ctx: AngleContext) => string;
  /** Description du constat, a la deuxieme personne, factuelle. */
  observation: (ctx: AngleContext) => string;
  /** Pourquoi cela compte, sans promettre de resultat chiffre. */
  consequence: (ctx: AngleContext) => string;
  /** Priorite d'utilisation : plus bas = accroche plus forte. */
  priority: number;
};

export type AngleContext = {
  company: string;
  city: string;
  sector: string;
  evidenceUrl?: string | null;
  offer: OfferKey | null;
};

export const ANGLES: Record<string, Angle> = {
  NO_WEBSITE: {
    priority: 1,
    subject: (c) => `${c.company} — visible sur Google, mais sans site`,
    observation: () =>
      "je n'ai trouvé aucun site à votre nom, seulement votre fiche Google",
    consequence: () =>
      "Quand quelqu'un vous cherche, il n'a rien à consulter avant de vous appeler : ni vos prestations, ni vos tarifs, ni vos horaires.",
  },
  SITE_UNREACHABLE: {
    priority: 1,
    subject: (c) => `${c.company} — votre site ne répond pas`,
    observation: () => "votre site ne répondait pas au moment où je l'ai consulté",
    consequence: () =>
      "Un visiteur qui tombe sur une page d'erreur ne revient généralement pas essayer plus tard.",
  },
  BROKEN_FORM: {
    priority: 2,
    subject: (c) => `${c.company} — votre formulaire de contact`,
    observation: () =>
      "le formulaire de contact de votre site envoie vers une adresse qui n'existe plus",
    consequence: () =>
      "Les messages remplis par vos visiteurs ne vous parviennent pas, et eux pensent vous avoir écrit.",
  },
  NOT_MOBILE_FRIENDLY: {
    priority: 2,
    subject: (c) => `${c.company} — affichage sur téléphone`,
    observation: () =>
      "votre site n'a pas de réglage d'affichage mobile : sur téléphone, il s'affiche en version bureau réduite",
    consequence: () =>
      "La plupart des recherches locales se font depuis un téléphone. Un texte qu'il faut zoomer pour lire décourage vite.",
  },
  NO_HTTPS: {
    priority: 2,
    subject: (c) => `${c.company} — mention « site non sécurisé »`,
    observation: () => "votre site est encore en HTTP, sans certificat de sécurité",
    consequence: () =>
      "Les navigateurs affichent « Non sécurisé » à côté de votre adresse, ce qui inquiète les visiteurs.",
  },
  OUTDATED_SITE: {
    priority: 3,
    subject: (c) => `${c.company} — votre site`,
    observation: () =>
      "votre site utilise des technologies qui ne sont plus maintenues depuis plusieurs années",
    consequence: () =>
      "Au-delà de l'aspect, cela pose des questions de sécurité et de compatibilité avec les navigateurs récents.",
  },
  NO_BOOKING: {
    priority: 3,
    subject: (c) => `${c.company} — prise de rendez-vous`,
    observation: () => "je n'ai pas trouvé de moyen de réserver en ligne chez vous",
    consequence: () =>
      "Vos clients doivent appeler pendant vos heures d'ouverture, souvent au moment où vous êtes occupé.",
  },
  NO_FORM: {
    priority: 4,
    subject: (c) => `${c.company} — vous contacter depuis votre site`,
    observation: () => "votre site ne propose aucun formulaire de contact",
    consequence: () =>
      "Un visiteur qui a une question en dehors de vos horaires n'a aucun moyen simple de vous la poser.",
  },
  NO_CLEAR_CTA: {
    priority: 3,
    subject: (c) => `${c.company} — votre page d'accueil`,
    observation: () =>
      "votre page d'accueil ne propose aucun moyen direct de vous joindre : ni numéro cliquable, ni formulaire, ni bouton de contact",
    consequence: () =>
      "Un visiteur intéressé doit chercher comment vous contacter, et beaucoup abandonnent à cette étape.",
  },
  NO_CLICK_TO_CALL: {
    priority: 5,
    subject: (c) => `${c.company} — vous appeler depuis un mobile`,
    observation: () =>
      "votre numéro est affiché en texte, sans lien cliquable",
    consequence: () =>
      "Sur téléphone, il faut le recopier à la main au lieu d'appuyer dessus pour appeler.",
  },
  BROKEN_LINKS: {
    priority: 4,
    subject: (c) => `${c.company} — liens cassés sur votre site`,
    observation: () => "plusieurs liens de votre site mènent vers des pages qui n'existent plus",
    consequence: () =>
      "Le visiteur tombe sur une erreur, et Google interprète cela comme un site mal entretenu.",
  },
  SLOW_SITE: {
    priority: 4,
    subject: (c) => `${c.company} — temps de chargement`,
    observation: () => "votre page d'accueil met un certain temps à répondre",
    consequence: () =>
      "L'attente au premier chargement est le moment où l'on perd le plus de visiteurs.",
  },
  NO_LOCAL_INFO: {
    priority: 5,
    subject: (c) => `${c.company} — visibilité à ${c.city}`,
    observation: () => "le nom de votre ville n'apparaît nulle part dans le contenu de votre site",
    consequence: (c) =>
      `Pour une recherche du type « ${c.sector.toLowerCase()} ${c.city} », Google a du mal à faire le lien avec vous.`,
  },
  MISSING_TITLE: {
    priority: 5,
    subject: (c) => `${c.company} — titre de votre site sur Google`,
    observation: () => "votre page d'accueil n'a pas de titre renseigné",
    consequence: () =>
      "C'est le texte bleu cliquable dans les résultats Google : sans lui, votre référencement démarre avec un handicap.",
  },
  MISSING_META_DESCRIPTION: {
    priority: 6,
    subject: (c) => `${c.company} — votre description sur Google`,
    observation: () => "aucune description n'est renseignée pour votre page d'accueil",
    consequence: () =>
      "Google compose alors lui-même le texte affiché sous votre titre, souvent avec un extrait mal choisi.",
  },
  NO_OPENING_HOURS: {
    priority: 6,
    subject: (c) => `${c.company} — vos horaires`,
    observation: () => "je n'ai pas trouvé vos horaires d'ouverture sur votre site",
    consequence: () =>
      "C'est l'une des premières informations recherchées avant de se déplacer.",
  },
  NO_LEGAL_NOTICE: {
    priority: 7,
    subject: (c) => `${c.company} — mentions légales`,
    observation: () => "je n'ai pas trouvé de page de mentions légales sur votre site",
    consequence: () =>
      "Elles sont obligatoires pour un site professionnel en France.",
  },
  HEAVY_PAGE: {
    priority: 6,
    subject: (c) => `${c.company} — poids de votre page`,
    observation: () => "votre page d'accueil est particulièrement lourde",
    consequence: () => "Sur une connexion mobile, cela allonge sensiblement l'attente.",
  },
  GBP_INCOMPLETE: {
    priority: 4,
    subject: (c) => `${c.company} — votre fiche Google`,
    observation: () => "votre fiche Google est incomplète",
    consequence: () =>
      "C'est souvent le premier contact avec un client : une fiche complète est mieux mise en avant.",
  },
};

export function getAngle(issueType: string): Angle | null {
  return ANGLES[issueType] ?? null;
}
