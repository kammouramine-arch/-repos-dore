// ---------------------------------------------------------------------------
// LOT 3 — RECHERCHE DE PROSPECTS (emplacement réservé)
//
// Rôle : trouver des entreprises réelles à partir de sources OFFICIELLES.
//   • Google Places API  — nom, adresse, téléphone, site, note
//   • API Sirene (INSEE) — entreprises françaises par code NAF + commune
//   • OpenStreetMap      — complément gratuit
//
// INTERDIT : scraping HTML de Google Maps ou Pages Jaunes (CGU).
// AUCUNE de ces sources ne fournit d'adresse email — voir lib/contact.
// ---------------------------------------------------------------------------

export type SearchQuery = {
  sector: string;
  city: string;
  radiusMeters?: number;
  limit?: number;
};

export type RawBusiness = {
  externalId: string;
  name: string;
  sector: string;
  city: string;
  website?: string;
  phone?: string;
  googleBusinessUrl?: string;
  sourceKind: string;
  sourceLabel: string;
};

export interface ProspectSource {
  readonly name: string;
  search(query: SearchQuery): Promise<RawBusiness[]>;
}

// Implémentations à venir au lot 3.
