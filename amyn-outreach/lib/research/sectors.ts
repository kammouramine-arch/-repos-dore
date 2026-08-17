// ---------------------------------------------------------------------------
// Correspondance secteur (francais) -> filtres OpenStreetMap.
// Ajouter un secteur = ajouter une entree.
// ---------------------------------------------------------------------------

export type SectorDefinition = {
  label: string;
  aliases: string[];
  /** Filtres OSM : chaque entree devient une requete node/way. */
  osm: string[];
  /** Ce secteur beneficie-t-il typiquement d'une reservation en ligne ? */
  bookingRelevant: boolean;
};

export const SECTORS: Record<string, SectorDefinition> = {
  coiffeur: {
    label: "Salon de coiffure",
    aliases: ["coiffeur", "coiffure", "salon de coiffure", "hairdresser", "barbier", "barber"],
    osm: ['"shop"="hairdresser"'],
    bookingRelevant: true,
  },
  institut_beaute: {
    label: "Institut de beaute",
    aliases: ["institut", "institut de beaute", "beaute", "esthetique", "beauty", "onglerie"],
    osm: ['"shop"="beauty"', '"shop"="cosmetics"'],
    bookingRelevant: true,
  },
  restaurant: {
    label: "Restaurant",
    aliases: ["restaurant", "restauration", "brasserie", "bistrot"],
    osm: ['"amenity"="restaurant"'],
    bookingRelevant: true,
  },
  traiteur: {
    label: "Traiteur",
    aliases: ["traiteur", "caterer", "catering"],
    osm: ['"shop"="deli"', '"craft"="caterer"'],
    bookingRelevant: true,
  },
  boulangerie: {
    label: "Boulangerie",
    aliases: ["boulangerie", "boulanger", "patisserie", "bakery"],
    osm: ['"shop"="bakery"', '"shop"="pastry"'],
    bookingRelevant: false,
  },
  fleuriste: {
    label: "Fleuriste",
    aliases: ["fleuriste", "fleurs", "florist"],
    osm: ['"shop"="florist"'],
    bookingRelevant: false,
  },
  garage: {
    label: "Garage automobile",
    aliases: ["garage", "garagiste", "mecanique", "car repair", "carrosserie"],
    osm: ['"shop"="car_repair"'],
    bookingRelevant: true,
  },
  toiletteur: {
    label: "Toiletteur",
    aliases: ["toiletteur", "toilettage", "pet grooming"],
    osm: ['"shop"="pet_grooming"'],
    bookingRelevant: true,
  },
  menuisier: {
    label: "Menuiserie",
    aliases: ["menuisier", "menuiserie", "carpenter", "ebeniste"],
    osm: ['"craft"="carpenter"', '"craft"="joiner"'],
    bookingRelevant: false,
  },
  artisan_batiment: {
    label: "Artisan du batiment",
    aliases: ["artisan", "batiment", "plombier", "electricien", "macon", "peintre"],
    osm: ['"craft"="plumber"', '"craft"="electrician"', '"craft"="builder"', '"craft"="painter"'],
    bookingRelevant: false,
  },
  coach_sportif: {
    label: "Coach sportif / salle de sport",
    aliases: ["coach", "coach sportif", "salle de sport", "fitness", "gym"],
    osm: ['"leisure"="fitness_centre"'],
    bookingRelevant: true,
  },
  photographe: {
    label: "Photographe",
    aliases: ["photographe", "photographie", "photo"],
    osm: ['"shop"="photo"', '"craft"="photographer"'],
    bookingRelevant: true,
  },
  opticien: {
    label: "Opticien",
    aliases: ["opticien", "optique", "lunetier"],
    osm: ['"shop"="optician"'],
    bookingRelevant: true,
  },
};

const DIACRITICS = /[̀-ͯ]/g;

function normalize(value: string): string {
  return value.toLowerCase().trim().normalize("NFD").replace(DIACRITICS, "");
}

/** Retrouve un secteur a partir d'un terme libre saisi par l'utilisateur. */
export function resolveSector(input: string): { key: string; def: SectorDefinition } | null {
  const needle = normalize(input);
  if (!needle) return null;

  for (const [key, def] of Object.entries(SECTORS)) {
    const all = [key, ...def.aliases].map(normalize);
    if (all.some((a) => needle === a)) return { key, def };
  }
  for (const [key, def] of Object.entries(SECTORS)) {
    const all = [key, ...def.aliases].map(normalize);
    if (all.some((a) => a.length > 3 && (needle.includes(a) || a.includes(needle)))) {
      return { key, def };
    }
  }
  return null;
}

export function listSectors() {
  return Object.entries(SECTORS).map(([key, def]) => ({ key, ...def }));
}
