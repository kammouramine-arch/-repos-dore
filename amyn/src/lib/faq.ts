/**
 * Questions fréquentes (accueil).
 *
 * Chaque réponse s'en tient à ce qu'AMYN peut réellement affirmer. Aucune
 * durée universelle, aucune garantie de classement ou de publication, et
 * aucune clause contractuelle inventée : ce qui relève du contrat renvoie
 * au devis.
 */
import type { Locale } from "./i18n/config.ts";

export type FaqItem = { q: string; a: string };

export const faq: FaqItem[] = [
  {
    q: "Combien coûte un projet ?",
    a: "Chaque projet est chiffré sur devis, à partir de vos besoins, de vos objectifs et des fonctionnalités nécessaires. Un site vitrine, un outil de suivi ou une application n'ont pas le même périmètre : un prix affiché d'avance serait soit faux, soit gonflé. Le devis détaille ce qui est inclus avant tout engagement.",
  },
  {
    q: "Puis-je d'abord voir une idée ?",
    a: "Oui, c'est le principe du premier aperçu. Vous nous présentez votre activité ; si le projet s'y prête, nous vous montrons une première piste concrète — une direction de page d'accueil, un court audit, une recommandation — avant toute prestation payante. Ce n'est pas un projet réalisé gratuitement : c'est de quoi décider en connaissance de cause.",
  },
  {
    q: "Pouvez-vous refaire un site existant ?",
    a: "Oui. Nous partons de ce qui fonctionne, reprenons les contenus utiles et reconstruisons le reste, en veillant à ne pas casser les adresses déjà connues de vos clients et des moteurs de recherche.",
  },
  {
    q: "Travaillez-vous avec un secteur en particulier ?",
    a: "Nous travaillons surtout avec des entreprises de service et de proximité : restaurants, salons, artisans, cabinets, commerces. Ce qui compte n'est pas le secteur mais la façon dont l'entreprise fonctionne ; c'est de là que part chaque projet.",
  },
  {
    q: "Combien de temps prend un projet ?",
    a: "Cela dépend du périmètre : une amélioration de fiche d'établissement et une application mobile ne se comparent pas. Le calendrier est fixé au cadrage, avec les étapes et ce qui est attendu de votre part, puis inscrit dans le devis.",
  },
  {
    q: "Pouvez-vous améliorer ma fiche Google ?",
    a: "Oui : informations, catégories, description, services, recommandations de photos et cohérence avec votre site. Personne ne peut en revanche garantir une position dans les résultats de recherche ; nous ne le promettons pas.",
  },
  {
    q: "Pouvez-vous créer une application iPhone ou Android ?",
    a: "Oui, pour iOS, Android ou les deux. Nous vérifions d'abord qu'une application est la bonne réponse, puis nous validons le périmètre et la faisabilité avant de développer. La publication sur l'App Store et Google Play dépend de leurs règles : nous préparons l'application pour les respecter, sans pouvoir garantir leur décision.",
  },
  {
    q: "Qui possède le projet final ?",
    a: "Les conditions de propriété et de cession des droits sont précisées dans chaque devis, avant le début du projet. Vous savez donc exactement ce qui vous revient avant de vous engager.",
  },
];

export const faqEn: FaqItem[] = [
  {
    q: "How much does a project cost?",
    a: "Every project is priced on quote, based on your needs, your goals and the features required. A business website, a tracking tool and an app don't have the same scope: a price shown in advance would be either wrong or inflated. The quote sets out exactly what's included before you commit to anything.",
  },
  {
    q: "Can I see an idea first?",
    a: "Yes — that's the point of the first look. You tell us about your business; if the project lends itself to it, we show you a first concrete direction — a homepage concept, a short audit, a recommendation — before any paid work. It isn't a project done for free: it's what you need to decide with confidence.",
  },
  {
    q: "Can you redesign an existing website?",
    a: "Yes. We keep what works, carry over the useful content and rebuild the rest, making sure the addresses your customers and search engines already know keep working.",
  },
  {
    q: "Do you work with a particular industry?",
    a: "We mostly work with service and local businesses: restaurants, salons, trades, consultancies, shops. What matters isn't the industry but how the business actually runs — that's where every project starts.",
  },
  {
    q: "How long does a project take?",
    a: "It depends on the scope: improving a business profile and building a mobile app aren't comparable. The timeline is set during scoping, with the stages and what we'll need from you, then written into the quote.",
  },
  {
    q: "Can you improve my Google Business Profile?",
    a: "Yes: information, categories, description, services, photo recommendations and consistency with your website. What nobody can guarantee is a position in search results, and we don't promise one.",
  },
  {
    q: "Can you build an iPhone or Android app?",
    a: "Yes, for iOS, Android or both. We first check that an app is the right answer, then confirm scope and feasibility before development. Publishing on the App Store and Google Play depends on their rules: we prepare the app to meet them, but can't guarantee their decision.",
  },
  {
    q: "Who owns the finished project?",
    a: "Ownership and transfer of rights are set out in every quote, before the project begins. You know exactly what's yours before you commit.",
  },
];

export const getFaq = (locale: Locale = "fr") => (locale === "en" ? faqEn : faq);
