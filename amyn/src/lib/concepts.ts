/**
 * Les concepts de sites présentés dans la section CRÉATIONS.
 *
 * Chaque entrée décrit un site web complet : sa marque, sa palette, sa
 * typographie, la composition de sa page d'accueil. Le rendu est du vrai
 * HTML mis à l'échelle dans une fenêtre de navigateur — pas une image, pas
 * une maquette de téléphone.
 *
 * POUR AJOUTER UN MÉTIER : ajoutez un objet à `concepts`. Rien d'autre à
 * toucher — la liste des onglets, la fenêtre et les animations s'adaptent.
 *
 * HONNÊTETÉ : toutes les marques sont fictives et servent uniquement de
 * démonstration. Le badge « Concept AMYN » de la fenêtre le dit en
 * permanence, et il ne se retire pas.
 */

/** Composition du bloc principal, sous la navigation. */
export type HeroLayout =
  /** Grande image plein cadre, titre posé dessus. */
  | "overlay"
  /** Texte à gauche, image à droite. */
  | "split"
  /** Titre centré, image en bandeau dessous. */
  | "centered";

/** Composition du bloc de contenu, sous le hero. */
export type BlockLayout =
  /** Liste tarifée, façon carte de restaurant ou de salon. */
  | "list"
  /** Trois cartes de service. */
  | "cards"
  /** Grille de biens ou de produits, avec visuel. */
  | "grid"
  /** Bandeau de trois visuels, façon galerie. */
  | "gallery";

export type Concept = {
  /** Identifiant stable, utilisé pour les ancres et les clés React. */
  id: string;
  /** Le métier, tel qu'affiché dans les onglets. */
  trade: string;
  /** Marque fictive de la démonstration. */
  brand: string;
  /** Domaine fictif affiché dans la barre d'adresse. */
  domain: string;
  /** Une ligne qui dit ce que ce site cherche à obtenir. */
  intent: string;
  /** Ce que le site embarque — des fonctionnalités DU SITE, jamais des
      services annexes (référencement, publicité, maintenance…). */
  features: string[];

  palette: {
    /** Fond de page. */
    bg: string;
    /** Fond des blocs secondaires. */
    surface: string;
    /** Texte principal. */
    ink: string;
    /** Texte secondaire. */
    muted: string;
    /** Filets et bordures. */
    line: string;
    /** Couleur d'accent de la marque : boutons, détails. */
    accent: string;
    /** Texte posé sur l'accent. */
    onAccent: string;
  };

  /** Deux familles suffisent à changer complètement le caractère. */
  typography: "serif" | "sans";
  /** Casse et interlettrage du logo. */
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
  /** Trois entrées : nom + précision (prix, surface, détail…). */
  entries: { name: string; detail: string }[];

  /** Trois teintes qui composent les visuels du site. */
  art: [string, string, string];
};

export const concepts: Concept[] = [
  {
    id: "restaurant",
    trade: "Restaurant",
    brand: "Maison Élan",
    domain: "maison-elan.fr",
    intent: "Remplir les tables du soir sans passer la journée au téléphone.",
    features: ["Réservation en ligne", "Carte actualisable", "Galerie", "Accès et horaires"],
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
    tagline:
      "Une cuisine courte, dictée par les producteurs. Service du mardi au dimanche.",
    primaryCta: "Réserver une table",
    secondaryCta: "Voir la carte",
    blockTitle: "La carte du moment",
    entries: [
      { name: "Menu déjeuner", detail: "3 services · 34 €" },
      { name: "Menu du marché", detail: "5 services · 58 €" },
      { name: "Accord mets & vins", detail: "sur demande" },
    ],
    art: ["#3A2A20", "#7A4A2C", "#C2703F"],
  },
  {
    id: "coiffeur",
    trade: "Coiffeur",
    brand: "Atelier N°7",
    domain: "atelier-n7.fr",
    intent: "Faire prendre les rendez-vous en ligne, même salon fermé.",
    features: ["Prise de rendez-vous", "Prestations et tarifs", "Galerie", "Équipe"],
    palette: {
      bg: "#F4F1EC",
      surface: "#EAE5DD",
      ink: "#1A1917",
      muted: "#6E6862",
      line: "#DBD4C9",
      accent: "#A8927B",
      onAccent: "#FFFFFF",
    },
    typography: "sans",
    wordmark: "tight",
    hero: "split",
    block: "list",
    nav: ["Le salon", "Prestations", "Galerie", "Rendez-vous"],
    eyebrow: "Salon de coiffure",
    title: ["Le geste juste,", "à chaque visite."],
    tagline:
      "Coupe, couleur et soin, dans un atelier de quatre fauteuils. Sur rendez-vous.",
    primaryCta: "Prendre rendez-vous",
    secondaryCta: "Nos prestations",
    blockTitle: "Prestations",
    entries: [
      { name: "Coupe & brushing", detail: "à partir de 45 €" },
      { name: "Couleur végétale", detail: "à partir de 75 €" },
      { name: "Soin profond", detail: "à partir de 30 €" },
    ],
    art: ["#D9D0C4", "#B9AB99", "#A8927B"],
  },
  {
    id: "immobilier",
    trade: "Immobilier",
    brand: "Maison Valeur",
    domain: "maison-valeur.fr",
    intent: "Présenter les biens et capter les demandes d'estimation.",
    features: ["Catalogue de biens", "Demande d'estimation", "Fiches détaillées", "Contact direct"],
    palette: {
      bg: "#0F1418",
      surface: "#161D23",
      ink: "#EDF1F4",
      muted: "#93A2AD",
      line: "#25303A",
      accent: "#7E9AAE",
      onAccent: "#0F1418",
    },
    typography: "sans",
    wordmark: "wide",
    hero: "split",
    block: "grid",
    nav: ["Acheter", "Vendre", "Estimation", "L'agence"],
    eyebrow: "Agence immobilière",
    title: ["Des biens choisis,", "pas un catalogue."],
    tagline:
      "Une sélection restreinte, suivie par la même personne du premier appel à la signature.",
    primaryCta: "Estimer mon bien",
    secondaryCta: "Voir les biens",
    blockTitle: "Sélection du moment",
    entries: [
      { name: "Maison de ville", detail: "142 m² · 4 pièces" },
      { name: "Appartement terrasse", detail: "88 m² · 3 pièces" },
      { name: "Loft d'architecte", detail: "165 m² · 2 pièces" },
    ],
    art: ["#1D2932", "#3E5768", "#7E9AAE"],
  },
  {
    id: "artisan",
    trade: "Artisan",
    brand: "Bois & Ligne",
    domain: "bois-et-ligne.fr",
    intent: "Montrer les réalisations et recevoir des demandes de devis.",
    features: ["Portfolio de réalisations", "Demande de devis", "Étapes du projet", "Zone d'intervention"],
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
    tagline:
      "Cuisines, dressings et escaliers dessinés puis fabriqués à l'atelier, posés par nos soins.",
    primaryCta: "Demander un devis",
    secondaryCta: "Voir les réalisations",
    blockTitle: "Réalisations récentes",
    entries: [
      { name: "Cuisine en chêne", detail: "Maison individuelle" },
      { name: "Dressing sur mesure", detail: "Appartement haussmannien" },
      { name: "Escalier suspendu", detail: "Rénovation complète" },
    ],
    art: ["#C9B99C", "#A98A5F", "#8A6A3F"],
  },
  {
    id: "commerce",
    trade: "Boutique",
    brand: "Studio Faubourg",
    domain: "studio-faubourg.fr",
    intent: "Faire venir en boutique et présenter la sélection du moment.",
    features: ["Catalogue produits", "Nouveautés", "Horaires et accès", "Formulaire de contact"],
    palette: {
      bg: "#FAF8F5",
      surface: "#F0EBE5",
      ink: "#1C1A18",
      muted: "#726B64",
      line: "#E2DAD1",
      accent: "#9B6A78",
      onAccent: "#FFFFFF",
    },
    typography: "sans",
    wordmark: "wide",
    hero: "centered",
    block: "grid",
    nav: ["La sélection", "Nouveautés", "La boutique", "Contact"],
    eyebrow: "Concept store",
    title: ["Une sélection,", "pas un rayon."],
    tagline:
      "Objets, textiles et papeterie choisis un par un. En boutique, du mardi au samedi.",
    primaryCta: "Voir la sélection",
    secondaryCta: "Nous trouver",
    blockTitle: "Nouveautés",
    entries: [
      { name: "Céramique grès", detail: "Atelier français" },
      { name: "Lin lavé", detail: "Tissé en Europe" },
      { name: "Papeterie reliée", detail: "Édition limitée" },
    ],
    art: ["#E4D5D8", "#C39BA6", "#9B6A78"],
  },
  {
    id: "entreprise",
    trade: "Entreprise",
    brand: "Cabinet Aurel",
    domain: "cabinet-aurel.fr",
    intent: "Inspirer confiance et transformer la visite en prise de contact.",
    features: ["Présentation des expertises", "Études de cas", "Équipe", "Prise de contact"],
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
    nav: ["Expertises", "Méthode", "L'équipe", "Contact"],
    eyebrow: "Conseil aux entreprises",
    title: ["Des décisions", "mieux préparées."],
    tagline:
      "Un accompagnement resserré pour les dirigeants qui veulent y voir clair avant d'engager.",
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
