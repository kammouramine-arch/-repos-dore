/**
 * Tous les textes du site sont regroupés ici.
 *
 * Pourquoi ? Pour changer un prix ou une phrase sans jamais toucher au code
 * des composants. Tu modifies ce fichier, le site suit.
 */

export const site = {
  name: "AMYN",
  tagline: "WEB & GROWTH",
  promise: "Des sites qui attirent. Des systèmes qui convertissent.",
  email: "contact@amyn.fr",
  instagram: "https://instagram.com/",
  whatsapp: "https://wa.me/33600000000",
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
  ctaPrimary: { label: "Parler à AMYN", href: "#contact" },
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

export const nav = [
  { label: "Services", href: "#services" },
  { label: "Réalisations", href: "#showcase" },
  { label: "Offres", href: "#offres" },
  { label: "FAQ", href: "#faq" },
] as const;
