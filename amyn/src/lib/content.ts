/**
 * Tous les textes du site sont regroupés ici.
 *
 * Pourquoi ? Pour changer un prix ou une phrase sans jamais toucher au code
 * des composants. Tu modifies ce fichier, le site suit.
 */

export const site = {
  name: "AMYN",
  domain: "amyn.agency",
  tagline: "Web & Growth",
  promise: "Des sites qui attirent. Des systèmes qui convertissent.",
} as const;

/**
 * COORDONNÉES — À COMPLÉTER AVANT LA MISE EN LIGNE.
 *
 * Rien n'est inventé ici : tant qu'une valeur est vide, le lien correspondant
 * n'est tout simplement pas affiché sur le site. Renseigne une chaîne et le
 * lien apparaît. Ne mets jamais d'adresse ou de compte fictif.
 */
export const contact = {
  /* ⚠️ VALEUR PAR DÉFAUT, DÉDUITE DU DOMAINE — À CONFIRMER.
     Elle n'a pas été vérifiée : remplace-la par ta vraie adresse, ou
     assure-toi que celle-ci reçoit bien les messages. */
  email: "contact@amyn.agency",
  /* Ex. "https://wa.me/33XXXXXXXXX" */
  whatsapp: "",
  /* Ex. "https://instagram.com/…" */
  instagram: "",
  /* Ex. "https://linkedin.com/company/…" */
  linkedin: "",
} as const;

/**
 * Le titre du hero est découpé ligne par ligne : chaque ligne se révèle
 * derrière son propre masque. `accent` = le mot en serif italique doré.
 * Il ne doit y en avoir qu'UN sur tout le titre.
 */
export const hero = {
  index: "01",
  eyebrow: "Web & Growth",
  title: [
    { text: "Votre site ne doit pas" },
    { text: "seulement être beau." },
    { text: "Il doit vous apporter" },
    { text: "des", accent: "clients." },
  ],
  body: "Nous créons des sites web modernes et des systèmes digitaux conçus pour aider les entreprises locales à attirer, convertir et fidéliser leurs clients.",
  ctaPrimary: { label: "Parler à AMYN", href: "/contact" },
  ctaSecondary: { label: "Découvrir nos services", href: "#services" },
  meta: "Commerces & entreprises locales — France",
} as const;

/**
 * SECTION 02 — LE CONSTAT.
 *
 * Règle de ton : aucune statistique inventée, aucune promesse exagérée.
 * Chaque conséquence décrit une scène que le lecteur a déjà vécue.
 */
export const problem = {
  index: "02",
  eyebrow: "Le constat",
  question: [
    { text: "Votre présence en ligne" },
    { text: "travaille-t-elle", accent: "vraiment" },
    { text: "pour vous ?" },
  ],
  items: [
    {
      n: "01",
      title: "Site vieillissant",
      body: "Votre vitrine annonce « fermé » avant même qu'on pousse la porte.",
    },
    {
      n: "02",
      title: "Illisible sur mobile",
      body: "On pince, on zoome, on renonce.",
    },
    {
      n: "03",
      title: "Aucune direction",
      body: "Le visiteur ne sait pas quoi faire. Alors il ne fait rien.",
    },
    {
      n: "04",
      title: "Réservation impossible",
      body: "L'envie d'acheter ne survit pas à un appel non décroché.",
    },
    {
      n: "05",
      title: "Introuvable à côté",
      body: "On vous cherche à trois rues d'ici. On trouve votre concurrent.",
    },
    {
      n: "06",
      title: "Demandes perdues",
      body: "Un formulaire qui n'alerte personne est un client qui n'existe pas.",
    },
  ],
  closing: [
    { text: "Chaque jour, des clients" },
    { text: "cherchent ce que vous vendez." },
    { text: "Et trouvent", accent: "quelqu'un d'autre." },
  ],
} as const;

/**
 * SECTION 03 — LA RÉPONSE.
 *
 * `mirror` est la phrase-miroir : elle retourne mot pour mot un problème de
 * la section 02. C'est la transformation rendue lisible, pas seulement
 * visible. Ne les modifie jamais sans relire les conséquences du CONSTAT.
 */
export const solution = {
  index: "03",
  eyebrow: "La réponse",
  title: [
    { text: "Nous", accent: "transformons" },
    { text: "votre présence" },
    { text: "en ligne." },
  ],
  pillars: [
    {
      name: "Build",
      body: "Sites web modernes.",
      mirror: "Une vitrine qui donne envie d'entrer.",
    },
    {
      name: "Convert",
      body: "Réservation, formulaires, WhatsApp, parcours client.",
      mirror: "Le visiteur sait quoi faire, et il le fait.",
    },
    {
      name: "Grow",
      body: "SEO local, Google Business, optimisation.",
      mirror: "On vous trouve avant de trouver le voisin.",
    },
  ],
  promise: [
    { text: "Des sites qui attirent." },
    { text: "Des systèmes qui", accent: "convertissent." },
  ],
} as const;

/**
 * SECTION 04 — LE SYSTÈME.
 *
 * Neuf services = 3 × 3. Chaque circuit prolonge un pilier de la RÉPONSE :
 * les services forment un système par construction, pas parce qu'un texte
 * l'affirme. L'ordre des pièces est celui du parcours du courant — sur la
 * deuxième passe, le circuit va de droite à gauche.
 */
export const services = {
  index: "04",
  eyebrow: "Le système",
  title: [{ text: "Neuf pièces." }, { text: "Un seul", accent: "système." }],
  circuits: [
    {
      name: "Build",
      items: [
        {
          name: "Création de sites web",
          body: "La base : rapide, clair, à votre image.",
        },
        {
          name: "Design responsive",
          body: "Aussi net dans la poche qu'au bureau.",
        },
        {
          name: "Landing pages",
          body: "Une page, un objectif, zéro distraction.",
        },
      ],
    },
    {
      name: "Convert",
      items: [
        {
          name: "Systèmes de réservation",
          body: "Le client réserve pendant que vous travaillez.",
        },
        {
          name: "Formulaires & WhatsApp",
          body: "La demande arrive. Vous le savez tout de suite.",
        },
        {
          name: "Optimisation de conversion",
          body: "On règle les détails qui décident.",
        },
      ],
    },
    {
      name: "Grow",
      items: [
        {
          name: "SEO local",
          body: "Être là quand on cherche à côté de chez vous.",
        },
        {
          name: "Google Business",
          body: "Votre fiche, tenue comme une vitrine.",
        },
        {
          name: "Automatisations",
          body: "Les relances et les avis, sans y penser.",
        },
      ],
    },
  ],
  bridge: "Le même système, monté sur mesure.",
} as const;

/**
 * SECTION 05 — DÉMONSTRATIONS.
 *
 * Quatre métiers, un seul squelette : les blocs sont aux mêmes places dans
 * les quatre démos, seule l'identité change. C'est la démonstration visuelle
 * de « le même système, monté sur mesure ».
 *
 * HONNÊTETÉ — règles non négociables :
 *  · les enseignes sont volontairement génériques (aucun risque de
 *    ressembler à un vrai commerce, et le visiteur y projette la sienne) ;
 *  · aucun avis, aucune note, aucun chiffre inventé — ni ici, ni ailleurs ;
 *  · le badge CONCEPT et la mention de bas de section ne disparaissent jamais.
 *
 * `notes.at` est la hauteur, en pourcentage de l'écran, de l'élément que
 * l'annotation désigne : bouton d'action 33, statut 41, prestations 65,
 * barre de contact 95. Ces valeurs sont mesurées sur le rendu réel. Les notes sont rangées de haut en bas pour que les
 * filets ne se croisent jamais.
 *
 * `accent` est une couleur d'accent propre au métier, en hexadécimal parce
 * que l'animation doit pouvoir l'interpoler. Toutes sont désaturées et
 * n'apparaissent que sur deux éléments : le bouton d'action et la pastille
 * de statut. L'or reste dehors — il est à AMYN, pas aux clients.
 */
export const showcase = {
  index: "05",
  eyebrow: "Démonstrations",
  title: [{ text: "Même système." }, { text: "Quatre", accent: "métiers." }],
  disclaimer:
    "Projets de démonstration créés par AMYN. Aucun client réel n'est représenté.",
  bridge: "Chacun de ces systèmes tient dans une offre.",
  /* Identique dans les quatre démos : c'est le squelette. */
  actions: ["Appeler", "WhatsApp", "Itinéraire"],
  demos: [
    {
      trade: "Barbier",
      name: "Le Barbier",
      accent: "#B0764A", // cuivre
      headline: ["Coupe, barbe,", "soin du visage."],
      action: "Réserver",
      status: "Ouvert jusqu'à 19 h",
      services: ["Coupe", "Barbe", "Coupe + barbe"],
      hours: "Du mardi au samedi",
      notes: [
        { text: "Réservation en 2 clics", at: 33 },
        { text: "Horaires toujours à jour", at: 41 },
        { text: "Appel direct au pouce", at: 95 },
      ],
    },
    {
      trade: "Restaurant",
      name: "La Table",
      accent: "#96453B", // braise
      headline: ["Cuisine de saison,", "produits du marché."],
      action: "Réserver une table",
      status: "Service ce soir dès 19 h",
      services: ["Le midi", "Le soir", "La carte"],
      hours: "Du mardi au dimanche",
      notes: [
        { text: "Réserver une table sans appeler", at: 33 },
        { text: "Menu toujours à jour", at: 65 },
        { text: "Itinéraire en un geste", at: 95 },
      ],
    },
    {
      trade: "Institut",
      name: "L'Institut",
      accent: "#B08289", // poudre
      headline: ["Soins du visage", "et du corps."],
      action: "Prendre rendez-vous",
      status: "Prochaine disponibilité demain",
      services: ["Soin du visage", "Épilation", "Massage"],
      hours: "Du lundi au samedi",
      notes: [
        { text: "Rendez-vous 24 h/24", at: 33 },
        { text: "Rappels automatiques", at: 41 },
        { text: "Prestations et tarifs visibles", at: 65 },
      ],
    },
    {
      trade: "Garage",
      name: "Le Garage",
      accent: "#5F7E9B", // acier
      headline: ["Entretien, pneus,", "révision."],
      action: "Demander un devis",
      status: "Rendez-vous sous 48 h",
      services: ["Révision", "Pneus", "Diagnostic"],
      hours: "Du lundi au vendredi",
      notes: [
        { text: "Demande de devis en 1 minute", at: 33 },
        { text: "Créneau réservé en ligne", at: 41 },
        { text: "Demande reçue directement", at: 95 },
      ],
    },
  ],
} as const;

export const nav = [
  { label: "Système", href: "#services" },
  { label: "Démonstrations", href: "#showcase" },
  { label: "Offres", href: "#offres" },
  { label: "Care", href: "#care" },
] as const;

/**
 * SECTION 06 — LES OFFRES.
 *
 * Trois paliers du même système, pas trois produits concurrents : chaque
 * offre reprend la précédente. C'est pour cela que PREMIUM et ULTIMATE
 * commencent par une ligne d'héritage plutôt que de répéter la liste.
 *
 * PREMIUM est mis en avant par la composition (encadré, surélevé, seul
 * bouton doré de l'écran), jamais par une couleur criarde.
 *
 * Les prix sont fixés par AMYN : ne les modifie pas sans instruction.
 */
export const pricing = {
  index: "06",
  eyebrow: "Les offres",
  title: [{ text: "Nouvelle présence." }, { text: "Nouveau", accent: "niveau." }],
  tiers: [
    {
      name: "Essential",
      price: "790 €",
      pitch: "Pour une présence professionnelle.",
      /* Les trois paliers ouvrent par une ligne de même nature : c'est ce qui
         aligne les listes entre elles et rend l'héritage lisible. */
      inherits: "Inclus :",
      features: [
        "Site jusqu'à 5 pages",
        "100 % responsive",
        "Bouton d'appel",
        "WhatsApp intégré",
        "Google Maps",
        "Formulaire de contact",
        "Connexion du domaine",
        "Mise en ligne",
      ],
      featured: false,
    },
    {
      name: "Premium",
      price: "1 290 €",
      badge: "Recommandé",
      pitch: "Notre offre la plus populaire.",
      inherits: "Tout Essential, plus :",
      features: [
        "Système de réservation",
        "Optimisation Google Business",
        "SEO local de base",
        "Automatisation des demandes",
        "Google Analytics",
        "Pages optimisées pour convertir",
        "Galerie / portfolio",
        "1 mois de petites modifications inclus",
      ],
      featured: true,
    },
    {
      name: "Ultimate",
      price: "1 990 €",
      pitch: "Le système complet, pour une croissance maximale.",
      inherits: "Tout Premium, plus :",
      features: [
        "SEO local avancé",
        "Automatisations avancées",
        "Suivi automatique des prospects",
        "Système de réservation avancé",
        "Landing pages orientées conversion",
        "Tableau de suivi des prospects",
        "Gestion et optimisation Google Business",
        "3 mois de maintenance inclus",
        "Support prioritaire",
      ],
      featured: false,
    },
  ],
  cta: "Choisir cette offre",
  bridge: "Et après la mise en ligne ?",
} as const;

/**
 * SECTION 07 — AMYN CARE.
 *
 * La seule section du site où quelque chose bouge sans qu'on scrolle.
 * Partout ailleurs le mouvement s'arrête quand le visiteur s'arrête ; ici
 * l'impulsion continue toute seule. C'est l'argument de l'abonnement, rendu
 * sensible avant d'être lu.
 */
export const care = {
  index: "07",
  eyebrow: "La continuité",
  title: [{ text: "Your website." }, { text: "Always", accent: "moving." }],
  name: "AMYN Care",
  price: "99 €",
  period: "/ mois",
  pitch: "Gardez votre site rapide, sécurisé et toujours à jour.",
  status: "Surveillance active",
  benefits: [
    "Hébergement sécurisé",
    "Maintenance technique",
    "Sécurité & sauvegardes",
    "Petites modifications",
    "Surveillance du site",
    "Support continu",
  ],
  cta: "Activer AMYN Care",
} as const;

/**
 * SECTION 08 — L'APPEL.
 *
 * Le conducteur qui court depuis le logo de l'intro s'achève ici, sur le
 * seul bouton de la page. Rien d'autre à l'écran.
 */
export const finalCta = {
  index: "08",
  eyebrow: "Parlons-en",
  title: [
    { text: "Prêt à faire grandir" },
    { text: "votre", accent: "activité ?" },
  ],
  body: "Parlons de votre projet et voyons comment AMYN peut améliorer votre présence en ligne.",
  cta: "Parler à AMYN",
} as const;

/** Pied de page. Les liens vides ne sont pas rendus (voir `contact`). */
export const footer = {
  line: "Sites web · Conversion · SEO local",
  legal: [
    { label: "Mentions légales", href: "/mentions-legales" },
    { label: "Politique de confidentialité", href: "/confidentialite" },
  ],
} as const;
