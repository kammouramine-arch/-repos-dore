// ---------------------------------------------------------------------------
// LANCEMENT RÉEL — contrôle de cohérence, pilote, reporting, délivrabilité.
//
// Ces tests portent sur les GARDE-FOUS du passage en production : ce que le
// système refuse de faire quand la configuration n'est pas saine.
// ---------------------------------------------------------------------------

import { test, describe, beforeEach, after } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { join, resolve } from "node:path";

import { prisma } from "@/lib/db";
import { config } from "@/lib/config";
import { preflight, PILOT_MAX_PROSPECTS, PILOT_THRESHOLD } from "@/lib/launch/preflight";
import { preparePilot } from "@/lib/launch/pilot";
import { buildReport, missionReport } from "@/lib/reporting";
import { setPolicy, POLICY_DEFAULTS } from "@/lib/policy";
import { runCampaign } from "@/lib/campaign";
import { resetDatabase, seedProspect, seedProvenIssue } from "./helpers";

const ROOT = resolve(import.meta.dirname, "..");

/** Prospect complet, qualifiable : source, audit, score, email. */
async function prospectQualifiable(nom: string, email: string) {
  const p = await seedProspect({ name: nom, email, status: "AUDITED" });
  await seedProvenIssue(p.id);
  await prisma.prospect.update({
    where: { id: p.id },
    data: { auditStatus: "COMPLETE", overallScore: 72, recommendedOffer: "PREMIUM", recommendedPrice: 1290 },
  });
  return p;
}

// === CONTRÔLE AVANT LANCEMENT ===============================================

describe("Contrôle avant lancement", () => {
  beforeEach(async () => { await resetDatabase(); });
  after(async () => { await prisma.$disconnect(); });

  test("en simulation, la configuration est cohérente et l'envoi réel impossible", async () => {
    const r = await preflight();
    assert.equal(r.mode, "SIMULATION");
    assert.equal(r.canSendForReal, false, "un envoi réel serait possible en mode simulation");
    assert.equal(r.coherent, true, `points bloquants : ${r.blockers.map((b) => b.label).join(", ")}`);
  });

  test("chaque point non conforme dit quoi faire", async () => {
    const r = await preflight();
    for (const c of r.checks) {
      assert.ok(c.detail.length > 15, `${c.id} : explication trop courte`);
      if (c.level === "BLOCK") {
        assert.ok(c.fix, `${c.id} bloque sans dire comment le corriger`);
      }
    }
  });

  test("une politique incohérente bloque le lancement", async () => {
    // Fenêtre vide : ouverture après la fermeture.
    await setPolicy("sendWindowStartHour", 20);
    await setPolicy("sendWindowEndHour", 8);

    const r = await preflight();
    assert.equal(r.coherent, false, "une fenêtre d'envoi vide n'a pas été détectée");
    assert.ok(r.blockers.some((b) => b.id === "policy"));
  });

  test("un délai d'envoi absurde bloque le lancement", async () => {
    await setPolicy("minDelaySeconds", 1);
    const r = await preflight();
    assert.equal(r.coherent, false);
    assert.ok(r.blockers.some((b) => b.id === "policy" && /rafale/i.test(b.detail)));
  });

  test("un plafond démesuré bloque le lancement", async () => {
    await setPolicy("dailyLimit", 5000);
    const r = await preflight();
    assert.equal(r.coherent, false);
    assert.ok(r.blockers.some((b) => b.id === "policy" && /réputation/i.test(b.detail)));
  });

  test("un nombre de relances excessif bloque le lancement", async () => {
    await setPolicy("maxFollowUps", 10);
    const r = await preflight();
    assert.equal(r.coherent, false);
    assert.ok(r.blockers.some((b) => /harcèlement/i.test(b.detail)));
  });

  test("un délai de recontact trop court bloque le lancement", async () => {
    await setPolicy("recontactCooldownDays", 3);
    const r = await preflight();
    assert.equal(r.coherent, false);
  });

  test("la politique par défaut est cohérente", async () => {
    const r = await preflight();
    assert.ok(
      !r.blockers.some((b) => b.id === "policy"),
      "les valeurs par défaut ne passent pas leur propre contrôle",
    );
  });

  test("le seuil de phase pilote est bas et le plafond pilote encore plus bas", () => {
    assert.ok(PILOT_MAX_PROSPECTS <= 10, `plafond pilote trop élevé : ${PILOT_MAX_PROSPECTS}`);
    assert.ok(PILOT_THRESHOLD >= PILOT_MAX_PROSPECTS);
  });

  test("la réponse automatique activée est signalée comme un avertissement", async () => {
    await setPolicy("autoReplyEnabled", true);
    const r = await preflight();
    assert.ok(r.warnings.some((w) => w.id === "auto_reply"), "l'activation n'est pas signalée");
  });
});

// === CAMPAGNE PILOTE ========================================================

describe("Campagne pilote", () => {
  beforeEach(async () => { await resetDatabase(); });

  test("le plafond en dur ne peut pas être dépassé", async () => {
    for (let i = 0; i < PILOT_MAX_PROSPECTS + 5; i += 1) {
      await prospectQualifiable(`Salon Pilote ${i}`, `contact@pilote-${i}.fr`);
    }

    // On demande volontairement bien plus que le plafond.
    const plan = await preparePilot({ max: 100 });
    assert.equal(plan.ok, true, plan.summary);
    assert.ok(
      plan.selected.length <= PILOT_MAX_PROSPECTS,
      `${plan.selected.length} prospects retenus, plafond ${PILOT_MAX_PROSPECTS}`,
    );
  });

  test("le pilote refuse de démarrer si la configuration est incohérente", async () => {
    await prospectQualifiable("Salon Bloqué", "contact@bloque.fr");
    await setPolicy("sendWindowStartHour", 22);
    await setPolicy("sendWindowEndHour", 6);

    const plan = await preparePilot();
    assert.equal(plan.ok, false);
    assert.ok(plan.blockers.length > 0);
    assert.match(plan.summary, /refusé/i);
  });

  test("le pilote n'inclut jamais un prospect en opposition", async () => {
    await prospectQualifiable("Salon OK", "contact@ok-pilote.fr");
    const bloque = await prospectQualifiable("Salon Stop", "contact@stop-pilote.fr");
    const { addToSuppressionList } = await import("@/lib/campaign/compliance");
    await addToSuppressionList({ email: "contact@stop-pilote.fr", reason: "UNSUBSCRIBED", source: "test" });

    const plan = await preparePilot();
    assert.ok(!plan.selected.some((s) => s.id === bloque.id), "un prospect en opposition a été retenu");
    assert.ok(plan.rejected.some((r) => r.name === "Salon Stop"));
  });

  test("le pilote n'inclut jamais un prospect déjà contacté", async () => {
    const dejaVu = await prospectQualifiable("Salon Déjà", "contact@deja-pilote.fr");
    await prisma.sendLog.create({
      data: {
        prospectId: dejaVu.id, transport: "dry-run", status: "SIMULATED",
        dryRun: true, toEmail: "contact@deja-pilote.fr", subject: "Premier email",
      },
    });
    await prospectQualifiable("Salon Neuf", "contact@neuf-pilote.fr");

    const plan = await preparePilot();
    assert.ok(!plan.selected.some((s) => s.id === dejaVu.id), "un prospect déjà contacté a été retenu");
  });

  test("le pilote n'inclut jamais un prospect sans email", async () => {
    const sansEmail = await seedProspect({ name: "Salon Sans Email", email: null, status: "AUDITED" });
    await seedProvenIssue(sansEmail.id);
    await prospectQualifiable("Salon Avec Email", "contact@avec-pilote.fr");

    const plan = await preparePilot();
    assert.ok(!plan.selected.some((s) => s.id === sansEmail.id));
  });

  test("les emails du pilote attendent l'approbation, aucun n'est pré-approuvé", async () => {
    await prospectQualifiable("Salon Attente", "contact@attente-pilote.fr");
    const plan = await preparePilot();
    assert.equal(plan.ok, true, plan.summary);

    const drafts = await prisma.emailDraft.findMany({
      where: { campaignId: plan.campaignId!, isActive: true },
    });
    assert.ok(drafts.length > 0, "aucun email préparé");
    for (const d of drafts) {
      assert.equal(d.approvedAt, null, "un email du pilote est pré-approuvé");
    }
  });

  test("la campagne pilote plafonne aussi son propre volume", async () => {
    await prospectQualifiable("Salon Cap", "contact@cap-pilote.fr");
    const plan = await preparePilot({ max: 2 });
    const campagne = await prisma.campaign.findUniqueOrThrow({ where: { id: plan.campaignId! } });
    assert.ok(campagne.dailyLimit <= PILOT_MAX_PROSPECTS);
    assert.equal(campagne.maxFollowUps, 0, "un pilote ne doit pas relancer");
  });

  test("sans prospect qualifié, le pilote explique quoi faire", async () => {
    const plan = await preparePilot();
    assert.equal(plan.ok, false);
    assert.ok(plan.nextSteps.some((n) => /mission/i.test(n)), plan.nextSteps.join(" | "));
  });
});

// === REPORTING ==============================================================

describe("Reporting", () => {
  beforeEach(async () => { await resetDatabase(); });

  test("un taux sans base de calcul vaut « indisponible », jamais 0 %", async () => {
    const r = await buildReport();
    assert.equal(r.reponses.tauxReponse.value, null, "un taux a été inventé sans envoi réel");
    assert.equal(r.reponses.tauxReponse.denominator, 0);
  });

  test("le rapport dit ce qu'il ne peut pas mesurer", async () => {
    const r = await buildReport();
    assert.ok(r.nonMesure.length > 0);
    assert.ok(
      r.nonMesure.some((n) => /ouvertures|clics/i.test(n)),
      "le rapport ne signale pas l'absence de mesure d'ouverture",
    );
  });

  test("les envois simulés ne comptent pas comme des envois réels", async () => {
    const p = await prospectQualifiable("Salon Report", "contact@report.fr");
    await prisma.sendLog.create({
      data: {
        prospectId: p.id, transport: "dry-run", status: "SIMULATED",
        dryRun: true, toEmail: "contact@report.fr", subject: "Simulé",
      },
    });

    const r = await buildReport();
    assert.equal(r.envois.reels, 0, "un envoi simulé est compté comme réel");
    assert.equal(r.envois.simules, 1);
    assert.equal(r.reponses.tauxReponse.value, null, "un taux a été calculé sur des simulations");
    assert.ok(r.nonMesure.some((n) => /simulé/i.test(n)));
  });

  test("un taux réel est calculé quand la base existe", async () => {
    const p = await prospectQualifiable("Salon Réel", "contact@reel.fr");
    for (let i = 0; i < 4; i += 1) {
      await prisma.sendLog.create({
        data: {
          prospectId: p.id, transport: "smtp", status: "SENT",
          dryRun: false, toEmail: "contact@reel.fr", subject: `Réel ${i}`,
        },
      });
    }
    await prisma.reply.create({
      data: { prospectId: p.id, fromEmail: "contact@reel.fr", subject: "Re:", body: "ok", classification: "INTERESTED" },
    });

    const r = await buildReport();
    assert.equal(r.envois.reels, 4);
    assert.equal(r.reponses.tauxReponse.value, 25, "taux de réponse incorrect");
    assert.equal(r.reponses.tauxReponse.denominator, 4);
  });

  test("le bilan d'une mission sans campagne le dit au lieu d'inventer", async () => {
    const m = await prisma.mission.create({
      data: { brief: "Test", status: "PARTIAL", summary: "rien" },
    });
    const bilan = await missionReport(m.id);
    assert.equal(bilan.contactes, 0);
    assert.ok(bilan.note, "aucune explication donnée");
  });
});

// === DÉLIVRABILITÉ ==========================================================

describe("Délivrabilité", () => {
  test("le module ne promet jamais l'arrivée en boîte principale", async () => {
    const src = await readFile(join(ROOT, "lib/deliverability/index.ts"), "utf8");
    assert.match(src, /ne garantissent\s+" \+\s+"?pas|ne garantissent pas/i);
    assert.ok(!/garantit l'arrivée|garantie de délivrabilité/i.test(src));
  });

  test("chaque enregistrement manquant indique exactement quoi poser", async () => {
    const { checkDeliverability } = await import("@/lib/deliverability");
    // Domaine réservé aux tests : ne résout jamais, donc tout est manquant.
    const r = await checkDeliverability("exemple-inexistant.invalid");
    for (const c of r.checks) {
      if (c.status === "MISSING") {
        assert.ok(c.fix, `${c.id} manquant sans instruction`);
        assert.ok(c.fix!.host.length > 0 && c.fix!.type.length > 0 && c.fix!.value.length > 0);
      }
    }
    assert.ok(r.disclaimer.length > 40);
  });
});

// === GARDE-FOUS DU CHEMIN RÉEL ==============================================

describe("Garde-fous du chemin réel", () => {
  beforeEach(async () => { await resetDatabase(); });

  test("DRY_RUN reste actif dans l'environnement de test", () => {
    assert.equal(config.dryRun, true, "les tests tournent avec l'envoi réel autorisé");
  });

  test("une campagne lancée en simulation ne passe pas par le verrou de cohérence", async () => {
    // En simulation on doit pouvoir tester même avec une politique imparfaite.
    await setPolicy("dailyLimit", 5000);
    const campagne = await prisma.campaign.create({
      data: { name: "Sim", slug: `sim-${Date.now()}`, fromEmail: "contact@amyn.agency", fromName: "AMYN" },
    });
    // Ne doit pas lever : la simulation reste utilisable.
    const r = await runCampaign(campagne.id);
    assert.equal(r.sent, 0);
  });

  test("le verrou de cohérence est bien câblé sur le chemin d'envoi réel", async () => {
    const src = await readFile(join(ROOT, "lib/campaign/index.ts"), "utf8");
    assert.ok(src.includes("preflight"), "runCampaign n'appelle pas le contrôle de cohérence");
    const garde = src.indexOf("if (!config.dryRun)");
    const envoi = src.indexOf("sendOne(");
    assert.ok(garde > 0 && garde < envoi, "le contrôle ne précède pas l'envoi");
  });

  test("le module de lancement n'envoie rien lui-même", async () => {
    for (const f of ["lib/launch/preflight.ts", "lib/launch/pilot.ts", "lib/reporting/index.ts"]) {
      const src = await readFile(join(ROOT, f), "utf8");
      assert.ok(!/sendOne\(|runCampaign\(|sendMail\(/.test(src), `${f} peut déclencher un envoi`);
    }
  });

  test("aucun secret ne transite par le contrôle avant lancement", async () => {
    const temoin = "MOT-DE-PASSE-TEMOIN-7b2c";
    const avant = process.env.SMTP_PASSWORD;
    process.env.SMTP_PASSWORD = temoin;
    try {
      const r = await preflight();
      assert.ok(!JSON.stringify(r).includes(temoin), "le mot de passe SMTP apparaît dans le rapport");
    } finally {
      if (avant === undefined) delete process.env.SMTP_PASSWORD;
      else process.env.SMTP_PASSWORD = avant;
    }
  });

  test("les valeurs par défaut de la politique restent prudentes", () => {
    assert.ok(POLICY_DEFAULTS.dailyLimit <= 50, "plafond par défaut trop élevé");
    assert.ok(POLICY_DEFAULTS.minDelaySeconds >= 60, "délai par défaut trop court");
    assert.equal(POLICY_DEFAULTS.autoReplyEnabled, false);
    assert.equal(POLICY_DEFAULTS.sendOnWeekends, false);
  });
});
