/**
 * Tous les textes du site sont regroupés ici.
 *
 * Tu modifies ce fichier, le site suit. Aucun composant ne contient de
 * texte marketing en dur.
 *
 * RÈGLES D'ÉCRITURE — non négociables :
 *  · aucune statistique, aucun résultat, aucun témoignage inventés ;
 *  · aucune promesse qu'AMYN ne peut pas tenir (jamais de classement
 *    Google garanti, jamais de « premier sur Google ») ;
 *  · aucun jargon d'agence : pas de « solutions 360° », pas de
 *    « propulsez », pas de « révolutionnez » ;
 *  · les projets de démonstration sont toujours annoncés comme des
 *    concepts, jamais comme des clients réels.
 */

export const site = {
  name: "AMYN",
  domain: "amyn.agency",
  tagline: "Studio web",
  promise: "Nous créons des sites web professionnels, sur mesure.",
} as const;

/**
 * COORDONNÉES — À COMPLÉTER AVANT LA MISE EN LIGNE.
 *
 * Rien n'est inventé ici : tant qu'une valeur est vide, le lien correspondant
 * n'est tout simplement pas affiché sur le site.
 */
export const contact = {
  /* ⚠️ VALEUR PAR DÉFAUT, DÉDUITE DU DOMAINE — À CONFIRMER. */
  email: "contact@amyn.agency",
  whatsapp: "",
  instagram: "",
  linkedin: "",
} as const;

/* ==========================================================================
   01 — HERO
   ========================================================================== */

export const hero = {
  index: "01",
  eyebrow: "Studio web",
  title: [
    { text: "Votre entreprise mérite" },
    { text: "un site à sa", accent: "hauteur." },
  ],
  body: "Nous créons des sites web professionnels, modernes et sur mesure, conçus autour de votre activité.",
  ctaPrimary: { label: "Créer mon site", href: "/contact" },
  ctaSecondary: { label: "Voir nos créations", href: "#creations" },
  meta: "Studio de création de sites web — France",
} as const;

/* ==========================================================================
   02 — CRÉATIONS
   ========================================================================== */

/**
 * Le portfolio est la pièce maîtresse du site : c'est ce qui prouve.
 *
 * Les concepts eux-mêmes (marques, palettes, compositions) vivent dans
 * src/lib/concepts.ts — ajouter un métier s'y fait en une entrée.
 */
export const work = {
  index: "02",
  eyebrow: "Créations",
  title: [
    { text: "Ce que nous savons construire" },
    { text: "pour votre", accent: "entreprise." },
  ],
  intro:
    "Six concepts de sites, six univers. Chaque projet est dessiné à partir du métier, de l'image et des objectifs de l'entreprise — jamais posé sur un modèle existant.",
  disclaimer:
    "Concepts de sites créés par AMYN pour illustrer notre travail. Les marques présentées sont fictives ; aucun client réel n'est représenté.",
  bridge: "Le vôtre n'existe pas encore.",
} as const;

/* ==========================================================================
   03 — SUR MESURE
   ========================================================================== */

export const tailored = {
  index: "03",
  eyebrow: "Sur mesure",
  title: [
    { text: "Pas de modèle imposé." },
    { text: "Pas de site", accent: "générique." },
  ],
  body: "Chaque entreprise est différente. Votre site doit l'être aussi.",
  /* Ce sur quoi le site est construit — pas une liste de fonctionnalités. */
  pillars: [
    { name: "Votre activité", body: "Ce que vous faites, et comment vous le faites." },
    { name: "Vos clients", body: "Qui vous cherche, et ce qu'ils viennent y faire." },
    { name: "Votre image", body: "Le ton, les couleurs, la façon dont on vous voit." },
    { name: "Vos objectifs", body: "Des appels, des réservations, des devis, de la visibilité." },
  ],
  closing: "Le site est construit autour de tout ça. Pas l'inverse.",
} as const;

/* ==========================================================================
   04 — PAR MÉTIER
   ========================================================================== */

/**
 * Ce que chaque métier a tendance à demander. Formulé comme un usage
 * fréquent, jamais comme une liste incluse d'office : les fonctionnalités
 * entrent dans un projet quand elles servent l'activité, pas par principe.
 */
export const sectors = {
  index: "04",
  eyebrow: "Par métier",
  title: [{ text: "Un site pensé pour" }, { text: "votre", accent: "activité." }],
  note: "Nous adaptons le site à votre métier. Rien n'est inclus d'office : ce qui entre dans le projet est ce qui vous sert.",
  items: [
    { name: "Restaurant", needs: "Carte, réservation, présentation du lieu." },
    { name: "Coiffeur", needs: "Prestations, tarifs, prise de rendez-vous, galerie." },
    { name: "Artisan", needs: "Métiers, réalisations, demande de devis." },
    { name: "Immobilier", needs: "Biens, estimation, demandes de contact." },
    { name: "Commerce", needs: "Sélection, nouveautés, horaires, itinéraire." },
    { name: "Entreprise", needs: "Présentation, expertises, parcours vers le contact." },
  ],
} as const;

/* ==========================================================================
   05 — LA MÉTHODE
   ========================================================================== */

export const process = {
  index: "05",
  eyebrow: "La méthode",
  title: [{ text: "Quatre étapes." }, { text: "Aucune", accent: "surprise." }],
  steps: [
    {
      n: "01",
      name: "Vous nous parlez de votre entreprise",
      body: "Votre activité, vos clients, ce que le site doit vous apporter.",
    },
    {
      n: "02",
      name: "Nous concevons l'expérience",
      body: "Structure, direction artistique, parcours du visiteur.",
    },
    {
      n: "03",
      name: "Nous construisons le site",
      body: "Design, développement, fonctionnalités utiles à votre métier.",
    },
    {
      n: "04",
      name: "Le site est mis en ligne",
      body: "Il vous appartient. AMYN peut ensuite l'entretenir, si vous le voulez.",
    },
  ],
} as const;

/* ==========================================================================
   06 — LES OFFRES
   ========================================================================== */

/**
 * Trois niveaux d'ambition, jamais trois quotas.
 *
 * Aucun nombre de pages, aucune fonctionnalité facturée à l'unité : ce qui
 * entre dans un projet dépend de l'activité du client. Les prix sont des
 * points de départ — d'où le « À partir de », qui doit rester.
 */
export const pricing = {
  index: "06",
  eyebrow: "Les offres",
  title: [{ text: "Un projet." }, { text: "Trois", accent: "niveaux." }],
  from: "À partir de",
  tiers: [
    {
      name: "AMYN Site",
      price: "990 €",
      pitch: "Un site web professionnel, conçu sur mesure pour votre entreprise.",
      intro: "La création complète du site, adaptée au projet :",
      features: [
        "Design personnalisé",
        "Développement du site",
        "Mobile, tablette et ordinateur",
        "Les pages nécessaires au projet",
        "Présentation de l'activité et des services",
        "Formulaire de contact et boutons d'appel",
        "Les fonctionnalités utiles au métier",
        "Mise en ligne",
      ],
      featured: false,
    },
    {
      name: "AMYN Pro",
      price: "1 490 €",
      badge: "Le plus choisi",
      pitch:
        "Une expérience web plus poussée, pour les entreprises qui veulent aller plus loin.",
      intro: "Tout AMYN Site, avec un cran d'exigence supplémentaire :",
      features: [
        "Direction artistique approfondie",
        "UX travaillée de bout en bout",
        "Animations et micro-interactions",
        "Expérience mobile particulièrement soignée",
        "Architecture de site plus avancée",
        "Fonctionnalités métier plus poussées",
        "Parcours optimisé vers la prise de contact",
        "Analytics et accompagnement au lancement",
      ],
      featured: true,
    },
    {
      name: "AMYN Signature",
      price: "2 490 €",
      pitch:
        "Un projet web entièrement personnalisé, quand le site devient une pièce centrale de votre image.",
      intro: "Un accompagnement complet, du positionnement à la mise en ligne :",
      features: [
        "Analyse approfondie du besoin et des objectifs",
        "Architecture UX entièrement personnalisée",
        "Direction artistique et identité visuelle digitale",
        "Interface sur mesure, animations avancées",
        "Fonctionnalités métier spécifiques",
        "Espace client ou réservation avancée si nécessaire",
        "Intégrations avec vos outils existants",
        "Accompagnement complet au lancement",
      ],
      featured: false,
    },
  ],
  cta: "Parler de mon projet",
  /* Le haut de gamme n'a pas de plafond : au-delà, c'est un devis. */
  note: "Un projet plus ambitieux ? Il est chiffré sur devis, après un premier échange.",
  bridge: "Et une fois le site en ligne ?",
} as const;

/* ==========================================================================
   07 — SERVICES COMPLÉMENTAIRES
   ========================================================================== */

/**
 * Volontairement présentés comme des options. Le client doit pouvoir
 * repartir avec son site, et rien d'autre.
 *
 * Aucune promesse de classement : personne ne peut garantir une position
 * sur Google, et le prétendre décrédibiliserait tout le reste du site.
 */
export const visibility = {
  index: "07",
  eyebrow: "En option",
  title: [{ text: "Être trouvé," }, { text: "si vous le", accent: "souhaitez." }],
  body: "Des prestations séparées, à ajouter au projet ou à prendre plus tard. Elles ne conditionnent jamais la création de votre site.",
  items: [
    {
      name: "Fiche Google Business",
      body: "Création ou reprise de votre fiche, informations, photos, cohérence avec le site.",
    },
    {
      name: "Visibilité locale",
      body: "Travail sur les informations qui aident les gens à vous trouver près de chez eux.",
    },
    {
      name: "SEO local",
      body: "Structure, contenus et balises du site travaillés pour vos recherches locales.",
    },
    {
      name: "Présence en ligne",
      body: "Mise en cohérence de vos pages et de vos informations d'un service à l'autre.",
    },
  ],
  /* Phrase de crédibilité — ne jamais la retirer. */
  honesty:
    "Aucune position sur Google ne peut être garantie, ni par nous ni par personne. Nous travaillons ce qui dépend réellement de nous.",
  cta: "Demander un devis",
} as const;

/* ==========================================================================
   08 — AMYN CARE
   ========================================================================== */

export const care = {
  index: "08",
  eyebrow: "Maintenance",
  title: [{ text: "Votre site," }, { text: "entre de", accent: "bonnes mains." }],
  optional:
    "Facultatif. Vous pouvez acheter votre site seul, sans aucun abonnement.",
  status: "Surveillance active",
  tiers: [
    {
      name: "Care",
      price: "39 €",
      pitch: "Votre site reste entretenu et surveillé.",
      features: [
        "Hébergement et maintenance technique",
        "Surveillance du site",
        "Sauvegardes régulières",
        "Sécurité et mises à jour",
        "Petites corrections techniques",
        "Assistance par email",
      ],
      featured: false,
    },
    {
      name: "Care Plus",
      price: "69 €",
      badge: "Le plus choisi",
      pitch: "Plus d'accompagnement, moins de contraintes.",
      intro: "Tout Care, plus :",
      features: [
        "Petites modifications de contenu",
        "Assistance prioritaire",
        "Suivi technique régulier",
        "Interventions courantes prises en charge",
      ],
      featured: true,
    },
    {
      name: "Care Pro",
      price: "99 €",
      pitch: "Un accompagnement web suivi, mois après mois.",
      intro: "Tout Care Plus, plus :",
      features: [
        "Modifications plus nombreuses",
        "Support prioritaire",
        "Interventions plus fréquentes",
        "Suivi plus poussé du site",
      ],
      featured: false,
    },
  ],
  period: "/ mois",
  cta: "Choisir cette formule",
} as const;

/* ==========================================================================
   09 — L'APPEL
   ========================================================================== */

export const finalCta = {
  index: "09",
  eyebrow: "Parlons-en",
  title: [{ text: "Parlons de" }, { text: "votre", accent: "projet." }],
  body: "Décrivez-nous votre entreprise en quelques lignes. Nous revenons vers vous avec une proposition claire.",
  cta: "Créer mon site",
} as const;

/* ==========================================================================
   NAVIGATION & PIED DE PAGE
   ========================================================================== */

export const nav = [
  { label: "Créations", href: "#creations" },
  { label: "Méthode", href: "#methode" },
  { label: "Tarifs", href: "#tarifs" },
  { label: "Care", href: "#care" },
] as const;

export const footer = {
  line: "Création de sites web · Sur mesure · France",
  legal: [
    { label: "Mentions légales", href: "/mentions-legales" },
    { label: "Politique de confidentialité", href: "/confidentialite" },
  ],
} as const;
