// ---------------------------------------------------------------------------
// ATTESTATION DKIM
//
// La vérification DNS est une devinette : on teste une liste de sélecteurs, et
// aucune liste n'est exhaustive. Un en-tête réel, lui, rapporte ce qu'un
// serveur destinataire a effectivement vérifié — une preuve d'un ordre
// supérieur à notre sondage.
//
// Ce que ces tests protègent : que l'attestation remplace le contrôle DKIM
// SANS jamais toucher aux autres, et qu'elle reste visible partout où le
// contrôle DKIM se serait affiché. Une dérogation invisible serait pire que
// pas de contrôle du tout.
// ---------------------------------------------------------------------------

import { test, describe, before, beforeEach } from "node:test";
import assert from "node:assert/strict";

import { prisma } from "@/lib/db";
import {
  recordDkimAttestation, readDkimAttestation, clearDkimAttestation,
  resumeAttestation, ageEnJours, PEREMPTION_JOURS,
} from "@/lib/deliverability/attestation";
import { autopilotGate } from "@/lib/campaign/autopilot";
import { setPolicy } from "@/lib/policy";
import type { DeliverabilityReport } from "@/lib/deliverability";
import { resetDatabase } from "./helpers";

const MARDI_10H = new Date("2026-09-01T10:00:00");

/** Rapport DNS simulé : aucun test n'interroge le réseau. */
function dns(dkim: boolean): () => Promise<DeliverabilityReport> {
  return async () => ({
    domain: "amyn.agency", ready: dkim, summary: "", disclaimer: "",
    checks: [
      { id: "mx", label: "MX", status: "OK", found: [], detail: "4 MX." },
      { id: "spf", label: "SPF", status: "OK", found: [], detail: "SPF correct." },
      { id: "dmarc", label: "DMARC", status: "OK", found: [], detail: "DMARC présent." },
      {
        id: "dkim", label: "DKIM", status: dkim ? "OK" : "MISSING", found: [],
        detail: dkim ? "Signature active." : "Aucune clé DKIM trouvée.",
      },
    ],
  }) as unknown as Promise<DeliverabilityReport>;
}

const DOMAINE = "amyn.agency";

before(async () => { await resetDatabase(); });
beforeEach(async () => {
  await resetDatabase();
  await prisma.setting.deleteMany();
});

describe("Enregistrement du constat", () => {
  test("une attestation conserve sa note, son auteur et sa date", async () => {
    const a = await recordDkimAttestation({ domain: DOMAINE, note: "Gmail : DKIM PASS, d=amyn.agency" });
    assert.equal(a.domain, DOMAINE);
    assert.match(a.note, /DKIM PASS/);
    assert.equal(a.by, "HUMAN");
    assert.ok(Date.parse(a.at) > 0, "la date d'attestation est illisible");
  });

  test("elle se relit telle qu'elle a été posée", async () => {
    await recordDkimAttestation({ domain: DOMAINE, note: "constat du jour" });
    const relu = await readDkimAttestation(DOMAINE);
    assert.equal(relu?.note, "constat du jour");
  });

  test("une attestation posée pour un AUTRE domaine ne vaut pas ici", async () => {
    await recordDkimAttestation({ domain: "autre-domaine.fr", note: "PASS ailleurs" });
    assert.equal(await readDkimAttestation(DOMAINE), null);
  });

  test("elle est journalisée : une dérogation ne doit pas être discrète", async () => {
    await recordDkimAttestation({ domain: DOMAINE, note: "Gmail PASS" });
    const trace = await prisma.activityLog.findFirst({
      where: { action: "deliverability.dkim_attested" },
    });
    assert.ok(trace, "l'attestation n'a laissé aucune trace");
    assert.equal(trace!.level, "WARN");
  });

  test("elle peut être retirée, et le retrait est tracé", async () => {
    await recordDkimAttestation({ domain: DOMAINE, note: "Gmail PASS" });
    assert.equal(await clearDkimAttestation(), true);
    assert.equal(await readDkimAttestation(DOMAINE), null);

    const trace = await prisma.activityLog.count({
      where: { action: "deliverability.dkim_attestation_cleared" },
    });
    assert.equal(trace, 1);
  });

  test("retirer une attestation absente ne casse rien", async () => {
    assert.equal(await clearDkimAttestation(), false);
  });
});

describe("Ce que l'attestation affiche", () => {
  test("le résumé nomme la date, l'auteur et le constat", async () => {
    const a = await recordDkimAttestation({ domain: DOMAINE, note: "Gmail : DKIM PASS" });
    const texte = resumeAttestation(a);
    assert.match(texte, /ATTESTÉ/);
    assert.match(texte, /Gmail : DKIM PASS/);
    assert.match(texte, /HUMAN/);
    assert.match(texte, /Non trouvé dans le DNS/, "le résumé doit rappeler que le DNS est muet");
  });

  test("une attestation ancienne demande à être reconfirmée", async () => {
    const a = await recordDkimAttestation({ domain: DOMAINE, note: "vieux constat" });
    const plusTard = new Date(Date.parse(a.at) + (PEREMPTION_JOURS + 5) * 24 * 3600_000);

    assert.ok(ageEnJours(a, plusTard) >= PEREMPTION_JOURS);
    assert.match(resumeAttestation(a, plusTard), /reconfirmer/);
  });

  test("une attestation récente ne réclame rien", async () => {
    const a = await recordDkimAttestation({ domain: DOMAINE, note: "constat frais" });
    assert.doesNotMatch(resumeAttestation(a), /reconfirmer/);
  });
});

describe("Effet sur le sas d'envoi automatique", () => {
  test("sans attestation ni DKIM, le contrôle échoue", async () => {
    await setPolicy("autoSendEnabled", true);
    const g = await autopilotGate({ now: MARDI_10H, deliverabilite: dns(false) });
    const dkim = g.checks.find((c) => c.id === "dkim");
    assert.match(dkim!.detail, /Aucune clé DKIM/);
    assert.doesNotMatch(dkim!.detail, /ATTESTÉ/);
  });

  test("avec attestation, le contrôle DKIM passe — et dit sur quoi il s'appuie", async () => {
    await setPolicy("autoSendEnabled", true);
    await recordDkimAttestation({ domain: DOMAINE, note: "Gmail : DKIM PASS, d=amyn.agency" });

    const g = await autopilotGate({ now: MARDI_10H, deliverabilite: dns(false) });
    const dkim = g.checks.find((c) => c.id === "dkim");
    assert.equal(dkim?.ok, true);
    assert.match(dkim!.detail, /ATTESTÉ/, "le sas s'ouvre sans dire pourquoi");
    assert.match(dkim!.detail, /Gmail/);
  });

  test("un DKIM trouvé en DNS prime : l'attestation n'est pas consultée", async () => {
    await setPolicy("autoSendEnabled", true);
    await recordDkimAttestation({ domain: DOMAINE, note: "constat ancien" });

    const g = await autopilotGate({ now: MARDI_10H, deliverabilite: dns(true) });
    const dkim = g.checks.find((c) => c.id === "dkim");
    assert.match(dkim!.detail, /Signature active/);
    assert.doesNotMatch(dkim!.detail, /ATTESTÉ/);
  });

  test("L'ATTESTATION NE LÈVE QUE LE CONTRÔLE DKIM", async () => {
    // Le point qui compte : une dérogation sur un contrôle ne doit pas
    // ouvrir les autres. Ici l'automatisme reste désarmé.
    await recordDkimAttestation({ domain: DOMAINE, note: "Gmail : DKIM PASS" });

    const g = await autopilotGate({ now: MARDI_10H, deliverabilite: dns(false) });
    assert.equal(g.autorise, false, "l'attestation a ouvert le sas à elle seule");
    assert.equal(g.checks.find((c) => c.id === "arme")?.ok, false);
  });

  test("la fenêtre horaire reste opposable malgré l'attestation", async () => {
    await setPolicy("autoSendEnabled", true);
    await recordDkimAttestation({ domain: DOMAINE, note: "Gmail : DKIM PASS" });

    const dimanche = new Date("2026-08-30T10:00:00");
    const g = await autopilotGate({ now: dimanche, deliverabilite: dns(false) });
    assert.equal(g.autorise, false);
    assert.equal(g.checks.find((c) => c.id === "fenetre")?.ok, false);
  });

  test("le plafond quotidien reste opposable malgré l'attestation", async () => {
    await setPolicy("autoSendEnabled", true);
    await setPolicy("dailyLimit", 0);
    await recordDkimAttestation({ domain: DOMAINE, note: "Gmail : DKIM PASS" });

    const g = await autopilotGate({ now: MARDI_10H, deliverabilite: dns(false) });
    assert.equal(g.checks.find((c) => c.id === "quota")?.ok, false);
    assert.equal(g.autorise, false);
  });
});
