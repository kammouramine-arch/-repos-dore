// ---------------------------------------------------------------------------
// RECHERCHE DE PROSPECTS — contrat commun a toutes les sources.
//
// Ajouter une source = implementer ProspectSource + l'enregistrer dans index.ts
// Aucune source ne fournit d'adresse email fiable : c'est le role de lib/contact.
// ---------------------------------------------------------------------------

export type SearchQuery = {
  /** Ville ou zone. Ex : "Lille" */
  city: string;
  /** Secteurs demandes, en francais. Ex : ["coiffeur", "restaurant"] */
  sectors: string[];
  /** Nombre maximum de resultats souhaites. */
  limit: number;
  radiusMeters?: number;
};

export type RawBusiness = {
  /** Identifiant stable chez la source (sert a la deduplication). */
  externalId: string;
  name: string;
  sector: string;
  city: string;
  region?: string;
  address?: string;
  postalCode?: string;
  website?: string;
  phone?: string;
  /** Email publie par la source elle-meme (rare, mais present sur OSM). */
  email?: string;
  googleBusinessUrl?: string;
  instagramUrl?: string;
  facebookUrl?: string;
  sourceKind: string;
  sourceLabel: string;
  raw: Record<string, unknown>;
};

export type SourceAvailability = {
  available: boolean;
  /** Ce qu'il manque pour rendre la source utilisable. */
  missing?: string;
  note: string;
};

export interface ProspectSource {
  readonly id: string;
  readonly label: string;
  availability(): SourceAvailability;
  search(query: SearchQuery): Promise<RawBusiness[]>;
}
