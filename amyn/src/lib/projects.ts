import type { VisualKey } from "./services";

/**
 * Réalisations.
 *
 * HONNÊTETÉ — chaque projet déclare sa nature, et elle est affichée partout
 * où le projet apparaît :
 *   - `client`        : travail réel pour un client, publié avec son accord ;
 *   - `concept`       : proposition créée par AMYN pour montrer une direction ;
 *   - `demonstration` : interface ou parcours construit pour être montré ;
 *   - `exploratory`   : recherche interne.
 *
 * Aujourd'hui, tous les projets sont des CONCEPTS : les marques sont
 * fictives, aucun client réel n'est représenté, aucun résultat n'est cité.
 * Un résultat chiffré ne peut apparaître que sur un projet `client`, et
 * seulement s'il est vérifié.
 *
 * POUR AJOUTER UN PROJET : ajoutez un objet à `projects`. La page
 * Réalisations, la page de détail, l'accueil et le plan du site suivent.
 */

export type ProjectKind = "client" | "concept" | "demonstration" | "exploratory";

export const KIND_LABEL: Record<ProjectKind, string> = {
  client: "Projet client",
  concept: "Concept",
  demonstration: "Démonstration",
  exploratory: "Projet exploratoire",
};

/** Composition du bloc principal, sous la navigation du site présenté. */
export type HeroLayout = "overlay" | "split" | "centered";
/** Composition du bloc de contenu, sous le hero. */
export type BlockLayout = "list" | "cards" | "grid" | "gallery";

export type Project = {
  slug: string;
  kind: ProjectKind;
  sector: string;
  brand: string;
  domain: string;

  /* --- L'étude de cas ---------------------------------------------------- */
  summary: string;
  context: string;
  problem: string;
  direction: string;
  features: string[];
  /** Services AMYN mobilisés (slugs de `services.ts`). */
  services: string[];
  /** Second écran présenté à côté du site. */
  companion: VisualKey;

  /* --- Le site présenté (rendu par ConceptSite) ------------------------- */
  palette: {
    bg: string;
    surface: string;
    ink: string;
    muted: string;
    line: string;
    accent: string;
    onAccent: string;
  };
  typography: "serif" | "sans";
  wordmark: "wide" | "tight";
  hero: HeroLayout;
  block: BlockLayout;
  nav: string[];
  eyebrow: string;
  title: string[];
  tagline: string;
  primaryCta: string;
  secondaryCta: string;
  blockTitle: string;
  entries: { name: string; detail: string }[];
  /** Trois teintes qui composent les visuels du site. */
  art: [string, string, string];
};

export const projects: Project[] = [
  {
    slug: "maison-elan",
    kind: "concept",
    sector: "Restaurant",
    brand: "Maison Élan",
    domain: "maison-elan.fr",
    summary: "Un restaurant de saison qui veut remplir ses tables du soir sans passer le service au téléphone.",
    context:
      "Restaurant de quartier, cuisine courte et changeante, une vingtaine de couverts. La carte évolue chaque semaine et la clientèle réserve surtout le soir même.",
    problem:
      "La carte en ligne n'est jamais à jour, les réservations arrivent par téléphone pendant le service, et la fiche d'établissement affiche des horaires contradictoires.",
    direction:
      "Une page d'accueil sombre et chaleureuse, construite autour de la carte du moment. La réservation est accessible depuis chaque écran, et les informations pratiques sont alignées avec la fiche d'établissement.",
    features: ["Carte actualisable", "Réservation en ligne", "Horaires et accès", "Galerie"],
    services: ["site-web", "reservation-en-ligne", "google-business"],
    companion: "booking",
    palette: {
      bg: "#14110F",
      surface: "#1C1815",
      ink: "#F3EBE0",
      muted: "#A79A8B",
      line: "#332C26",
      accent: "#C2703F",
      onAccent: "#14110F",
    },
    typography: "serif",
    wordmark: "wide",
    hero: "overlay",
    block: "list",
    nav: ["La maison", "La carte", "Galerie", "Réserver"],
    eyebrow: "Cuisine de saison",
    title: ["Une table", "au cœur du marché."],
    tagline: "Une cuisine courte, dictée par les producteurs. Service du mardi au dimanche.",
    primaryCta: "Réserver une table",
    secondaryCta: "Voir la carte",
    blockTitle: "La carte du moment",
    entries: [
      { name: "Menu déjeuner", detail: "3 services" },
      { name: "Menu du marché", detail: "5 services" },
      { name: "Accord mets & vins", detail: "sur demande" },
    ],
    art: ["#3A2A20", "#7A4A2C", "#C2703F"],
  },
  {
    slug: "institut-lys",
    kind: "concept",
    sector: "Institut de beauté",
    brand: "Institut Lys",
    domain: "institut-lys.fr",
    summary: "Un institut qui veut que ses clientes réservent et retrouvent leurs rendez-vous sans l'appeler.",
    context:
      "Institut de soins, trois cabines, une clientèle fidèle qui revient toutes les quatre à six semaines.",
    problem:
      "Les rendez-vous se prennent par message à toute heure, les oublis sont fréquents et les soins ne sont présentés nulle part avec leur durée.",
    direction:
      "Un site lumineux et calme, où chaque soin a sa durée et sa description. Une application cliente pour réserver, retrouver ses rendez-vous et recevoir un rappel.",
    features: ["Soins détaillés", "Réservation par soin", "Espace cliente", "Rappels de rendez-vous"],
    services: ["site-web", "reservation-en-ligne", "application-mobile"],
    companion: "app",
    palette: {
      bg: "#FAF7F5",
      surface: "#F1EBE7",
      ink: "#1E1A19",
      muted: "#736A66",
      line: "#E4DAD4",
      accent: "#9B6A78",
      onAccent: "#FFFFFF",
    },
    typography: "serif",
    wordmark: "tight",
    hero: "centered",
    block: "list",
    nav: ["Les soins", "L'institut", "Carte cadeau", "Réserver"],
    eyebrow: "Institut de soins",
    title: ["Prendre le temps,", "en de bonnes mains."],
    tagline: "Soins du visage et du corps, dans un lieu pensé pour ralentir. Sur rendez-vous.",
    primaryCta: "Réserver un soin",
    secondaryCta: "Découvrir les soins",
    blockTitle: "Les soins",
    entries: [
      { name: "Soin éclat du visage", detail: "60 min" },
      { name: "Modelage relaxant", detail: "45 min" },
      { name: "Rituel complet", detail: "90 min" },
    ],
    art: ["#E4D5D8", "#C39BA6", "#9B6A78"],
  },
  {
    slug: "barberie-aubin",
    kind: "concept",
    sector: "Barbier",
    brand: "Barberie Aubin",
    domain: "barberie-aubin.fr",
    summary: "Un barbier de quartier qui veut des rendez-vous pris en ligne et une fiche d'établissement qui lui ressemble.",
    context:
      "Deux fauteuils, une clientèle d'habitués et de passage, un bouche-à-oreille qui passe beaucoup par les recherches locales.",
    problem:
      "Sans réservation en ligne, les clients de passage vont ailleurs. La fiche d'établissement n'a ni photos récentes ni liste des prestations.",
    direction:
      "Une identité franche, vert profond sur fond clair, avec les prestations et les disponibilités en premier. La fiche d'établissement reprend les mêmes informations et renvoie vers la réservation.",
    features: ["Prestations et durées", "Réservation par barbier", "Fiche d'établissement complète", "Accès et horaires"],
    services: ["reservation-en-ligne", "google-business", "site-web"],
    companion: "profile",
    palette: {
      bg: "#EEEBE4",
      surface: "#E3DFD6",
      ink: "#161616",
      muted: "#5F5B55",
      line: "#D3CEC3",
      accent: "#1F3B2F",
      onAccent: "#F2EEE6",
    },
    typography: "sans",
    wordmark: "wide",
    hero: "split",
    block: "list",
    nav: ["Prestations", "L'équipe", "Accès", "Réserver"],
    eyebrow: "Barbier",
    title: ["La coupe nette,", "le rendez-vous aussi."],
    tagline: "Coupe, taille de barbe et rasage à l'ancienne. Réservez votre fauteuil en ligne.",
    primaryCta: "Prendre rendez-vous",
    secondaryCta: "Nos prestations",
    blockTitle: "Prestations",
    entries: [
      { name: "Coupe homme", detail: "30 min" },
      { name: "Taille de barbe", detail: "20 min" },
      { name: "Coupe & barbe", detail: "45 min" },
    ],
    art: ["#CFC8BA", "#6E7E72", "#1F3B2F"],
  },
  {
    slug: "bois-et-ligne",
    kind: "concept",
    sector: "Artisan menuisier",
    brand: "Bois & Ligne",
    domain: "bois-et-ligne.fr",
    summary: "Un atelier de menuiserie qui veut montrer ses réalisations et recevoir des demandes de devis complètes.",
    context:
      "Atelier de menuiserie sur mesure : cuisines, dressings, escaliers. Des chantiers soignés, peu montrés.",
    problem:
      "Les photos des chantiers dorment sur un téléphone. Les demandes arrivent par téléphone, sans dimensions ni photos, et les devis restent sans relance.",
    direction:
      "Un site clair et chaleureux où les réalisations occupent l'essentiel de la place. Un formulaire de devis qui demande les bonnes informations, et un tableau pour suivre chaque demande jusqu'à la signature.",
    features: ["Galerie de réalisations", "Demande de devis guidée", "Suivi des devis", "Zone d'intervention"],
    services: ["site-web", "portfolio-contenu", "suivi-demandes-devis"],
    companion: "portfolio",
    palette: {
      bg: "#F3EFE8",
      surface: "#E7E0D4",
      ink: "#23201B",
      muted: "#6B6358",
      line: "#D8CFBF",
      accent: "#8A6A3F",
      onAccent: "#FFFFFF",
    },
    typography: "serif",
    wordmark: "tight",
    hero: "centered",
    block: "gallery",
    nav: ["L'atelier", "Réalisations", "Le métier", "Devis"],
    eyebrow: "Menuiserie sur mesure",
    title: ["Le bois,", "à la bonne mesure."],
    tagline: "Cuisines, dressings et escaliers dessinés puis fabriqués à l'atelier, posés par nos soins.",
    primaryCta: "Demander un devis",
    secondaryCta: "Voir les réalisations",
    blockTitle: "Réalisations récentes",
    entries: [
      { name: "Cuisine en chêne", detail: "Maison individuelle" },
      { name: "Dressing sur mesure", detail: "Appartement ancien" },
      { name: "Escalier suspendu", detail: "Rénovation complète" },
    ],
    art: ["#C9B99C", "#A98A5F", "#8A6A3F"],
  },
  {
    slug: "thermia",
    kind: "concept",
    sector: "Plomberie & chauffage",
    brand: "Thermia",
    domain: "thermia-services.fr",
    summary: "Une entreprise d'intervention qui reçoit beaucoup de demandes et veut n'en perdre aucune.",
    context:
      "Entreprise de plomberie et de chauffage, quatre techniciens, des demandes par téléphone, e-mail et formulaire.",
    problem:
      "Les demandes arrivent incomplètes et par trop de canaux. Personne ne sait lesquelles attendent un devis ou une relance.",
    direction:
      "Un site direct, qui distingue urgence et projet dès l'accueil. Chaque demande arrive dans un tableau de suivi, avec les informations manquantes signalées et la prochaine action indiquée.",
    features: ["Urgence ou projet dès l'accueil", "Formulaire qualifiant", "Tableau des demandes", "Relances de devis"],
    services: ["site-web", "suivi-demandes-devis"],
    companion: "quotes",
    palette: {
      bg: "#0F1418",
      surface: "#161D23",
      ink: "#EDF1F4",
      muted: "#93A2AD",
      line: "#25303A",
      accent: "#E39B5B",
      onAccent: "#0F1418",
    },
    typography: "sans",
    wordmark: "wide",
    hero: "split",
    block: "cards",
    nav: ["Dépannage", "Chauffage", "Rénovation", "Devis"],
    eyebrow: "Plomberie & chauffage",
    title: ["Une fuite, un projet :", "on sait quoi faire."],
    tagline: "Dépannage, entretien de chaudière et rénovation de salle de bain, dans tout le secteur.",
    primaryCta: "Demander une intervention",
    secondaryCta: "Projet de rénovation",
    blockTitle: "Nos interventions",
    entries: [
      { name: "Dépannage", detail: "Fuite, panne, débouchage" },
      { name: "Chauffage", detail: "Entretien et remplacement" },
      { name: "Salle de bain", detail: "Rénovation complète" },
    ],
    art: ["#1D2932", "#3E5768", "#E39B5B"],
  },
  {
    slug: "cabinet-aurel",
    kind: "concept",
    sector: "Cabinet de conseil",
    brand: "Cabinet Aurel",
    domain: "cabinet-aurel.fr",
    summary: "Un cabinet qui veut inspirer confiance en ligne et accueillir ses nouveaux clients sans allers-retours.",
    context:
      "Cabinet de conseil aux dirigeants de PME : stratégie, organisation, transmission d'entreprise.",
    problem:
      "Le site ne dit pas clairement ce que fait le cabinet. Chaque nouvelle mission commence par une série d'e-mails pour réunir les documents.",
    direction:
      "Un site sobre et précis, où chaque expertise est expliquée simplement. Un parcours d'accueil guide chaque nouveau client : étapes, documents à fournir, premier rendez-vous.",
    features: ["Expertises détaillées", "Prise de contact qualifiée", "Parcours d'accueil", "Collecte de documents"],
    services: ["site-web", "onboarding-client"],
    companion: "onboarding",
    palette: {
      bg: "#FFFFFF",
      surface: "#F2F5F8",
      ink: "#12161A",
      muted: "#5C6873",
      line: "#DFE5EB",
      accent: "#2F4A63",
      onAccent: "#FFFFFF",
    },
    typography: "sans",
    wordmark: "tight",
    hero: "split",
    block: "cards",
    nav: ["Expertises", "Méthode", "Le cabinet", "Contact"],
    eyebrow: "Conseil aux entreprises",
    title: ["Des décisions", "mieux préparées."],
    tagline: "Un accompagnement resserré pour les dirigeants qui veulent y voir clair avant d'engager.",
    primaryCta: "Prendre contact",
    secondaryCta: "Nos expertises",
    blockTitle: "Nos expertises",
    entries: [
      { name: "Stratégie", detail: "Cadrage et priorisation" },
      { name: "Organisation", detail: "Structure et processus" },
      { name: "Transmission", detail: "Cession et reprise" },
    ],
    art: ["#D5DEE7", "#8098AE", "#2F4A63"],
  },
];

export const projectBySlug = (slug: string) =>
  projects.find((project) => project.slug === slug);

export const projectPath = (slug: string) => `/realisations/${slug}`;

/** Mention affichée sous toute sélection de projets conceptuels. */
export const CONCEPT_NOTICE =
  "Projets conceptuels créés par AMYN pour montrer une direction. Les marques sont fictives ; aucun client réel n'est représenté.";
