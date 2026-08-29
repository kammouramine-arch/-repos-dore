// ---------------------------------------------------------------------------
// TABLEAU DE BORD NATIONAL
//
// La propriété testée ici est inhabituelle mais essentielle : le tableau doit
// distinguer « zéro » de « je ne sais pas ». Un tableau qui affiche 0 réponse
// alors que la boîte n'est pas lue ne se trompe pas de chiffre — il se trompe
// de nature, et transforme une lacune en bonne nouvelle.
// ---------------------------------------------------------------------------

import { test, describe, before, beforeEach } from "node:test";
import assert from "node:assert/strict";

import { prisma } from "@/lib/db";
import { nationalReport, flatten } from "@/lib/reporting/national";
import { planTerritories } from "@/lib/territory";
import { sweepTerritory } from "@/lib/territory/sweep";
import { AnnuaireClient } from "@/lib/research/annuaire/client";
import { annuaireSimule, registreTest } from "./annuaire-simule";
import { resetDatabase, seedProspect } from "./helpers";

const sansAttente = { attendre: async () => {}, delaiEntrePagesMs: 0 };

before(async () => { await resetDatabase(); });
beforeEach(async () => { await resetDatabase(); });

async function balayer(n: number) {
  await planTerritories({ zones: ["59"], secteurs: ["restaurant"] });
  const t = await prisma.territory.findFirstOrThrow();
  const sim = annuaireSimule({ registre: registreTest(n) });
  await sweepTerritory(t.id, {
    annuaire: new AnnuaireClient({ transport: sim.transport, ...sansAttente }),
    maxPages: 20,
  });
  return t;
}

describe("Une donnée non mesurée ne s'affiche pas comme un zéro", () => {
  test("sans balayage planifié, la progression n'est pas « 0 % » mais « non mesurée »", async () => {
    const r = await nationalReport();
    const plat = flatten(r);
    assert.equal(plat.progress, null, "une progression inconnue s'affiche comme 0 %");
    assert.equal(plat.territories_done, null);
    assert.equal(plat.territories_left, null);
  });

  test("chaque métrique non mesurée explique pourquoi", async () => {
    const r = await nationalReport();
    for (const groupe of r.groups) {
      for (const m of groupe.metrics) {
        if (m.value === null) {
          assert.ok(
            m.indisponible && m.indisponible.length > 10,
            `${m.key} est non mesurée sans dire pourquoi`,
          );
        }
      }
    }
  });

  test("une métrique mesurée ne porte jamais de motif d'indisponibilité", async () => {
    await balayer(10);
    const r = await nationalReport();
    for (const groupe of r.groups) {
      for (const m of groupe.metrics) {
        if (m.value !== null) {
          assert.equal(m.indisponible, undefined, `${m.key} est mesurée ET déclarée indisponible`);
        }
      }
    }
  });

  test("sans boîte configurée, les réponses ne sont pas comptées à zéro", async () => {
    const r = await nationalReport();
    const plat = flatten(r);
    assert.equal(plat.replies, null, "« 0 réponse » alors que personne ne lit la boîte");
    assert.equal(plat.bounces, null);
  });

  test("un vrai zéro reste un zéro : aucun email préparé, c'est mesurable", async () => {
    const r = await nationalReport();
    assert.equal(flatten(r).prepared, 0);
  });
});

describe("Les chiffres sont réels", () => {
  test("les entreprises découvertes correspondent au nombre en base", async () => {
    await balayer(40);
    const plat = flatten(await nationalReport());
    assert.equal(plat.discovered, 40);
    assert.equal(plat.discovered, await prisma.prospect.count({ where: { isDemo: false } }));
  });

  test("les prospects de démonstration sont exclus et le rapport le dit", async () => {
    await seedProspect({ isDemo: true });
    await seedProspect({ isDemo: false });

    const r = await nationalReport();
    assert.equal(r.demoExclus, 1);
    assert.equal(flatten(r).discovered, 1);
  });

  test("les doublons apparaissent comme doublons", async () => {
    const t = await balayer(30);
    // Second balayage du même territoire : tout est déjà connu.
    await prisma.territory.update({
      where: { id: t.id },
      data: { status: "PENDING", nextPage: 1, lastRunAt: null },
    });
    const sim = annuaireSimule({ registre: registreTest(30) });
    await sweepTerritory(t.id, {
      annuaire: new AnnuaireClient({ transport: sim.transport, ...sansAttente }),
      maxPages: 20,
    });

    const plat = flatten(await nationalReport());
    assert.equal(plat.duplicates, 30);
    assert.equal(plat.discovered, 30, "les doublons ont été comptés comme nouvelles entreprises");
  });

  test("les compteurs de qualification reflètent l'état réel", async () => {
    const p1 = await seedProspect({});
    const p2 = await seedProspect({});
    await prisma.prospect.update({ where: { id: p1.id }, data: { qualification: "QUALIFIED" } });
    await prisma.prospect.update({ where: { id: p2.id }, data: { qualification: "NEEDS_HUMAN" } });

    const plat = flatten(await nationalReport());
    assert.equal(plat.qualified, 1);
    assert.equal(plat.needs_human, 1);
    assert.equal(plat.not_qualified, 0);
  });

  test("les SIRET découverts sont comptés", async () => {
    await balayer(15);
    assert.equal(flatten(await nationalReport()).siret, 15);
  });
});

describe("Alertes", () => {
  test("un territoire saturé déclenche une alerte, il ne passe pas inaperçu", async () => {
    await planTerritories({ zones: ["59"], secteurs: ["restaurant"] });
    const t = await prisma.territory.findFirstOrThrow();
    await prisma.territory.update({ where: { id: t.id }, data: { status: "SATURATED" } });

    const r = await nationalReport();
    assert.ok(r.alerts.some((a) => /satur/i.test(a)), "un territoire saturé n'a alerté personne");
  });

  test("un territoire en échec est signalé", async () => {
    await planTerritories({ zones: ["59"], secteurs: ["restaurant"] });
    const t = await prisma.territory.findFirstOrThrow();
    await prisma.territory.update({ where: { id: t.id }, data: { status: "FAILED" } });

    const r = await nationalReport();
    assert.ok(r.alerts.some((a) => /échec/i.test(a)));
  });

  test("un territoire saturé n'est pas compté comme restant à faire, ni comme réussi", async () => {
    await planTerritories({ zones: ["59"], secteurs: ["restaurant", "coiffeur"] });
    const tous = await prisma.territory.findMany();
    await prisma.territory.update({ where: { id: tous[0].id }, data: { status: "SATURATED" } });

    const plat = flatten(await nationalReport());
    assert.equal(plat.territories_saturated, 1);
    assert.equal(plat.territories_left, 1, "le territoire restant n'est pas correctement compté");
  });
});

describe("Structure du rapport", () => {
  test("tous les compteurs demandés sont présents", async () => {
    const plat = flatten(await nationalReport());
    const attendus = [
      "discovered", "recent", "duplicates",
      "territories_done", "territories_left",
      "audited", "websites", "emails_found", "emails_valid",
      "qualified", "not_qualified", "needs_human",
      "prepared", "approved", "sent", "ready_to_send", "excluded",
      "followups_scheduled", "autopilot", "daily_limit", "circuit_breaker",
      "replies", "replies_positive", "replies_negative", "optouts", "bounces",
      "followups_ready", "followups_sent",
    ];
    for (const cle of attendus) {
      assert.ok(cle in plat, `compteur manquant : ${cle}`);
    }
  });

  test("le tableau dit si l'envoi automatique est armé", async () => {
    const { setPolicy } = await import("@/lib/policy");
    const avant = await nationalReport();
    assert.equal(flatten(avant).autopilot, 0, "l'envoi automatique est armé par défaut");
    assert.equal(avant.alerts.some((a) => /ARMÉ/.test(a)), false);

    await setPolicy("autoSendEnabled", true);
    const apres = await nationalReport();
    assert.equal(flatten(apres).autopilot, 1);
    assert.ok(
      apres.alerts.some((a) => /ARMÉ/.test(a)),
      "un envoi automatique armé doit être signalé en évidence",
    );
    await setPolicy("autoSendEnabled", false);
  });

  test("aucune clé de métrique n'est dupliquée entre les groupes", async () => {
    const r = await nationalReport();
    const cles = r.groups.flatMap((g) => g.metrics.map((m) => m.key));
    assert.equal(new Set(cles).size, cles.length, "deux métriques portent la même clé");
  });
});
