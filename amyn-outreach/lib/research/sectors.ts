// ---------------------------------------------------------------------------
// Correspondance secteur (francais) -> filtres OpenStreetMap.
// Ajouter un secteur = ajouter une entree.
// ---------------------------------------------------------------------------

export type SectorDefinition = {
  label: string;
  aliases: string[];
  /** Filtres OSM : chaque entree devient une requete node/way. */
  osm: string[];
  /**
   * Codes NAF (nomenclature d'activites francaise) associes.
   *
   * Servent a interroger Sirene, qui ne connait pas les tags OSM. Un prefixe
   * suffit : "56.10" couvre 56.10A, 56.10B et 56.10C.
   *
   * ATTENTION : ces codes doivent etre confrontes a la nomenclature officielle
   * INSEE au moment de brancher l'API reelle (lot 2). Un code errone ne fait
   * pas planter la recherche — il la rend simplement vide.
   */
  naf: string[];
  /** Ce secteur beneficie-t-il typiquement d'une reservation en ligne ? */
  bookingRelevant: boolean;
  /**
   * Secteur dont la prospection demande une precaution particuliere.
   *
   * Professions de sante, professions reglementees : leur publicite et leur
   * demarchage sont encadres par des codes de deontologie. Ces secteurs ne
   * sont PAS exclus, mais ils ne sont jamais retenus par defaut : il faut les
   * demander explicitement, et la decision vous revient.
   */
  sensitive?: boolean;
};

export const SECTORS: Record<string, SectorDefinition> = {
  hotel: {
    label: "Hotel / hebergement",
    aliases: ["hotel", "hebergement", "auberge", "gite", "chambre d hotes", "residence"],
    osm: ['"tourism"="hotel"', '"tourism"="guest_house"'],
    naf: ["55.10Z", "55.20Z"],
    bookingRelevant: true,
  },
  cafe_bar: {
    label: "Cafe / bar",
    aliases: ["cafe", "bar", "brasserie", "pub", "salon de the", "bistrot"],
    osm: ['"amenity"="cafe"', '"amenity"="bar"', '"amenity"="pub"'],
    naf: ["56.30Z"],
    bookingRelevant: false,
  },
  concessionnaire: {
    label: "Concessionnaire automobile",
    aliases: ["concessionnaire", "concession", "vente automobile", "vente de voitures"],
    osm: ['"shop"="car"'],
    naf: ["45.11Z"],
    bookingRelevant: false,
  },
  agence_immobiliere: {
    label: "Agence immobiliere",
    aliases: ["agence immobiliere", "immobilier", "immobiliere", "agent immobilier", "syndic"],
    osm: ['"office"="estate_agent"'],
    naf: ["68.31Z", "68.32A"],
    bookingRelevant: true,
  },
  architecte: {
    label: "Architecte / maitrise d oeuvre",
    aliases: ["architecte", "architecture", "maitre d oeuvre", "maitrise d oeuvre", "bureau d etudes"],
    osm: ['"office"="architect"'],
    naf: ["71.11Z", "71.12B"],
    bookingRelevant: false,
  },
  salle_sport: {
    label: "Salle de sport",
    aliases: ["salle de sport", "fitness", "musculation", "gym", "crossfit", "club de sport"],
    osm: ['"leisure"="fitness_centre"', '"leisure"="sports_centre"'],
    naf: ["93.13Z"],
    bookingRelevant: true,
  },
  formation: {
    label: "Ecole privee / centre de formation",
    aliases: ["ecole privee", "centre de formation", "formation", "organisme de formation", "auto ecole", "cours particuliers"],
    osm: ['"amenity"="driving_school"', '"office"="educational_institution"'],
    naf: ["85.59A", "85.59B", "85.53Z"],
    bookingRelevant: true,
  },
  nettoyage: {
    label: "Entreprise de nettoyage",
    aliases: ["nettoyage", "proprete", "menage", "entretien", "pressing", "blanchisserie"],
    osm: ['"shop"="dry_cleaning"', '"shop"="laundry"'],
    naf: ["81.21Z", "81.22Z", "96.01A", "96.01B"],
    bookingRelevant: false,
  },
  commerce_detail: {
    label: "Commerce de detail",
    aliases: ["commerce", "magasin", "boutique", "commerce de detail", "detaillant"],
    osm: ['"shop"="clothes"', '"shop"="shoes"', '"shop"="jewelry"', '"shop"="furniture"', '"shop"="books"'],
    naf: ["47"],
    bookingRelevant: false,
  },
  services_b2b: {
    label: "Services aux entreprises",
    aliases: ["services aux entreprises", "b2b", "conseil", "consultant", "cabinet conseil", "expert comptable", "comptable", "avocat d affaires"],
    osm: ['"office"="company"', '"office"="consulting"', '"office"="accountant"'],
    naf: ["69.20Z", "70.22Z", "73.11Z", "62.02A"],
    bookingRelevant: false,
  },
  studio_creatif: {
    label: "Studio creatif",
    aliases: ["studio", "studio creatif", "graphiste", "design", "communication", "videaste", "imprimeur"],
    osm: ['"office"="graphic_design"', '"craft"="photographer"'],
    naf: ["74.10Z", "73.11Z", "59.11A", "18.12Z"],
    bookingRelevant: false,
  },
  sante: {
    label: "Professionnel de sante",
    aliases: ["dentiste", "medecin", "kinesitherapeute", "osteopathe", "veterinaire", "cabinet medical", "orthodontiste"],
    osm: ['"amenity"="dentist"', '"amenity"="doctors"', '"amenity"="veterinary"'],
    naf: ["86.21Z", "86.22", "86.23Z", "86.90", "75.00Z"],
    bookingRelevant: true,
    // Publicite et demarchage encadres par des codes de deontologie.
    sensitive: true,
  },
  coiffeur: {
    label: "Salon de coiffure",
    aliases: ["coiffeur", "coiffure", "salon de coiffure", "hairdresser", "barbier", "barber"],
    osm: ['"shop"="hairdresser"'],
    naf: ["96.02A"],
    bookingRelevant: true,
  },
  institut_beaute: {
    label: "Institut de beaute",
    aliases: ["institut", "institut de beaute", "beaute", "esthetique", "beauty", "onglerie"],
    osm: ['"shop"="beauty"', '"shop"="cosmetics"'],
    naf: ["96.02B", "96.04Z"],
    bookingRelevant: true,
  },
  restaurant: {
    label: "Restaurant",
    aliases: ["restaurant", "restauration", "brasserie", "bistrot"],
    osm: ['"amenity"="restaurant"'],
    naf: ["56.10A", "56.10B"],
    bookingRelevant: true,
  },
  traiteur: {
    label: "Traiteur",
    aliases: ["traiteur", "caterer", "catering"],
    osm: ['"shop"="deli"', '"craft"="caterer"'],
    naf: ["56.21Z", "10.13B"],
    bookingRelevant: true,
  },
  boulangerie: {
    label: "Boulangerie",
    aliases: ["boulangerie", "boulanger", "patisserie", "bakery"],
    osm: ['"shop"="bakery"', '"shop"="pastry"'],
    naf: ["10.71C", "47.24Z"],
    bookingRelevant: false,
  },
  fleuriste: {
    label: "Fleuriste",
    aliases: ["fleuriste", "fleurs", "florist"],
    osm: ['"shop"="florist"'],
    naf: ["47.76Z"],
    bookingRelevant: false,
  },
  garage: {
    label: "Garage automobile",
    aliases: ["garage", "garagiste", "mecanique", "car repair", "carrosserie"],
    osm: ['"shop"="car_repair"'],
    naf: ["45.20A", "45.20B"],
    bookingRelevant: true,
  },
  toiletteur: {
    label: "Toiletteur",
    aliases: ["toiletteur", "toilettage", "pet grooming"],
    osm: ['"shop"="pet_grooming"'],
    naf: ["96.09Z"],
    bookingRelevant: true,
  },
  menuisier: {
    label: "Menuiserie",
    aliases: ["menuisier", "menuiserie", "carpenter", "ebeniste"],
    osm: ['"craft"="carpenter"', '"craft"="joiner"'],
    naf: ["43.32A", "16.23Z"],
    bookingRelevant: false,
  },
  plombier: {
    label: "Plombier / chauffagiste",
    aliases: ["plombier", "plomberie", "chauffagiste", "chauffage", "sanitaire", "plumber"],
    osm: ['"craft"="plumber"', '"craft"="hvac"'],
    naf: ["43.22A", "43.22B"],
    bookingRelevant: false,
  },
  electricien: {
    label: "Electricien",
    aliases: ["electricien", "electricite", "electrique", "electrician"],
    osm: ['"craft"="electrician"'],
    naf: ["43.21A"],
    bookingRelevant: false,
  },
  macon: {
    label: "Macon / gros oeuvre",
    aliases: ["macon", "maconnerie", "gros oeuvre", "builder"],
    osm: ['"craft"="builder"', '"craft"="stonemason"'],
    naf: ["43.99C", "41.20A"],
    bookingRelevant: false,
  },
  peintre: {
    label: "Peintre en batiment",
    aliases: ["peintre", "peinture", "painter", "decorateur"],
    osm: ['"craft"="painter"'],
    naf: ["43.34Z"],
    bookingRelevant: false,
  },
  couvreur: {
    label: "Couvreur",
    aliases: ["couvreur", "couverture", "toiture", "roofer", "zingueur"],
    osm: ['"craft"="roofer"'],
    naf: ["43.91A", "43.91B"],
    bookingRelevant: false,
  },
  serrurier: {
    label: "Serrurier",
    aliases: ["serrurier", "serrurerie", "locksmith"],
    osm: ['"craft"="locksmith"'],
    naf: ["43.32A", "80.20Z"],
    bookingRelevant: false,
  },
  paysagiste: {
    label: "Paysagiste / jardinier",
    aliases: ["paysagiste", "jardinier", "jardin", "espaces verts", "gardener"],
    osm: ['"craft"="gardener"', '"shop"="garden_centre"'],
    naf: ["81.30Z"],
    bookingRelevant: false,
  },
  artisan_batiment: {
    label: "Artisan du batiment",
    aliases: ["artisan", "batiment", "renovation", "travaux", "construction"],
    osm: ['"craft"="builder"', '"craft"="carpenter"', '"craft"="plasterer"', '"craft"="tiler"'],
    naf: ["43"],
    bookingRelevant: false,
  },
  coach_sportif: {
    label: "Coach sportif / salle de sport",
    aliases: ["coach", "coach sportif", "salle de sport", "fitness", "gym"],
    osm: ['"leisure"="fitness_centre"'],
    naf: ["85.51Z", "93.13Z"],
    bookingRelevant: true,
  },
  photographe: {
    label: "Photographe",
    aliases: ["photographe", "photographie", "photo"],
    osm: ['"shop"="photo"', '"craft"="photographer"'],
    naf: ["74.20Z"],
    bookingRelevant: true,
  },
  opticien: {
    label: "Opticien",
    aliases: ["opticien", "optique", "lunetier"],
    osm: ['"shop"="optician"'],
    naf: ["47.78A"],
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
  // Correspondance approchee, mais sur des MOTS entiers : sans cela,
  // « menage » matcherait dans « demenagement » et un demenageur serait
  // classe comme entreprise de nettoyage.
  for (const [key, def] of Object.entries(SECTORS)) {
    const all = [key, ...def.aliases].map(normalize);
    if (all.some((a) => a.length > 3 && contientMotEntier(needle, a))) {
      return { key, def };
    }
  }
  return null;
}

/**
 * `terme` apparait-il dans `texte` comme un mot entier ?
 *
 * Tolere le pluriel francais (« coiffeurs » reconnait « coiffeur ») mais pas
 * le fragment : « menage » ne doit pas matcher dans « demenagement ».
 */
function contientMotEntier(texte: string, terme: string): boolean {
  const echappe = terme.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(?:^|[^a-z0-9])${echappe}(?:s|x)?(?:[^a-z0-9]|$)`).test(texte);
}

export function listSectors() {
  return Object.entries(SECTORS).map(([key, def]) => ({ key, ...def }));
}

// ---------------------------------------------------------------------------
// OSSATURE GENERIQUE — la nomenclature NAF
//
// Les 32 secteurs ci-dessus sont *cures* : filtres OSM precis, alias soignes.
// Mais AMYN ne s'adresse pas a 32 metiers, il s'adresse aux entreprises
// francaises. Le moteur ne peut donc pas s'arreter a cette liste.
//
// Les divisions NAF ci-dessous couvrent l'ensemble du champ economique
// adressable. Un secteur inconnu de la liste curee ("cordonnier", "imprimeur",
// "torrefacteur"...) y trouve une correspondance et devient interrogeable via
// Sirene, meme sans filtre OSM.
//
// C'est ce qui rend la liste OUVERTE : ajouter un metier ne demande plus de
// toucher au code.
// ---------------------------------------------------------------------------

export type NafDivision = {
  /** Code de division NAF, deux chiffres. */
  code: string;
  label: string;
  /** Mots qui, dans une instruction, designent ce champ d'activite. */
  keywords: string[];
  /** Ce champ presente-t-il un interet commercial pour AMYN ? */
  addressable: boolean;
};

export const NAF_DIVISIONS: NafDivision[] = [
  { code: "10", label: "Industries alimentaires", keywords: ["alimentaire", "boulangerie", "patisserie", "boucherie", "charcuterie", "fromagerie", "torrefacteur", "brasseur"], addressable: true },
  { code: "13", label: "Textile", keywords: ["textile", "tissu", "couture", "confection"], addressable: true },
  { code: "16", label: "Travail du bois", keywords: ["bois", "menuiserie", "ebeniste", "charpente"], addressable: true },
  { code: "18", label: "Imprimerie", keywords: ["imprimerie", "imprimeur", "reprographie", "serigraphie"], addressable: true },
  { code: "25", label: "Fabrication metallique", keywords: ["metallerie", "ferronnerie", "chaudronnerie", "soudure"], addressable: true },
  { code: "31", label: "Fabrication de meubles", keywords: ["meuble", "ameublement", "agencement"], addressable: true },
  { code: "41", label: "Construction de batiments", keywords: ["construction", "promoteur", "batiment", "constructeur"], addressable: true },
  { code: "42", label: "Genie civil", keywords: ["genie civil", "travaux publics", "voirie"], addressable: true },
  { code: "43", label: "Travaux de construction specialises", keywords: ["artisan", "renovation", "travaux", "plomberie", "electricite", "maconnerie", "peinture", "couverture", "carrelage", "platrerie", "isolation", "chauffage", "climatisation", "piscine", "cuisiniste"], addressable: true },
  { code: "45", label: "Commerce et reparation automobile", keywords: ["automobile", "garage", "carrosserie", "concession", "moto", "pneu"], addressable: true },
  { code: "46", label: "Commerce de gros", keywords: ["grossiste", "commerce de gros", "negoce", "distributeur"], addressable: true },
  { code: "47", label: "Commerce de detail", keywords: ["commerce", "magasin", "boutique", "detail", "epicerie", "librairie", "bijouterie", "optique", "fleuriste", "quincaillerie"], addressable: true },
  { code: "49", label: "Transports terrestres", keywords: ["transport", "taxi", "vtc", "demenagement", "livraison", "ambulance"], addressable: true },
  { code: "55", label: "Hebergement", keywords: ["hotel", "hebergement", "camping", "gite", "auberge", "chambre d hotes"], addressable: true },
  { code: "56", label: "Restauration", keywords: ["restaurant", "restauration", "brasserie", "bar", "cafe", "traiteur", "pizzeria", "food truck", "creperie"], addressable: true },
  { code: "58", label: "Edition", keywords: ["edition", "editeur", "presse"], addressable: true },
  { code: "59", label: "Production audiovisuelle", keywords: ["audiovisuel", "video", "videaste", "production", "film", "montage"], addressable: true },
  { code: "62", label: "Programmation et conseil informatique", keywords: ["informatique", "developpement", "logiciel", "web", "infogerance", "depannage informatique"], addressable: true },
  { code: "68", label: "Activites immobilieres", keywords: ["immobilier", "agence immobiliere", "syndic", "gestion locative", "marchand de biens"], addressable: true },
  { code: "69", label: "Activites juridiques et comptables", keywords: ["avocat", "notaire", "juridique", "comptable", "expertise comptable", "commissaire aux comptes"], addressable: true },
  { code: "70", label: "Conseil de gestion", keywords: ["conseil", "consultant", "strategie", "management", "coaching entreprise"], addressable: true },
  { code: "71", label: "Architecture et ingenierie", keywords: ["architecte", "ingenierie", "bureau d etudes", "geometre", "diagnostic immobilier", "maitrise d oeuvre"], addressable: true },
  { code: "73", label: "Publicite et etudes de marche", keywords: ["publicite", "marketing", "communication", "agence de communication", "regie"], addressable: true },
  { code: "74", label: "Activites specialisees diverses", keywords: ["design", "graphiste", "photographe", "traduction", "decoration", "stylisme"], addressable: true },
  { code: "77", label: "Location", keywords: ["location", "loueur", "materiel"], addressable: true },
  { code: "79", label: "Agences de voyage", keywords: ["voyage", "agence de voyage", "tourisme", "guide"], addressable: true },
  { code: "80", label: "Securite", keywords: ["securite", "gardiennage", "serrurier", "alarme", "telesurveillance"], addressable: true },
  { code: "81", label: "Services aux batiments et paysage", keywords: ["nettoyage", "proprete", "menage", "paysagiste", "jardinier", "espaces verts", "entretien"], addressable: true },
  { code: "82", label: "Services administratifs aux entreprises", keywords: ["secretariat", "centre d appels", "evenementiel", "domiciliation"], addressable: true },
  { code: "85", label: "Enseignement", keywords: ["ecole", "formation", "enseignement", "auto ecole", "soutien scolaire", "cours"], addressable: true },
  { code: "86", label: "Activites pour la sante humaine", keywords: ["medecin", "dentiste", "kinesitherapeute", "infirmier", "sante", "cabinet medical", "osteopathe"], addressable: false },
  { code: "88", label: "Action sociale sans hebergement", keywords: ["creche", "aide a domicile", "garde d enfants", "assistance"], addressable: true },
  { code: "90", label: "Activites creatives et artistiques", keywords: ["artiste", "artisan d art", "galerie", "spectacle"], addressable: true },
  { code: "93", label: "Sport et loisirs", keywords: ["sport", "salle de sport", "fitness", "club", "loisirs", "danse", "yoga", "escalade"], addressable: true },
  { code: "95", label: "Reparation d objets", keywords: ["reparation", "cordonnier", "horloger", "reparateur"], addressable: true },
  { code: "96", label: "Autres services personnels", keywords: ["coiffure", "coiffeur", "esthetique", "beaute", "institut", "onglerie", "barbier", "toilettage", "pressing", "tatouage", "spa"], addressable: true },
];

/**
 * Termes qui designent une TAILLE ou un STATUT juridique, pas une activite.
 *
 * « PME », « TPE », « startup », « profession liberale » sont des criteres
 * reels et utiles — mais ils ne disent rien du metier. Les traiter comme des
 * secteurs conduirait a chercher « les PME » sans savoir quoi chercher.
 *
 * Ils seront exploitables comme filtres Sirene au lot 2 (tranche d'effectifs,
 * categorie juridique). En attendant, on les reconnait pour pouvoir le DIRE,
 * plutot que de repondre « inconnu ».
 */
const CRITERES_HORS_SECTEUR: Record<string, string> = {
  pme: "taille d'entreprise",
  tpe: "taille d'entreprise",
  eti: "taille d'entreprise",
  startup: "stade de developpement",
  "start up": "stade de developpement",
  "profession liberale": "statut juridique",
  "professions liberales": "statut juridique",
  liberal: "statut juridique",
  independant: "statut juridique",
  "auto entrepreneur": "statut juridique",
  "micro entreprise": "statut juridique",
  artisanat: "statut juridique",
  commercant: "statut juridique",
};

/** Resultat d'une resolution de secteur. Ne vaut jamais null. */
export type SectorMatch = {
  /**
   * CURATED — secteur cure : filtres OSM precis et codes NAF.
   * GENERIC — reconnu via la nomenclature NAF : interrogeable par Sirene,
   *           mais sans filtre OSM.
   * NOT_A_SECTOR — terme valide, mais qui designe une taille ou un statut
   *           juridique et non une activite. Il faut preciser le metier.
   * UNKNOWN — rien de reconnu. L'agent ne devine pas.
   */
  kind: "CURATED" | "GENERIC" | "NOT_A_SECTOR" | "UNKNOWN";
  key: string;
  label: string;
  osm: string[];
  naf: string[];
  bookingRelevant: boolean;
  sensitive: boolean;
  /** Comment la correspondance a ete etablie. Toujours renseigne. */
  matchedOn: string;
};

const AUCUNE_CORRESPONDANCE: SectorMatch = {
  kind: "UNKNOWN", key: "", label: "", osm: [], naf: [],
  bookingRelevant: false, sensitive: false,
  matchedOn: "Aucune correspondance dans les secteurs curés ni dans la nomenclature NAF.",
};

/**
 * Resolution OUVERTE d'un secteur.
 *
 * Contrairement a resolveSector(), qui ne connait que les secteurs cures et
 * renvoie null au-dela, celle-ci retombe sur la nomenclature NAF. Un metier
 * absent de la liste curee reste donc prospectable, sans modifier le code.
 *
 * Elle ne devine jamais : sans correspondance, le resultat est UNKNOWN et
 * l'appelant decide quoi en faire.
 */
export function resolveSectorOpen(input: string): SectorMatch {
  const brut = normalize(input);

  // Taille ou statut juridique : critere valide, mais pas une activite.
  // Teste en premier, sinon un alias de secteur pourrait le capter au passage.
  const horsSecteur = CRITERES_HORS_SECTEUR[brut];
  if (horsSecteur) {
    return {
      kind: "NOT_A_SECTOR", key: brut, label: input.trim(),
      osm: [], naf: [], bookingRelevant: false, sensitive: false,
      matchedOn:
        `« ${input.trim()} » désigne une ${horsSecteur}, pas une activité. ` +
        `Précisez le métier recherché — ce critère pourra ensuite affiner la sélection.`,
    };
  }

  const cure = resolveSector(input);
  if (cure) {
    return {
      kind: "CURATED",
      key: cure.key,
      label: cure.def.label,
      osm: cure.def.osm,
      naf: cure.def.naf,
      bookingRelevant: cure.def.bookingRelevant,
      sensitive: cure.def.sensitive ?? false,
      matchedOn: `Secteur curé « ${cure.key} ».`,
    };
  }

  const needle = normalize(input);
  if (!needle) return AUCUNE_CORRESPONDANCE;

  // Correspondance exacte sur un mot-cle de division, puis par inclusion.
  for (const exact of [true, false]) {
    for (const div of NAF_DIVISIONS) {
      const mots = div.keywords.map(normalize);
      const touche = exact
        ? mots.some((m) => m === needle)
        : mots.some((m) => m.length > 4 && (needle.includes(m) || m.includes(needle)));

      if (touche) {
        return {
          kind: "GENERIC",
          key: `naf_${div.code}`,
          label: div.label,
          osm: [],
          naf: [div.code],
          bookingRelevant: false,
          sensitive: !div.addressable,
          matchedOn: `Division NAF ${div.code} (${div.label})${exact ? "" : ", par rapprochement"}.`,
        };
      }
    }
  }

  // Un code NAF saisi directement : "56", "43.22A"...
  const codeDirect = /^(\d{2})(?:[.\s]?\d{0,2}[A-Z]?)?$/.exec(input.trim().toUpperCase());
  if (codeDirect) {
    const div = NAF_DIVISIONS.find((d) => d.code === codeDirect[1]);
    if (div) {
      return {
        kind: "GENERIC", key: `naf_${div.code}`, label: div.label,
        osm: [], naf: [input.trim().toUpperCase()],
        bookingRelevant: false, sensitive: !div.addressable,
        matchedOn: `Code NAF fourni directement (${input.trim()}).`,
      };
    }
  }

  return AUCUNE_CORRESPONDANCE;
}

/** Toutes les divisions NAF adressables, pour un balayage national. */
export function addressableDivisions(): NafDivision[] {
  return NAF_DIVISIONS.filter((d) => d.addressable);
}
