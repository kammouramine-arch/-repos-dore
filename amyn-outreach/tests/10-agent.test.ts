// AGENT — comprehension des instructions, planification, et permissions.
import { test, describe, beforeEach, after } from "node:test";
import assert from "node:assert/strict";

import { prisma } from "@/lib/db";
import { parseInstruction, planActions, runAgent, INTENTS } from "@/lib/agent";
import { getAutonomy, setAutonomy, autonomyMatrix } from "@/lib/agent/autonomy";
import { DEFAULT_AUTONOMY } from "@/lib/constants";
import { resetDatabase } from "./helpers";

describe("Compréhension des instructions", () => {
  test("reconnaît une recherche avec ville, secteur et nombre", () => {
    const parsed = parseInstruction("Trouve 20 coiffeurs à Lille");
    assert.equal(parsed.intent, "SEARCH");
    assert.equal(parsed.parameters.limit, 20);
    assert.equal(parsed.parameters.city, "Lille");
    assert.deepEqual(parsed.parameters.sectors, ["coiffeur"]);
    assert.ok(parsed.matchedOn.length > 0, "aucune trace du raisonnement");
  });

  test("reconnaît un nouveau client avec son offre", () => {
    const parsed = parseInstruction(
      "Nouveau client. Entreprise : Studio Nord. Offre : PREMIUM. Prends le relais.",
    );
    assert.equal(parsed.intent, "NEW_CLIENT");
    assert.equal(String(parsed.parameters.offer).toUpperCase(), "PREMIUM");
  });

  test("reconnaît les autres intentions courantes", () => {
    const cases: Array<[string, string]> = [
      ["Audite les prospects", "AUDIT"],
      ["Cherche les emails professionnels", "CONTACT"],
      ["Prépare les emails", "DRAFT"],
      ["Prépare une campagne pour Lille", "CAMPAIGN"],
      ["Fais le point", "STATUS"],
    ];
    for (const [instruction, expected] of cases) {
      assert.equal(parseInstruction(instruction).intent, expected, instruction);
    }
  });

  test("ne devine pas une intention qu'il ne comprend pas", () => {
    const parsed = parseInstruction("azerty qwerty foobar");
    assert.equal(parsed.intent, "UNKNOWN");
    assert.ok(parsed.explanation.length > 10, "aucune explication du refus");
  });

  test("toute intention reconnue appartient au catalogue", () => {
    const parsed = parseInstruction("Trouve 10 restaurants à Roubaix");
    assert.ok((INTENTS as readonly string[]).includes(parsed.intent));
  });
});

describe("Planification", () => {
  test("chaque action planifiée est décrite et motivée", () => {
    for (const instruction of [
      "Trouve 20 coiffeurs à Lille",
      "Audite les prospects",
      "Prépare une campagne pour Lille",
    ]) {
      const actions = planActions(parseInstruction(instruction));
      assert.ok(actions.length > 0, instruction);
      for (const action of actions) {
        assert.ok(action.description.length > 5, `${action.type} sans description`);
        assert.ok(action.rationale && action.rationale.length > 5, `${action.type} sans motif`);
        assert.ok(action.module.length > 0);
      }
    }
  });

  test("une instruction incomprise ne produit aucune action", () => {
    assert.equal(planActions(parseInstruction("azerty qwerty")).length, 0);
  });

  test("le pipeline complet enchaîne plusieurs modules", () => {
    const actions = planActions(
      parseInstruction("Trouve 20 coiffeurs à Lille, analyse leurs sites et prépare les emails"),
    );
    const modules = new Set(actions.map((a) => a.module));
    assert.ok(modules.size >= 2, "le plan ne traverse qu'un seul module");
  });
});

describe("Permissions", () => {
  beforeEach(async () => { await resetDatabase(); });
  after(async () => { await prisma.$disconnect(); });

  test("aucun envoi n'est automatique — la règle APPROVE & SEND est câblée", async () => {
    for (const action of ["campaign.send", "campaign.followup", "send.test"]) {
      assert.equal(await getAutonomy(action), "APPROVAL_REQUIRED", action);
    }
  });

  test("signature de contrat et paiement ne sont jamais automatisables par défaut", async () => {
    for (const action of ["document.sign_contract", "payment.charge", "payment.refund"]) {
      assert.equal(await getAutonomy(action), "APPROVAL_REQUIRED", action);
    }
  });

  test("chaque action planifiable a un niveau d'autonomie déclaré", () => {
    const planned = new Set<string>();
    for (const instruction of [
      "Trouve 20 coiffeurs à Lille",
      "Audite les prospects",
      "Cherche les emails",
      "Priorise les prospects",
      "Prépare les emails",
      "Prépare une campagne pour Lille",
      "Envoie les emails",
      "Relance les prospects",
      "Nouveau client. Entreprise : X. Offre : PREMIUM",
      "Où en est le projet",
      "Avance le projet",
      "Le prospect a répondu",
      "Fais le point",
      "Trouve 20 coiffeurs à Lille, analyse leurs sites et prépare les emails",
    ]) {
      for (const action of planActions(parseInstruction(instruction))) planned.add(action.type);
    }
    assert.ok(planned.size > 5, "trop peu d'actions couvertes : test à revoir");
    for (const type of planned) {
      assert.ok(DEFAULT_AUTONOMY[type], `aucun niveau déclaré pour ${type}`);
    }
  });

  test("les actions par défaut sont toutes classées", () => {
    for (const [action, level] of Object.entries(DEFAULT_AUTONOMY)) {
      assert.ok(
        level === "AUTOMATIC" || level === "APPROVAL_REQUIRED",
        `niveau invalide pour ${action} : ${level}`,
      );
    }
  });

  test("le niveau se règle en base sans redéploiement", async () => {
    assert.equal(await getAutonomy("audit.run"), "AUTOMATIC");
    await setAutonomy("audit.run", "APPROVAL_REQUIRED");
    assert.equal(await getAutonomy("audit.run"), "APPROVAL_REQUIRED");

    const matrix = await autonomyMatrix();
    const row = matrix.find((r) => r.action === "audit.run");
    assert.equal(row?.overridden, true);
  });

  test("une action inconnue exige une validation (refus par défaut)", async () => {
    assert.equal(await getAutonomy("ACTION_INEXISTANTE"), "APPROVAL_REQUIRED");
  });
});

describe("Exécution", () => {
  beforeEach(async () => { await resetDatabase(); });

  test("une instruction incomprise est tracée et explique ce qu'il faut faire", async () => {
    const result = await runAgent("azerty qwerty foobar");
    assert.equal(result.status, "FAILED");
    assert.ok(result.needsFromYou.length > 0);

    const run = await prisma.agentRun.findUniqueOrThrow({ where: { id: result.runId } });
    assert.equal(run.intent, "UNKNOWN");
    assert.equal(run.status, "FAILED");
  });

  test("une action exigeant validation s'arrête et le dit", async () => {
    await setAutonomy("status.report", "APPROVAL_REQUIRED");
    const result = await runAgent("Fais le point");

    assert.ok(
      result.actions.some((a) => a.status === "WAITING_APPROVAL"),
      "aucune action n'attend de validation",
    );
    assert.ok(result.needsFromYou.some((n) => /validation/i.test(n)));
  });

  test("une exécution autorisée est tracée avec ses actions", async () => {
    const result = await runAgent("Fais le point");
    const actions = await prisma.agentAction.findMany({ where: { agentRunId: result.runId } });
    assert.ok(actions.length > 0, "aucune action enregistrée");
    for (const a of actions) {
      assert.ok(a.description.length > 5);
      assert.ok(["AUTOMATIC", "APPROVAL_REQUIRED"].includes(a.autonomy));
    }
  });

  test("l'agent ne touche jamais aux prospects DEMO en traitement groupé", async () => {
    const source = await import("node:fs/promises").then((fs) =>
      fs.readFile(new URL("../lib/agent/executors.ts", import.meta.url), "utf8"),
    );
    const bulkQueries = source.match(/prisma\.prospect\.(findMany|updateMany|count)\(/g) ?? [];
    assert.ok(bulkQueries.length > 0, "aucune requête groupée trouvée : test à revoir");
    assert.ok(
      source.includes("isDemo: false"),
      "les requêtes groupées ne filtrent pas les prospects DEMO",
    );
  });
});
