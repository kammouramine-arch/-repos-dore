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
  /** Description pour les technologies d'assistance. */
  alt: string;
};

const site = (slug: string, domain: string, label: string): Shot[] => [
  { id: `site-${slug}`, kind: "browser", width: 1440, height: 1000, url: domain, alt: `Page d'accueil du concept ${label}.` },
  { id: `mobile-${slug}`, kind: "phone", width: 430, height: 930, alt: `Version mobile du concept ${label}.` },
];

export const shots: Shot[] = [
  ...site("maison-elan", "maison-elan.fr", "Maison Élan (restaurant)"),
  ...site("institut-lys", "institut-lys.fr", "Institut Lys (institut de beauté)"),
  ...site("barberie-aubin", "barberie-aubin.fr", "Barberie Aubin (barbier)"),
  ...site("bois-et-ligne", "bois-et-ligne.fr", "Bois & Ligne (menuisier)"),
  ...site("thermia", "thermia-services.fr", "Thermia (plomberie et chauffage)"),
  ...site("cabinet-aurel", "cabinet-aurel.fr", "Cabinet Aurel (conseil)"),
  { id: "menu", kind: "browser", width: 1280, height: 800, url: "maison-elan.fr/la-carte", alt: "Carte du restaurant Maison Élan, mise à jour chaque semaine." },
  { id: "table-booking", kind: "phone", width: 390, height: 844, alt: "Réservation d'une table sur téléphone : couverts, jour et heure." },
  { id: "quotes", kind: "browser", width: 1280, height: 800, url: "app.thermia-services.fr/demandes", alt: "Tableau de suivi des demandes et des devis, classés par étape." },
  { id: "quote-detail", kind: "browser", width: 1280, height: 800, url: "app.thermia-services.fr/demandes/0142", alt: "Fiche d'une demande : étapes, informations manquantes et prochaine action." },
  { id: "technician", kind: "phone", width: 390, height: 844, alt: "Application des techniciens : interventions du jour." },
  { id: "booking", kind: "phone", width: 390, height: 844, alt: "Réservation en ligne : choix du jour et du créneau." },
  { id: "app", kind: "phone", width: 390, height: 844, alt: "Application cliente : prochain rendez-vous et notifications." },
  { id: "profile", kind: "phone", width: 390, height: 844, alt: "Fiche d'établissement complète : horaires, services et actions." },
  { id: "onboarding", kind: "browser", width: 1280, height: 800, url: "espace.cabinet-aurel.fr/bienvenue", alt: "Parcours d'accueil d'un nouveau client : étapes et documents." },
  { id: "portfolio", kind: "browser", width: 1280, height: 800, url: "bois-et-ligne.fr/realisations", alt: "Page de réalisation d'un menuisier : description, détails et galerie." },
];

export const shot = (id: string) => {
  const found = shots.find((s) => s.id === id);
  if (!found) throw new Error(`Visuel inconnu : ${id}`);
  return found;
};

export const shotSrc = (id: string) => `/visuals/${id}.jpg`;
