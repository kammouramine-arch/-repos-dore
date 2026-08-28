// ---------------------------------------------------------------------------
// LOT 1 — SECTEURS OUVERTS
//
// Le moteur ne doit plus être enfermé dans une liste fermée de métiers ni dans
// une liste fermée de villes. Ces tests vérifient l'ouverture ET le fait que
// l'ouverture n'a rien assoupli : un métier inconnu reste inconnu.
// ---------------------------------------------------------------------------

import { test, describe } from "node:test";
import assert from "node:assert/strict";

import {
  SECTORS, NAF_DIVISIONS, listSectors, addressableDivisions,
  resolveSector, resolveSectorOpen,
} from "@/lib/research/sectors";
import { parseInstruction } from "@/lib/agent/intents";

// === CATALOGUE ==============================================================

describe("Catalogue des secteurs", () => {
  test("chaque secteur curé porte des codes NAF", () => {
    for (const [cle, def] of Object.entries(SECTORS)) {
      assert.ok(Array.isArray(def.naf) && def.naf.length > 0, `${cle} sans code NAF`);
      for (const code of def.naf) {
        assert.match(code, /^\d{2}(\.\d{2}[A-Z]?)?$/, `${cle} : code NAF mal formé « ${code} »`);
      }
    }
  });

  test("chaque division NAF a un code à deux chiffres et des mots-clés", () => {
    for (const d of NAF_DIVISIONS) {
      assert.match(d.code, /^\d{2}$/, `division mal formée : ${d.code}`);
      assert.ok(d.keywords.length >= 2, `division ${d.code} sans vocabulaire`);
      assert.ok(d.label.length > 3);
    }
  });

  test("les codes de division sont uniques", () => {
    const codes = NAF_DIVISIONS.map((d) => d.code);
    assert.equal(new Set(codes).size, codes.length, "division NAF dupliquée");
  });

  test("les secteurs à encadrement particulier sont marqués", () => {
    const sante = SECTORS.sante;
    assert.ok(sante, "le secteur santé devrait exister");
    assert.equal(sante.sensitive, true, "les professions de santé ne sont pas marquées sensibles");
  });

  test("le catalogue couvre nettement plus que les 20 métiers d'origine", () => {
    assert.ok(listSectors().length >= 30, `seulement ${listSectors().length} secteurs`);
    assert.ok(addressableDivisions().length >= 30);
  });
});

// === RÉSOLUTION OUVERTE =====================================================

describe("Résolution ouverte des secteurs", () => {
  test("les métiers demandés sont tous reconnus", () => {
    const demandes = [
      "restaurants", "cafés", "hôtels", "boulangeries", "commerces", "garages",
      "concessionnaires", "artisans", "plombiers", "électriciens", "couvreurs",
      "rénovation", "nettoyage", "paysagistes", "agences immobilières",
      "architectes", "photographes", "instituts de beauté", "coiffeurs",
      "barbiers", "salles de sport", "studios", "écoles privées",
      "centres de formation",
    ];
    const inconnus = demandes.filter((d) => resolveSectorOpen(d).kind === "UNKNOWN");
    assert.deepEqual(inconnus, [], `non reconnus : ${inconnus.join(", ")}`);
  });

  test("taille et statut juridique sont reconnus SANS être pris pour des secteurs", () => {
    // « PME » et « profession libérale » sont des critères réels, mais ils ne
    // disent rien du métier. Les traiter comme des secteurs ferait chercher
    // « les PME » sans savoir quoi chercher.
    for (const terme of ["PME", "TPE", "professions libérales", "startup", "auto entrepreneur"]) {
      const r = resolveSectorOpen(terme);
      assert.equal(r.kind, "NOT_A_SECTOR", `« ${terme} » → ${r.kind}`);
      assert.equal(r.naf.length, 0, `« ${terme} » ne doit produire aucun code NAF`);
      assert.match(r.matchedOn, /Précisez le métier/i, `« ${terme} » sans explication utile`);
    }
  });

  test("BUG · « déménagement » n'est pas une entreprise de ménage", () => {
    // L'alias « menage » matchait à l'intérieur de « demenagement » : un
    // déménageur était classé comme entreprise de nettoyage.
    const r = resolveSectorOpen("déménagement");
    assert.notEqual(r.key, "nettoyage", "un déménageur est classé comme nettoyage");
    assert.equal(r.kind, "GENERIC");

    // Le vrai « ménage » doit continuer de fonctionner.
    assert.equal(resolveSectorOpen("ménage").key, "nettoyage");
  });

  test("un métier absent du catalogue curé passe par la nomenclature NAF", () => {
    for (const metier of ["cordonnier", "torréfacteur", "taxi", "crèche", "horloger", "déménagement"]) {
      const r = resolveSectorOpen(metier);
      assert.equal(r.kind, "GENERIC", `${metier} → ${r.kind}`);
      assert.ok(r.naf.length > 0, `${metier} sans code NAF`);
      assert.ok(r.matchedOn.length > 10, `${metier} sans explication`);
    }
  });

  test("un code NAF saisi directement est accepté", () => {
    for (const code of ["56", "43", "43.22A"]) {
      const r = resolveSectorOpen(code);
      assert.notEqual(r.kind, "UNKNOWN", `code ${code} rejeté`);
      assert.ok(r.naf.length > 0);
    }
  });

  test("l'ouverture n'invente rien : l'absurde reste UNKNOWN", () => {
    for (const absurde of ["fabricant de fusées orbitales", "élevage de licornes", "zzzz"]) {
      const r = resolveSectorOpen(absurde);
      assert.equal(r.kind, "UNKNOWN", `« ${absurde} » a été rattaché à ${r.label}`);
      assert.equal(r.naf.length, 0);
    }
  });

  test("resolveSector garde son contrat d'origine", () => {
    // Les modules de scoring et de qualification en dépendent : un secteur
    // inconnu doit toujours renvoyer null, pas une correspondance générique.
    assert.equal(resolveSector("fabricant de fusées orbitales"), null);
    assert.ok(resolveSector("coiffeur"));
    // Un métier générique n'est PAS un secteur curé.
    assert.equal(resolveSector("cordonnier"), null);
    assert.equal(resolveSectorOpen("cordonnier").kind, "GENERIC");
  });

  test("un secteur curé garde ses filtres OSM, un générique n'en a pas", () => {
    const cure = resolveSectorOpen("coiffeur");
    assert.equal(cure.kind, "CURATED");
    assert.ok(cure.osm.length > 0);

    const generique = resolveSectorOpen("cordonnier");
    assert.equal(generique.osm.length, 0, "un secteur générique ne peut pas avoir de filtre OSM");
  });

  test("la santé est reconnue mais signalée comme sensible", () => {
    const r = resolveSectorOpen("dentistes");
    assert.notEqual(r.kind, "UNKNOWN");
    assert.equal(r.sensitive, true, "les professions de santé ne sont pas signalées");
  });
});

// === INSTRUCTIONS ===========================================================

describe("Instructions : secteurs et villes ouverts", () => {
  test("le vocabulaire vient du catalogue, pas d'une liste en dur", () => {
    // Un métier ajouté au catalogue doit être reconnu dans une instruction
    // sans qu'on touche à l'analyseur.
    for (const [instruction, attendu] of [
      ["Prospecte les hôtels à Nice", "hotel"],
      ["Prospecte les agences immobilières à Bordeaux", "immobiliere"],
      ["Prospecte les salles de sport à Marseille", "sport"],
      ["Prospecte les écoles privées à Nantes", "ecole"],
      ["Prospecte les cordonniers à Strasbourg", "cordonnier"],
    ] as const) {
      const p = parseInstruction(instruction);
      const secteurs = (p.parameters.sectors as string[] | undefined) ?? [];
      assert.ok(
        secteurs.some((s) => s.includes(attendu)),
        `« ${instruction} » → [${secteurs.join(", ")}], attendu « ${attendu} »`,
      );
    }
  });

  test("une instruction ne produit pas deux fois le même secteur", () => {
    const p = parseInstruction("Prospecte les agences immobilières à Bordeaux");
    const secteurs = (p.parameters.sectors as string[] | undefined) ?? [];
    assert.equal(secteurs.length, 1, `secteurs redondants : [${secteurs.join(", ")}]`);
  });

  test("BUG · « à Ville » était invisible : \\b ne matche pas devant « à »", () => {
    // « à » n'est pas un caractère \w, donc \b ne produit aucune frontière
    // devant lui. Le motif d'origine ne reconnaissait que « a Ville » sans
    // accent — ce que personne n'écrit.
    for (const ville of ["Bordeaux", "Marseille", "Nantes", "Toulouse", "Nice"]) {
      const p = parseInstruction(`Prospecte les restaurants à ${ville}`);
      assert.equal(p.parameters.city, ville, `« à ${ville} » non reconnu`);
    }
  });

  test("les villes ne sont plus limitées à la métropole lilloise", () => {
    const villes = [
      "Bordeaux", "Marseille", "Lyon", "Nantes", "Toulouse", "Strasbourg",
      "Rennes", "Montpellier", "Nice", "Grenoble", "Dijon", "Angers",
    ];
    for (const v of villes) {
      const p = parseInstruction(`Prospecte les restaurants à ${v}`);
      assert.equal(p.parameters.city, v, `${v} non reconnue`);
    }
  });

  test("les noms composés et accentués sont conservés entiers", () => {
    for (const v of ["Villeneuve-d'Ascq", "Saint-Étienne", "Aix-en-Provence", "Le Havre"]) {
      const p = parseInstruction(`Prospecte les garages à ${v}`);
      assert.equal(p.parameters.city, v, `${v} tronquée ou non reconnue`);
    }
  });

  test("un mot courant derrière « à » n'est pas pris pour une ville", () => {
    for (const texte of ["Prospecte les restaurants à partir de demain", "Prospecte à nouveau"]) {
      const p = parseInstruction(texte);
      const ville = p.parameters.city as string | undefined;
      assert.ok(
        ville === undefined || /^[A-ZÀ-Ý]/.test(ville),
        `fausse ville retenue : « ${ville} » dans « ${texte} »`,
      );
    }
  });
});
