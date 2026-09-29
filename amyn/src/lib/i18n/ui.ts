import type { Locale } from "./config.ts";

/**
 * Textes des composants qui s'exécutent dans le navigateur (en-tête,
 * sélecteur de langue, formulaire). Séparés du dictionnaire des pages pour
 * que le JavaScript envoyé au visiteur reste léger.
 */
const fr = {
  cta: {
    firstLook: "Recevoir un premier aperçu",
    services: "Voir les services",
    work: "Voir les réalisations",
  },
  nav: {
    services: "Services",
    work: "Réalisations",
    method: "Méthode",
    about: "À propos",
    firstLook: "Premier aperçu",
  },
  header: {
    homeAria: "AMYN — accueil",
    mainNav: "Navigation principale",
    openMenu: "Ouvrir le menu",
    closeMenu: "Fermer le menu",
    menu: "Menu",
    menuNav: "Menu principal",
  },
  language: {
    label: "Langue",
    current: "langue actuelle",
    switchTo: "Afficher le site en",
  },
  form: {
    steps: "Étapes du formulaire",
    step: "Étape",
    name: "Nom",
    company: "Entreprise",
    email: "E-mail professionnel",
    phone: "Téléphone",
    presence: "Votre site, Instagram ou fiche Google",
    presencePlaceholder: "monsite.fr, @moncompte…",
    services: "Les services qui vous intéressent",
    need: "Votre besoin principal, en une phrase",
    needPlaceholder: "Ex. recevoir des réservations sans décrocher le téléphone",
    timeline: "Échéance souhaitée",
    description: "Votre activité et votre projet",
    descriptionPlaceholder:
      "Ce que fait votre entreprise, ce qui ne fonctionne pas aujourd'hui, ce que vous imaginez…",
    back: "Retour",
    intro: "Deux minutes · Sans engagement",
    sending: "Envoi en cours…",
    submit: "Recevoir un premier aperçu",
    continue: "Continuer",
    privacyNoteBefore: "Vos informations servent uniquement à étudier et à répondre à votre demande. Elles sont conservées",
    privacyNoteLink: "En savoir plus",
    sentTitle: "Merci. Nous regardons d'abord votre activité.",
    sentBody: [
      "Avant de vous proposer quoi que ce soit, nous étudions ce que vous nous avez transmis.",
      "Si le projet s'y prête, nous revenons vers vous avec une première piste concrète. Sinon, nous vous le disons simplement. Vous n'êtes engagé à rien.",
    ],
    backHome: "Retour à l'accueil",
    optional: "(facultatif)",
    multiple: "(plusieurs choix possibles)",
    privacyBefore: "J'ai pris connaissance de la",
    privacyLink: "politique de confidentialité",
    honeypot: "Ne pas remplir",
    failed: "L'envoi a échoué. Réessayez dans un instant.",
    offline: "Connexion impossible. Vérifiez votre réseau, puis réessayez.",
    outreachTitle: "Vous arrivez depuis un message d'AMYN",
    outreachBody: "Bienvenue. Voici qui nous sommes — sans obligation.",
    outreachLink: "Pourquoi ce message ?",
  },
};

export type Ui = typeof fr;

const en: Ui = {
  cta: {
    firstLook: "Get a first look",
    services: "See our services",
    work: "See our work",
  },
  nav: {
    services: "Services",
    work: "Work",
    method: "Method",
    about: "About",
    firstLook: "First look",
  },
  header: {
    homeAria: "AMYN — home",
    mainNav: "Main navigation",
    openMenu: "Open menu",
    closeMenu: "Close menu",
    menu: "Menu",
    menuNav: "Main menu",
  },
  language: {
    label: "Language",
    current: "current language",
    switchTo: "View the site in",
  },
  form: {
    steps: "Form steps",
    step: "Step",
    name: "Name",
    company: "Company",
    email: "Work email",
    phone: "Phone",
    presence: "Your website, Instagram or Google profile",
    presencePlaceholder: "mywebsite.com, @myaccount…",
    services: "Services you're interested in",
    need: "Your main need, in one sentence",
    needPlaceholder: "E.g. take bookings without picking up the phone",
    timeline: "Preferred timeframe",
    description: "Your business and your project",
    descriptionPlaceholder:
      "What your business does, what isn't working today, what you have in mind…",
    back: "Back",
    intro: "Two minutes · No obligation",
    sending: "Sending…",
    submit: "Get a first look",
    continue: "Continue",
    privacyNoteBefore: "Your information is only used to review and reply to your request. It is kept for",
    privacyNoteLink: "Learn more",
    sentTitle: "Thank you. We'll look at your business first.",
    sentBody: [
      "Before suggesting anything, we review what you've sent us.",
      "If the project is a good fit, we'll come back to you with a first concrete direction. If not, we'll simply tell you. You're not committed to anything.",
    ],
    backHome: "Back to home",
    optional: "(optional)",
    multiple: "(choose as many as you like)",
    privacyBefore: "I have read the",
    privacyLink: "privacy policy",
    honeypot: "Do not fill in",
    failed: "Sending failed. Please try again in a moment.",
    offline: "Couldn't connect. Check your connection, then try again.",
    outreachTitle: "You've arrived from a message from AMYN",
    outreachBody: "Welcome. Here's who we are — no obligation.",
    outreachLink: "Why this message?",
  },
};

const ui: Record<Locale, Ui> = { fr, en };

export const getUi = (locale: Locale): Ui => ui[locale];
