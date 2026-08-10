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

export const nav = [
  { label: "Services", href: "#services" },
  { label: "Réalisations", href: "#showcase" },
  { label: "Offres", href: "#offres" },
  { label: "FAQ", href: "#faq" },
] as const;
