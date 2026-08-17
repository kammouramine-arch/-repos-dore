// RECHERCHE — resolution des secteurs, normalisation, deduplication.
import { test, describe } from "node:test";
import assert from "node:assert/strict";

import { resolveSector, listSectors, SECTORS } from "@/lib/research/sectors";
import { normalizeName, sourceStatus, SOURCES } from "@/lib/research";

describe("Secteurs", () => {
  test("chaque secteur declare au moins une requete OSM et un libelle", () => {
    for (const [key, def] of Object.entries(SECTORS)) {
      assert.ok(def.label.length > 0, `${key} sans libellé`);
      assert.ok(Array.isArray(def.osm) && def.osm.length > 0, `${key} sans tag OSM`);
    }
  });

  test("resout un secteur ecrit avec accents, majuscules ou pluriel", () => {
    for (const input of ["coiffeur", "Coiffeurs", "COIFFEUR", "salon de coiffure"]) {
      const resolved = resolveSector(input);
      assert.ok(resolved, `« ${input} » aurait dû être reconnu`);
    }
  });

  test("ne resout pas un secteur inconnu — aucune invention", () => {
    assert.equal(resolveSector("fabricant de fusées orbitales"), null);
  });

  test("listSectors expose tous les secteurs", () => {
    assert.equal(listSectors().length, Object.keys(SECTORS).length);
  });
});

describe("Deduplication", () => {
  test("normalizeName neutralise casse, accents et ponctuation", () => {
    assert.equal(normalizeName("Salon Éclat"), normalizeName("salon eclat"));
    assert.equal(normalizeName("Le  Bistrot-du-Nord"), normalizeName("le bistrot du nord"));
  });

  test("deux entreprises differentes ne sont pas confondues", () => {
    assert.notEqual(normalizeName("Salon Éclat"), normalizeName("Salon Éclair"));
  });
});

describe("Sources", () => {
  test("au moins une source est utilisable sans cle API", () => {
    const usable = sourceStatus().filter((s) => s.available);
    assert.ok(usable.length >= 1, "aucune source disponible sans clé");
    assert.ok(usable.some((s) => s.id === "osm"), "OpenStreetMap devrait être disponible");
  });

  test("une source indisponible dit exactement ce qui manque", () => {
    for (const s of sourceStatus()) {
      if (!s.available) {
        assert.ok(s.missing && s.missing.length > 0, `${s.id} indisponible sans indiquer ce qui manque`);
      }
    }
  });

  test("toutes les sources implementent le contrat", () => {
    for (const s of SOURCES) {
      assert.equal(typeof s.id, "string");
      assert.equal(typeof s.search, "function");
      assert.equal(typeof s.availability, "function");
    }
  });
});
