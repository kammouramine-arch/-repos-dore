/**
 * Catalogue des écrans capturés en image (public/visuals/<id>.jpg).
 *
 * Les écrans sont écrits en HTML (components/visuals), rendus par la route
 * de développement /capture/<id>, puis photographiés en haute définition
 * par `scripts/capture-visuals.mjs`. Le site n'affiche que les images :
 * aucune maquette n'est recalculée dans le navigateur du visiteur.
 */
export type ShotKind = "browser" | "phone";

export type Shot = {
  id: string;
  kind: ShotKind;
  width: number;
  height: number;
  /** Adresse affichée dans la barre du navigateur. */
  url?: string;
  /** Description pour les technologies d'assistance, dans chaque langue. */
  alt: string;
  altEn: string;
};

const site = (slug: string, domain: string, label: string, labelEn: string): Shot[] => [
  { id: `site-${slug}`, kind: "browser", width: 1440, height: 1000, url: domain, alt: `Page d'accueil du concept ${label}.`, altEn: `Homepage of the ${labelEn} concept.` },
  { id: `mobile-${slug}`, kind: "phone", width: 430, height: 930, alt: `Version mobile du concept ${label}.`, altEn: `Mobile version of the ${labelEn} concept.` },
];

export const shots: Shot[] = [
  ...site("maison-elan", "maison-elan.fr", "Maison Élan (restaurant)", "Maison Élan (restaurant)"),
  ...site("institut-lys", "institut-lys.fr", "Institut Lys (institut de beauté)", "Institut Lys (beauty salon)"),
  ...site("barberie-aubin", "barberie-aubin.fr", "Barberie Aubin (barbier)", "Barberie Aubin (barber)"),
  ...site("bois-et-ligne", "bois-et-ligne.fr", "Bois & Ligne (menuisier)", "Bois & Ligne (joinery)"),
  ...site("thermia", "thermia-services.fr", "Thermia (plomberie et chauffage)", "Thermia (plumbing and heating)"),
  ...site("cabinet-aurel", "cabinet-aurel.fr", "Cabinet Aurel (conseil)", "Cabinet Aurel (consultancy)"),
  { id: "menu", kind: "browser", width: 1280, height: 800, url: "maison-elan.fr/la-carte", alt: "Carte du restaurant Maison Élan, mise à jour chaque semaine.", altEn: "Maison Élan restaurant menu, updated every week." },
  { id: "table-booking", kind: "phone", width: 390, height: 844, alt: "Réservation d'une table sur téléphone : couverts, jour et heure.", altEn: "Booking a table on a phone: covers, day and time." },
  { id: "quotes", kind: "browser", width: 1280, height: 800, url: "app.thermia-services.fr/demandes", alt: "Tableau de suivi des demandes et des devis, classés par étape.", altEn: "Request and quote tracking board, organised by stage." },
  { id: "quote-detail", kind: "browser", width: 1280, height: 800, url: "app.thermia-services.fr/demandes/0142", alt: "Fiche d'une demande : étapes, informations manquantes et prochaine action.", altEn: "A request record: stages, missing information and next action." },
  { id: "technician", kind: "phone", width: 390, height: 844, alt: "Application des techniciens : interventions du jour.", altEn: "Technician app: today's call-outs." },
  { id: "booking", kind: "phone", width: 390, height: 844, alt: "Réservation en ligne : choix du jour et du créneau.", altEn: "Online booking: choosing a day and a time slot." },
  { id: "app", kind: "phone", width: 390, height: 844, alt: "Application cliente : prochain rendez-vous et notifications.", altEn: "Client app: next appointment and notifications." },
  { id: "profile", kind: "phone", width: 390, height: 844, alt: "Fiche d'établissement complète : horaires, services et actions.", altEn: "Complete business profile: hours, services and actions." },
  { id: "onboarding", kind: "browser", width: 1280, height: 800, url: "espace.cabinet-aurel.fr/bienvenue", alt: "Parcours d'accueil d'un nouveau client : étapes et documents.", altEn: "New client onboarding journey: steps and documents." },
  { id: "portfolio", kind: "browser", width: 1280, height: 800, url: "bois-et-ligne.fr/realisations", alt: "Page de réalisation d'un menuisier : description, détails et galerie.", altEn: "A joiner's project page: description, details and gallery." },
];

export const shot = (id: string) => {
  const found = shots.find((s) => s.id === id);
  if (!found) throw new Error(`Visuel inconnu : ${id}`);
  return found;
};

export const shotSrc = (id: string) => `/visuals/${id}.jpg`;

/** Texte alternatif d'un écran dans une langue. */
export const shotAlt = (id: string, locale: "fr" | "en" = "fr") => {
  const s = shot(id);
  return locale === "en" ? s.altEn : s.alt;
};
