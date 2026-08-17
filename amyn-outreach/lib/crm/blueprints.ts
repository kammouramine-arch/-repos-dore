// ---------------------------------------------------------------------------
// PLANS DE PRODUCTION PAR OFFRE
//
// Chaque offre determine :
//   • les taches a realiser
//   • les informations a demander au client
//
// Regle : on ne demande QUE ce dont l'offre a besoin. Un client Essential ne
// doit pas repondre a 40 questions dont 30 ne le concernent pas.
//
// Ajouter une offre ou une tache = editer ce fichier, rien d'autre.
// ---------------------------------------------------------------------------

export type TaskBlueprint = {
  title: string;
  description?: string;
  category: string;
  phase: string;
  requiresApproval?: boolean;
  waitingOnClient?: boolean;
};

export type OnboardingBlueprint = {
  key: string;
  label: string;
  hint?: string;
  inputType: "TEXT" | "LONGTEXT" | "FILE" | "URL" | "LIST" | "COLOR";
  category: string;
  required: boolean;
};

// --- Informations demandees ------------------------------------------------

const BASE_ONBOARDING: OnboardingBlueprint[] = [
  { key: "company_name", label: "Nom exact de l'entreprise", inputType: "TEXT", category: "Identité", required: true },
  { key: "activity", label: "Activité en une phrase", inputType: "TEXT", category: "Identité", required: true },
  { key: "address", label: "Adresse complète", inputType: "TEXT", category: "Identité", required: true },
  { key: "phone", label: "Téléphone à afficher", inputType: "TEXT", category: "Contact", required: true },
  { key: "email", label: "Email de contact à afficher", inputType: "TEXT", category: "Contact", required: true },
  { key: "opening_hours", label: "Horaires d'ouverture", inputType: "LONGTEXT", category: "Contact", required: true },
  { key: "services", label: "Prestations à présenter", hint: "Une par ligne", inputType: "LIST", category: "Contenu", required: true },
  { key: "logo", label: "Logo", hint: "PNG ou SVG, fond transparent si possible", inputType: "FILE", category: "Identité visuelle", required: true },
  { key: "photos", label: "Photos", hint: "5 à 15 photos de bonne qualité", inputType: "FILE", category: "Identité visuelle", required: true },
  { key: "domain", label: "Nom de domaine souhaité", hint: "Existant ou à réserver", inputType: "TEXT", category: "Technique", required: true },
];

const CONVERSION_ONBOARDING: OnboardingBlueprint[] = [
  { key: "colors", label: "Couleurs de la marque", hint: "Codes hexadécimaux si connus", inputType: "COLOR", category: "Identité visuelle", required: false },
  { key: "pricing", label: "Tarifs à afficher", hint: "Laisser vide si vous préférez ne pas les afficher", inputType: "LONGTEXT", category: "Contenu", required: false },
  { key: "social_links", label: "Liens réseaux sociaux", inputType: "LIST", category: "Contact", required: false },
  { key: "booking_tool", label: "Outil de réservation utilisé", hint: "Planity, Treatwell, aucun...", inputType: "TEXT", category: "Réservation", required: true },
  { key: "google_business", label: "Accès à la fiche Google Business", hint: "Nécessaire pour l'optimiser", inputType: "URL", category: "Google", required: true },
  { key: "service_areas", label: "Zones desservies", inputType: "LIST", category: "SEO local", required: true },
];

const ADVANCED_ONBOARDING: OnboardingBlueprint[] = [
  { key: "objectives", label: "Objectifs principaux", hint: "Plus d'appels ? De réservations ? De devis ?", inputType: "LONGTEXT", category: "Stratégie", required: true },
  { key: "target_customers", label: "Clientèle visée", inputType: "LONGTEXT", category: "Stratégie", required: true },
  { key: "competitors", label: "Concurrents identifiés", inputType: "LIST", category: "Stratégie", required: false },
  { key: "existing_texts", label: "Textes existants à réutiliser", inputType: "LONGTEXT", category: "Contenu", required: false },
  { key: "hosting", label: "Hébergement actuel", hint: "Si un site existe déjà", inputType: "TEXT", category: "Technique", required: false },
  { key: "automations", label: "Automatisations souhaitées", hint: "Relance de devis, confirmation de RDV...", inputType: "LONGTEXT", category: "Automatisation", required: true },
];

// --- Taches ----------------------------------------------------------------

const BASE_TASKS: TaskBlueprint[] = [
  { title: "Réunir les informations d'onboarding", category: "SETUP", phase: "ONBOARDING", waitingOnClient: true },
  { title: "Réserver ou rattacher le nom de domaine", category: "SETUP", phase: "ONBOARDING" },
  { title: "Rédiger les textes des pages", category: "CONTENT", phase: "CONTENT" },
  { title: "Intégrer le logo et les photos", category: "DESIGN", phase: "CONTENT" },
  { title: "Construire les pages du site", category: "DEV", phase: "PRODUCTION" },
  { title: "Rendre le site responsive", category: "DEV", phase: "PRODUCTION" },
  { title: "Brancher le formulaire de contact", category: "DEV", phase: "PRODUCTION" },
  { title: "Ajouter appel direct et WhatsApp", category: "DEV", phase: "PRODUCTION" },
  { title: "Intégrer la carte Google Maps", category: "DEV", phase: "PRODUCTION" },
  { title: "Relire et corriger le contenu", category: "QA", phase: "QA" },
  { title: "Tester sur mobile, tablette et ordinateur", category: "QA", phase: "QA" },
  { title: "Vérifier que le formulaire arrive bien", category: "QA", phase: "QA" },
  { title: "Mettre le site en ligne", category: "DELIVERY", phase: "DELIVERY", requiresApproval: true },
  { title: "Transmettre les accès au client", category: "DELIVERY", phase: "DELIVERY" },
];

const PREMIUM_TASKS: TaskBlueprint[] = [
  { title: "Mettre en place la réservation en ligne", category: "BOOKING", phase: "PRODUCTION" },
  { title: "Optimiser la fiche Google Business", category: "SEO", phase: "PRODUCTION" },
  { title: "Configurer le SEO local de base", description: "Titres, descriptions, ville, données structurées", category: "SEO", phase: "PRODUCTION" },
  { title: "Mettre en place une automatisation simple", category: "AUTOMATION", phase: "PRODUCTION" },
  { title: "Installer Analytics", category: "DEV", phase: "PRODUCTION" },
  { title: "Créer la galerie ou le portfolio", category: "DESIGN", phase: "PRODUCTION" },
];

const ULTIMATE_TASKS: TaskBlueprint[] = [
  { title: "SEO local renforcé", description: "Pages par zone desservie, maillage interne", category: "SEO", phase: "PRODUCTION" },
  { title: "Mettre en place les automatisations avancées", category: "AUTOMATION", phase: "PRODUCTION" },
  { title: "Installer le suivi des prospects", category: "AUTOMATION", phase: "PRODUCTION" },
  { title: "Configurer la réservation avancée", category: "BOOKING", phase: "PRODUCTION" },
  { title: "Créer les landing pages", category: "DEV", phase: "PRODUCTION" },
  { title: "Mettre en place le tableau de suivi", category: "AUTOMATION", phase: "PRODUCTION" },
  { title: "Configurer la maintenance", category: "CARE", phase: "DELIVERY" },
  { title: "Mettre en place le support prioritaire", category: "CARE", phase: "DELIVERY" },
];

export function tasksForOffer(offer: string): TaskBlueprint[] {
  switch (offer) {
    case "ULTIMATE":
      return [...BASE_TASKS.slice(0, -2), ...PREMIUM_TASKS, ...ULTIMATE_TASKS, ...BASE_TASKS.slice(-2)];
    case "PREMIUM":
      return [...BASE_TASKS.slice(0, -2), ...PREMIUM_TASKS, ...BASE_TASKS.slice(-2)];
    default:
      return BASE_TASKS;
  }
}

export function onboardingForOffer(offer: string): OnboardingBlueprint[] {
  switch (offer) {
    case "ULTIMATE":
      return [...BASE_ONBOARDING, ...CONVERSION_ONBOARDING, ...ADVANCED_ONBOARDING];
    case "PREMIUM":
      return [...BASE_ONBOARDING, ...CONVERSION_ONBOARDING];
    default:
      return BASE_ONBOARDING;
  }
}
