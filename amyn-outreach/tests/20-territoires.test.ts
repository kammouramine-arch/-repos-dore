// ---------------------------------------------------------------------------
// TERRITOIRES — planification, points de reprise, idempotence
//
// Ce que ces tests cherchent à prouver : qu'une coupure ne coûte rien, qu'une
// reprise ne refait rien, et qu'un territoire saturé ne se fait pas passer
// pour un territoire terminé.
// ---------------------------------------------------------------------------

import { test, describe, before, beforeEach } from "node:test";
import assert from "node:assert/strict";

import { prisma } from "@/lib/db";
import {
  planTerritories,
  resoudreZones,
  resoudreSecteurs,
  claimTerritory,
  pendingTerritories,
  territoryProgress,
  DELAI_REPRISE_MS,
} from "@/lib/territory";
import { sweepTerritory, sweepBatch, subdivideTerritory } from "@/lib/territory/sweep";
import { AnnuaireClient } from "@/lib/research/annuaire/client";
import { annuaireSimule, registreTest, type UniteSimulee } from "./annuaire-simule";
import { resetDatabase } from "./helpers";

const sansAttente = { attendre: async () => {}, delaiEntrePagesMs: 0 };

function clientAvec(registre: UniteSimulee[], options: { totalForce?: number } = {}) {
  const sim = annuaireSimule({ registre, ...options });
  return {
    client: new AnnuaireClient({ transport: sim.transport, ...sansAttente }),
    appels: sim.appels,
  };
}

before(async () => { await resetDatabase(); });
beforeEach(async () => { await resetDatabase(); });

describe("Découpage du territoire", () => {
  test("« la France » se traduit en 101 départements, jamais en une requête unique", () => {
    const { cibles } = resoudreZones(["France"]);
    assert.equal(cibles.length, 101);
    assert.ok(cibles.every((c) => c.scope === "DEPARTEMENT"));
  });

  test("aucune zone précisée revient au même : la France entière", () => {
    assert.equal(resoudreZones(undefined).cibles.length, 101);
    assert.equal(resoudreZones([]).cibles.length, 101);
  });

  test("une région devient ses départements", () => {
    const { cibles } = resoudreZones(["Hauts-de-France"]);
    assert.ok(cibles.length >= 5);
    assert.ok(cibles.some((c) => c.code === "59"));
  });

  test("un code commune est une maille valide", () => {
    const { cibles } = resoudreZones(["59350"]);
    assert.equal(cibles[0].scope, "COMMUNE");
  });

  test("une zone inconnue est signalée, pas devinée", () => {
    const { cibles, notes } = resoudreZones(["Atlantide"]);
    assert.equal(cibles.length, 0);
    assert.ok(notes.some((n) => /non reconnue/.test(n)));
  });

  test("sans secteur précisé, toutes les divisions NAF sont couvertes", () => {
    const { cellules } = resoudreSecteurs(undefined, true);
    assert.ok(cellules.length >= 30, `seulement ${cellules.length} divisions`);
    assert.ok(cellules.every((c) => c.key !== "ALL"));
  });

  test("le découpage sectoriel s'explique : sans lui, tout serait saturé", () => {
    const { notes } = resoudreSecteurs(undefined, true);
    assert.ok(notes.some((n) => /10 000/.test(n)));
  });

  test("un métier hors catalogue passe par la nomenclature NAF, pas par une liste fermée", () => {
    const { cellules } = resoudreSecteurs(["ébéniste"], true);
    assert.ok(cellules.length > 0);
  });
});

describe("Planification", () => {
  test("un département × trois secteurs donne trois territoires", async () => {
    const plan = await planTerritories({ zones: ["59"], secteurs: ["restaurant", "coiffeur", "boulangerie"] });
    assert.equal(plan.created, 3);
    assert.equal(await prisma.territory.count(), 3);
  });

  test("replanifier ne duplique rien et ne remet aucun avancement à zéro", async () => {
    await planTerritories({ zones: ["59"], secteurs: ["restaurant"] });
    const t = await prisma.territory.findFirstOrThrow();
    await prisma.territory.update({ where: { id: t.id }, data: { nextPage: 7, discovered: 150 } });

    const second = await planTerritories({ zones: ["59"], secteurs: ["restaurant"] });
    assert.equal(second.created, 0);
    assert.equal(second.existing, 1);

    const apres = await prisma.territory.findUniqueOrThrow({ where: { id: t.id } });
    assert.equal(apres.nextPage, 7, "l'avancement a été perdu");
    assert.equal(apres.discovered, 150);
  });

  test("deux sources ne se marchent pas dessus", async () => {
    await planTerritories({ zones: ["59"], secteurs: ["restaurant"], source: "ANNUAIRE" });
    await planTerritories({ zones: ["59"], secteurs: ["restaurant"], source: "SIRENE" });
    assert.equal(await prisma.territory.count(), 2);
  });
});

describe("Balayage et points de reprise", () => {
  test("le point de reprise est écrit après chaque page", async () => {
    await planTerritories({ zones: ["59"], secteurs: ["restaurant"] });
    const t = await prisma.territory.findFirstOrThrow();
    const { client } = clientAvec(registreTest(60));

    await sweepTerritory(t.id, { annuaire: client, maxPages: 2 });

    const apres = await prisma.territory.findUniqueOrThrow({ where: { id: t.id } });
    assert.equal(apres.nextPage, 3, "la reprise ne pointe pas la bonne page");
    assert.ok(apres.checkpointAt, "aucun point de reprise enregistré");
    assert.equal(apres.status, "PENDING", "un territoire non terminé ne doit pas être clos");
  });

  test("une coupure ne coûte au pire qu'une page : la reprise continue la suite", async () => {
    await planTerritories({ zones: ["59"], secteurs: ["restaurant"] });
    const t = await prisma.territory.findFirstOrThrow();
    const registre = registreTest(75);

    // Premier passage, interrompu au bout de deux pages.
    await sweepTerritory(t.id, { annuaire: clientAvec(registre).client, maxPages: 2 });
    const apresPremier = await prisma.prospect.count();
    assert.equal(apresPremier, 50);

    // Reprise : les 25 restants arrivent, et RIEN n'est réimporté.
    const second = await sweepTerritory(t.id, { annuaire: clientAvec(registre).client, maxPages: 5 });
    assert.equal(await prisma.prospect.count(), 75);
    assert.equal(second.created, 25, "la reprise a recréé des prospects déjà connus");
    assert.equal(second.status, "DONE");
  });

  test("rejouer un territoire terminé ne refait rien", async () => {
    await planTerritories({ zones: ["59"], secteurs: ["restaurant"] });
    const t = await prisma.territory.findFirstOrThrow();
    const registre = registreTest(30);

    await sweepTerritory(t.id, { annuaire: clientAvec(registre).client, maxPages: 10 });
    const compte = await prisma.prospect.count();

    const rejeu = await sweepTerritory(t.id, { annuaire: clientAvec(registre).client, maxPages: 10 });
    assert.equal(rejeu.created, 0);
    assert.equal(await prisma.prospect.count(), compte);
    assert.match(rejeu.summary, /déjà traité/);
  });

  test("les compteurs du territoire reflètent le travail réel", async () => {
    await planTerritories({ zones: ["59"], secteurs: ["restaurant"] });
    const t = await prisma.territory.findFirstOrThrow();
    const registre = registreTest(40);

    await sweepTerritory(t.id, { annuaire: clientAvec(registre).client, maxPages: 10 });
    const apres = await prisma.territory.findUniqueOrThrow({ where: { id: t.id } });

    assert.equal(apres.discovered, 40);
    assert.equal(apres.created, 40);
    assert.equal(apres.duplicates, 0);
  });

  test("les prospects découverts restent rattachés à leur territoire", async () => {
    await planTerritories({ zones: ["59"], secteurs: ["restaurant"] });
    const t = await prisma.territory.findFirstOrThrow();
    await sweepTerritory(t.id, { annuaire: clientAvec(registreTest(10)).client, maxPages: 5 });

    const rattaches = await prisma.prospect.count({ where: { territoryId: t.id } });
    assert.equal(rattaches, 10);
  });

  test("vues = nouvelles + doublons + écartées : rien ne disparaît en route", async () => {
    await planTerritories({ zones: ["59"], secteurs: ["restaurant"] });
    const t = await prisma.territory.findFirstOrThrow();

    // Un registre mêlant entreprises exploitables, unité non diffusible et
    // établissement hors activité : les trois issues possibles.
    const registre: UniteSimulee[] = [
      { siren: "111111111", siret: "11111111111111", nom: "Bistrot A", naf: "56.10A" },
      { siren: "222222222", siret: "22222222222222", nom: "Bistrot B", naf: "56.10A" },
      { siren: "333333333", siret: "33333333333333", nom: "Discrète", naf: "56.10A", statutDiffusion: "N" },
      { siren: "444444444", siret: "44444444444444", nom: "Entrepôt", naf: "56.10A", nafEtablissement: "52.10B" },
    ];

    const r = await sweepTerritory(t.id, { annuaire: clientAvec(registre).client, maxPages: 5 });

    assert.equal(
      r.discovered,
      r.created + r.duplicates + r.skipped,
      `${r.discovered} vues ≠ ${r.created} + ${r.duplicates} + ${r.skipped}`,
    );
    assert.equal(r.created, 2);
    assert.equal(r.skipped, 2, "les écartements à la conversion ne sont pas comptés");
  });

  test("chaque écartement du balayage porte un motif nommé", async () => {
    await planTerritories({ zones: ["59"], secteurs: ["restaurant"] });
    const t = await prisma.territory.findFirstOrThrow();
    const registre: UniteSimulee[] = [
      { siren: "333333333", siret: "33333333333333", nom: "Discrète", naf: "56.10A", statutDiffusion: "N" },
    ];

    const r = await sweepTerritory(t.id, { annuaire: clientAvec(registre).client, maxPages: 2 });
    const total = Object.values(r.skippedReasons).reduce((a, b) => a + b, 0);
    assert.equal(total, r.skipped, "un écartement sans motif");
    assert.ok(Object.keys(r.skippedReasons).some((m) => /diffusible/.test(m)));
  });

  test("un territoire saturé n'est PAS marqué terminé", async () => {
    await planTerritories({ zones: ["59"], secteurs: ["restaurant"] });
    const t = await prisma.territory.findFirstOrThrow();
    const { client } = clientAvec(registreTest(20), { totalForce: 10_000 });

    const r = await sweepTerritory(t.id, { annuaire: client, maxPages: 5 });
    assert.equal(r.status, "SATURATED");
    assert.notEqual(r.status, "DONE");
  });

  test("un échec est enregistré, le territoire n'est pas perdu", async () => {
    await planTerritories({ zones: ["59"], secteurs: ["restaurant"] });
    const t = await prisma.territory.findFirstOrThrow();
    const sim = annuaireSimule({ registre: registreTest(10), echecs: [400] });
    const client = new AnnuaireClient({ transport: sim.transport, ...sansAttente });

    const r = await sweepTerritory(t.id, { annuaire: client, maxPages: 2 });
    assert.equal(r.status, "FAILED");
    assert.ok(r.error);

    const apres = await prisma.territory.findUniqueOrThrow({ where: { id: t.id } });
    assert.equal(apres.errors, 1);
    assert.ok(apres.lastError);
  });
});

describe("Concurrence", () => {
  test("deux exécutions ne peuvent pas prendre le même territoire", async () => {
    await planTerritories({ zones: ["59"], secteurs: ["restaurant"] });
    const t = await prisma.territory.findFirstOrThrow();

    assert.equal(await claimTerritory(t.id), true);
    assert.equal(await claimTerritory(t.id), false, "deux exécutions ont pris le même territoire");
  });

  test("un territoire abandonné est repris, pas bloqué pour toujours", async () => {
    await planTerritories({ zones: ["59"], secteurs: ["restaurant"] });
    const t = await prisma.territory.findFirstOrThrow();

    const vieux = new Date(Date.now() - DELAI_REPRISE_MS - 60_000);
    await prisma.territory.update({
      where: { id: t.id },
      data: { status: "RUNNING", lastRunAt: vieux },
    });

    assert.equal(await claimTerritory(t.id), true, "un worker mort bloque le territoire à vie");
  });

  test("un balayage en cours n'est pas volé par un second worker", async () => {
    await planTerritories({ zones: ["59"], secteurs: ["restaurant"] });
    const t = await prisma.territory.findFirstOrThrow();
    await prisma.territory.update({
      where: { id: t.id },
      data: { status: "RUNNING", lastRunAt: new Date() },
    });

    const r = await sweepTerritory(t.id, { annuaire: clientAvec(registreTest(10)).client });
    assert.equal(r.claimed, false);
    assert.match(r.summary, /déjà pris/);
    assert.equal(await prisma.prospect.count(), 0);
  });
});

describe("Progression et lot", () => {
  test("le balayage par lot avance plusieurs territoires et rend la main", async () => {
    await planTerritories({ zones: ["59"], secteurs: ["restaurant", "coiffeur", "boulangerie"] });
    const { client } = clientAvec(registreTest(10));

    const { results } = await sweepBatch({ maxTerritories: 2, maxPages: 2, annuaire: client });
    assert.equal(results.length, 2);

    const restants = await pendingTerritories(10);
    assert.equal(restants.length, 1, "le troisième territoire devrait rester à faire");
  });

  test("la progression compte les territoires terminés ET saturés", async () => {
    await planTerritories({ zones: ["59"], secteurs: ["restaurant", "coiffeur"] });
    const tous = await prisma.territory.findMany();
    await prisma.territory.update({ where: { id: tous[0].id }, data: { status: "DONE" } });
    await prisma.territory.update({ where: { id: tous[1].id }, data: { status: "SATURATED" } });

    const p = await territoryProgress();
    assert.equal(p.termines, 2);
    assert.equal(p.restants, 0);
    assert.equal(p.progression, 100);
  });

  test("sans territoire planifié, la progression ne prétend pas être à 0 % — elle est nulle", async () => {
    const p = await territoryProgress();
    assert.equal(p.total, 0);
    assert.equal(p.progression, null);
  });
});

describe("Subdivision d'un territoire saturé", () => {
  test("les sous-territoires viennent des codes postaux réellement observés", async () => {
    await planTerritories({ zones: ["59"], secteurs: ["restaurant"] });
    const t = await prisma.territory.findFirstOrThrow();

    const registre: UniteSimulee[] = [
      { siren: "111111111", siret: "11111111111111", nom: "A", codePostal: "59000" },
      { siren: "222222222", siret: "22222222222222", nom: "B", codePostal: "59100" },
      { siren: "333333333", siret: "33333333333333", nom: "C", codePostal: "59000" },
    ];
    await sweepTerritory(t.id, { annuaire: clientAvec(registre).client, maxPages: 5 });

    const r = await subdivideTerritory(t.id);
    assert.equal(r.created, 2, "un sous-territoire par code postal distinct");
    assert.deepEqual(r.codes, ["59000", "59100"]);
  });

  test("subdiviser sans avoir rien balayé ne fabrique rien", async () => {
    await planTerritories({ zones: ["59"], secteurs: ["restaurant"] });
    const t = await prisma.territory.findFirstOrThrow();
    const r = await subdivideTerritory(t.id);
    assert.equal(r.created, 0);
    assert.match(r.note, /Aucun code postal/);
  });

  test("la limite de la subdivision est dite, pas masquée", async () => {
    await planTerritories({ zones: ["59"], secteurs: ["restaurant"] });
    const t = await prisma.territory.findFirstOrThrow();
    await sweepTerritory(t.id, { annuaire: clientAvec(registreTest(5)).client, maxPages: 2 });
    const r = await subdivideTerritory(t.id);
    assert.match(r.note, /sans garantie d'exhaustivité/);
  });
});
