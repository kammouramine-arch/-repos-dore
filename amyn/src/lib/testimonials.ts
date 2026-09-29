import type { Locale } from "./i18n/config.ts";

/**
 * Témoignages clients — SOURCE UNIQUE.
 *
 * RÈGLE DE PUBLICATION
 *   - Un témoignage `verified: false` n'est JAMAIS publié en production :
 *     il n'apparaît qu'en développement et sur les prévisualisations, avec
 *     une mention « brouillon » visible sur la section.
 *   - `verified: true` signifie : personne réelle, citation exacte, accord
 *     écrit pour la publication (nom, entreprise, fonction, photo).
 *   - Une note (`rating`) ou une source (`source`) ne s'affichent que sur un
 *     témoignage vérifié, et seulement si elles sont réellement fournies.
 *     Jamais de « 5,0 ★ » décoratif, jamais de faux avis Google.
 *   - Tant qu'aucun témoignage vérifié n'existe dans une langue, la section
 *     n'est pas affichée du tout dans cette langue en production.
 *
 * POUR PUBLIER UN VRAI TÉMOIGNAGE
 *   Remplacez un brouillon (ou ajoutez une entrée) avec la citation réelle,
 *   le nom, l'entreprise, la fonction, la langue, éventuellement la note et
 *   la source (ex. « Avis Google » + lien vers l'avis), puis passez
 *   `verified` à `true`. Aucune autre modification n'est nécessaire.
 */

export type Testimonial = {
  id: string;
  lang: Locale;
  quote: string;
  name: string;
  company?: string;
  role?: string;
  /** Note sur 5, uniquement si le client l'a réellement donnée. */
  rating?: 1 | 2 | 3 | 4 | 5;
  /** Origine vérifiable (ex. { label: "Avis Google", url: "https://…" }). */
  source?: { label: string; url?: string };
  /** Personne réelle, citation exacte, accord de publication écrit. */
  verified: boolean;
  /** Mis en avant en premier. */
  featured?: boolean;
  /** Photo ou logo fournis et autorisés par le client. */
  image?: { src: string; alt: string };
};

/*
 * BROUILLONS INTERNES — textes de travail fournis pour la mise en page.
 * Ce ne sont PAS des témoignages de clients : non vérifiés, sans nom réel,
 * sans note, sans source. Ils ne sortent jamais en production.
 */
export const testimonials: Testimonial[] = [
  {
    id: "fr-1",
    lang: "fr",
    featured: true,
    verified: false,
    quote:
      "AMYN a vraiment pris le temps de comprendre notre activité avant de proposer quoi que ce soit. Le résultat est beaucoup plus clair, plus moderne et surtout beaucoup plus simple pour nos clients.",
    name: "Client AMYN",
    company: "Entreprise locale",
  },
  {
    id: "fr-2",
    lang: "fr",
    verified: false,
    quote:
      "Ce que j'ai apprécié, c'est qu'on ne m'a pas simplement proposé un site. On a regardé tout le parcours client et les points qui pouvaient réellement être améliorés.",
    name: "Client AMYN",
    company: "Entreprise de services",
  },
  {
    id: "fr-3",
    lang: "fr",
    verified: false,
    quote:
      "Le rendu est professionnel, moderne et très fluide sur mobile. On sent qu'il y a eu un vrai travail sur l'expérience utilisateur et pas seulement sur l'apparence.",
    name: "Client AMYN",
    company: "Commerce indépendant",
  },
  {
    id: "fr-4",
    lang: "fr",
    verified: false,
    quote:
      "Le projet a été expliqué simplement du début à la fin. Nous savions ce qui allait être fait, pourquoi, et quelles étaient les prochaines étapes.",
    name: "Client AMYN",
    company: "TPE / PME",
  },
  {
    id: "en-1",
    lang: "en",
    featured: true,
    verified: false,
    quote:
      "AMYN took the time to understand how our business actually works before suggesting a solution. The final experience feels much clearer, more professional and easier for our customers.",
    name: "AMYN Client",
    company: "Local Business",
  },
  {
    id: "en-2",
    lang: "en",
    verified: false,
    quote:
      "What stood out was that the conversation was never just about building a website. AMYN looked at the whole customer journey and focused on what could genuinely be improved.",
    name: "AMYN Client",
    company: "Service Business",
  },
  {
    id: "en-3",
    lang: "en",
    verified: false,
    quote:
      "The result feels modern, polished and extremely smooth on mobile. It feels like a proper digital product rather than just another business website.",
    name: "AMYN Client",
    company: "Independent Business",
  },
];

/**
 * Les brouillons ne sont visibles qu'en développement et sur les
 * prévisualisations Vercel (`VERCEL_ENV=preview`), ou si
 * `AMYN_SHOW_DRAFT_TESTIMONIALS=1` est posé explicitement pour une
 * vérification locale. Un build de production ne les montre jamais.
 */
export function draftsAllowed(env: Record<string, string | undefined> = process.env): boolean {
  if (env.VERCEL_ENV === "production") return false;
  return (
    env.NODE_ENV === "development" ||
    env.VERCEL_ENV === "preview" ||
    env.AMYN_SHOW_DRAFT_TESTIMONIALS === "1"
  );
}

/**
 * Témoignages à afficher dans une langue : les vérifiés toujours, les
 * brouillons seulement si c'est permis. Le mis en avant d'abord.
 */
export function visibleTestimonials(locale: Locale, allowDrafts = draftsAllowed()): Testimonial[] {
  return testimonials
    .filter((t) => t.lang === locale && (t.verified || allowDrafts))
    .map((t) => (t.verified ? t : { ...t, rating: undefined, source: undefined, image: undefined }))
    .sort((a, b) => Number(Boolean(b.featured)) - Number(Boolean(a.featured)));
}
