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

export const hero = {
  eyebrow: "WEB & GROWTH",
  title: [
    "Votre site ne doit pas",
    "seulement être beau.",
    "Il doit vous apporter",
    "des clients.",
  ],
  body: "Nous créons des sites web modernes et des systèmes digitaux conçus pour aider les entreprises locales à attirer, convertir et fidéliser leurs clients.",
  ctaPrimary: { label: "Parler à AMYN", href: "#contact" },
  ctaSecondary: { label: "Découvrir nos services", href: "#services" },
} as const;

export const nav = [
  { label: "Services", href: "#services" },
  { label: "Réalisations", href: "#showcase" },
  { label: "Offres", href: "#offres" },
  { label: "FAQ", href: "#faq" },
] as const;
