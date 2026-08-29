// ---------------------------------------------------------------------------
// EXECUTEURS — le lien entre une action planifiee et le module qui la realise.
//
// Chaque executeur delegue au module metier. L'agent ne reimplemente rien :
// il coordonne. Ajouter une capacite = ajouter un executeur ici.
// ---------------------------------------------------------------------------

import { prisma } from "@/lib/db";
import { config } from "@/lib/config";
import { searchAndImport } from "@/lib/research";
import { auditProspect } from "@/lib/audit/persist";
import { discoverContacts } from "@/lib/contact/discover";
import { scoreProspect } from "@/lib/scoring";
import { generateEmail } from "@/lib/email/generate";
import {
  createCampaign,
  addProspectsToCampaign,
  prepareCampaign,
  runCampaign,
  sendTestEmail,
} from "@/lib/campaign";
import { prepareFollowUps } from "@/lib/campaign/followup";
import { createClientFromProspect, projectStatus, advanceProject } from "@/lib/crm";
import { recordReply } from "@/lib/replies";
import type { PlannedAction, RunContext } from "./index";

export async function executeAction(
  action: PlannedAction,
  context: RunContext = { prospectIds: [] },
): Promise<unknown> {
  const input = action.input as Record<string, never>;

  /**
   * Cible d'une action de masse : les prospects issus de l'etape precedente
   * si elle en a produit, sinon une requete. Les fiches DEMO sont toujours
   * exclues des actions de l'agent.
   */
  const scoped = context.prospectIds.length > 0 ? { id: { in: context.prospectIds } } : {};

  switch (action.type) {
    // --- RECHERCHE ---------------------------------------------------------
    case "research.search": {
      const sectors = (input.sectors as unknown as string[]) ?? [];
      if (sectors.length === 0) {
        return {
          skipped: true,
          reason: "Aucun secteur précisé dans l'instruction.",
          needsFromYou: [
            "Précisez au moins un secteur. Exemple : « Trouve 20 coiffeurs à Lille ».",
          ],
        };
      }
      const result = await searchAndImport({
        city: (input.city as unknown as string) ?? "Lille",
        sectors,
        limit: (input.limit as unknown as number) ?? 10,
      });
      context.prospectIds = result.prospects.map((p) => p.id);
      return {
        found: result.found,
        created: result.created,
        duplicates: result.duplicates,
        source: result.sourceId,
        notes: result.notes,
        prospects: result.prospects.slice(0, 10),
      };
    }

    // --- BALAYAGE NATIONAL -------------------------------------------------
    //
    // Ces deux executeurs decouvrent des entreprises. Ils ne qualifient pas,
    // ne redigent pas, n'approuvent pas et n'envoient pas : la prospection
    // nationale entre par le meme tuyau que le reste, en amont de tous les
    // controles, jamais a cote.
    case "territory.plan": {
      const { planTerritories } = await import("@/lib/territory");
      const zone = input.zone as unknown as string | undefined;
      const secteurs = (input.sectors as unknown as string[]) ?? undefined;

      const plan = await planTerritories({
        zones: zone ? [zone] : undefined,
        secteurs,
      });

      return {
        created: plan.created,
        existing: plan.existing,
        notes: plan.notes,
        needsFromYou:
          plan.created + plan.existing === 0
            ? ["Aucun territoire n'a pu être planifié : la zone demandée n'a pas été reconnue."]
            : [],
      };
    }

    case "territory.sweep": {
      const { sweepBatch } = await import("@/lib/territory/sweep");
      const { territoryProgress } = await import("@/lib/territory");

      const { results, summary } = await sweepBatch({ maxTerritories: 3, maxPages: 4 });
      const progression = await territoryProgress();

      const satures = results.filter((r) => r.status === "SATURATED");

      return {
        summary,
        territoires: results.length,
        decouvertes: results.reduce((n, r) => n + r.discovered, 0),
        nouvelles: results.reduce((n, r) => n + r.created, 0),
        doublons: results.reduce((n, r) => n + r.duplicates, 0),
        progression,
        needsFromYou: satures.map(
          (r) =>
            `${r.label} / ${r.sectorLabel} est saturé : la source a cessé de servir des ` +
            `résultats. Subdiviser pour ne pas laisser d'entreprises de côté — ` +
            `npm run amyn -- territory subdivide ${r.territoryId}`,
        ),
      };
    }

    // --- AUDIT -------------------------------------------------------------
    case "audit.run": {
      const limit = (input.limit as unknown as number) ?? 10;
      const targets = await prisma.prospect.findMany({
        where: {
          ...scoped,
          isDemo: false,
          auditStatus: "PENDING",
          status: { notIn: ["OPTOUT", "WON", "LOST"] },
        },
        orderBy: { createdAt: "desc" },
        take: limit,
      });

      const results = [];
      for (const p of targets) {
        try {
          const audit = await auditProspect(p.id);
          results.push({
            name: p.name,
            status: audit.report.status,
            problems: audit.issuesCreated,
            checks: audit.report.stats.rulesRun,
          });
        } catch (err) {
          results.push({ name: p.name, status: "FAILED", error: (err as Error).message });
        }
      }
      return { audited: results.length, results };
    }

    // --- CONTACTS ----------------------------------------------------------
    case "contact.discover": {
      const limit = (input.limit as unknown as number) ?? 10;
      const targets = await prisma.prospect.findMany({
        where: {
          ...scoped,
          isDemo: false,
          primaryContactId: null,
          website: { not: null },
          status: { notIn: ["OPTOUT", "WON", "LOST"] },
        },
        orderBy: { createdAt: "desc" },
        take: limit,
      });

      let withEmail = 0;
      let blocked = 0;
      const details = [];
      for (const p of targets) {
        try {
          const result = await discoverContacts(p.id);
          if (result.blocked) {
            blocked += 1;
            details.push({ name: p.name, blocked: true, reason: result.reason });
          } else {
            withEmail += 1;
            details.push({ name: p.name, email: result.found[0]?.email, method: result.found[0]?.discoveryMethod });
          }
        } catch (err) {
          blocked += 1;
          details.push({ name: p.name, blocked: true, reason: (err as Error).message });
        }
      }
      return { checked: targets.length, withEmail, blocked, details: details.slice(0, 15) };
    }

    // --- SCORING -----------------------------------------------------------
    case "scoring.compute": {
      const limit = (input.limit as unknown as number) ?? 50;
      const targets = await prisma.prospect.findMany({
        where: { ...scoped, isDemo: false, auditStatus: { not: "PENDING" } },
        orderBy: { updatedAt: "desc" },
        take: limit,
      });
      const scored = [];
      for (const p of targets) {
        const s = await scoreProspect(p.id);
        scored.push({ name: p.name, overall: s.overallScore, offer: s.recommendedOffer });
      }
      scored.sort((a, b) => b.overall - a.overall);
      return { scored: scored.length, top: scored.slice(0, 10) };
    }

    // --- EMAILS ------------------------------------------------------------
    case "email.generate": {
      const limit = (input.limit as unknown as number) ?? 10;
      const targets = await prisma.prospect.findMany({
        where: {
          ...scoped,
          isDemo: false,
          primaryContactId: { not: null },
          issues: { some: {} },
          status: { in: ["AUDITED", "RESEARCHED", "READY"] },
        },
        orderBy: { overallScore: "desc" },
        take: limit,
      });

      let generated = 0;
      let refused = 0;
      const details = [];
      for (const p of targets) {
        try {
          const email = await generateEmail(p.id);
          if (email.verification.passed) generated += 1;
          else refused += 1;
          details.push({
            name: p.name,
            subject: email.subject,
            passed: email.verification.passed,
            problems: email.verification.problems,
            generator: email.generator,
          });
        } catch (err) {
          refused += 1;
          details.push({ name: p.name, passed: false, problems: [(err as Error).message] });
        }
      }
      return { generated, refused, details: details.slice(0, 10) };
    }

    // --- CAMPAGNE ----------------------------------------------------------
    case "campaign.create": {
      const city = (input.city as unknown as string) ?? "Lille";
      const sectors = (input.sectors as unknown as string[]) ?? [];
      const limit = (input.limit as unknown as number) ?? 50;

      const campaign = await createCampaign({
        name: `${sectors.join(" / ") || "Prospection"} — ${city} — ${new Date().toLocaleDateString("fr-FR")}`,
        targetCriteria: { city, sectors, limit },
      });

      const eligible = await prisma.prospect.findMany({
        where: {
          ...(context.prospectIds.length > 0
            ? { id: { in: context.prospectIds } }
            : { city: { contains: city } }),
          primaryContactId: { not: null },
          issues: { some: {} },
          status: { in: ["AUDITED", "READY"] },
          isDemo: false,
        },
        orderBy: { overallScore: "desc" },
        take: limit,
      });

      context.campaignId = campaign.id;
      const added = await addProspectsToCampaign(campaign.id, eligible.map((p) => p.id));
      const prepared = await prepareCampaign(campaign.id);

      return {
        campaignId: campaign.id,
        campaignName: campaign.name,
        added,
        prepared: prepared.prepared,
        blocked: prepared.blocked,
        blockedReasons: prepared.blockedReasons,
        needsFromYou:
          prepared.prepared > 0
            ? [
                `${prepared.prepared} email(s) prêt(s) dans « ${campaign.name} ». Relisez-les puis approuvez : npm run amyn -- campaign approve ${campaign.slug}`,
              ]
            : [],
      };
    }

    case "campaign.send": {
      const campaign = await prisma.campaign.findFirst({
        where: { status: { in: ["READY", "RUNNING"] } },
        orderBy: { createdAt: "desc" },
      });
      if (!campaign) {
        return { skipped: true, reason: "Aucune campagne prête.", needsFromYou: ["Créez d'abord une campagne."] };
      }
      const result = await runCampaign(campaign.id, { max: (input.limit as unknown as number) ?? undefined });
      return {
        campaign: campaign.name,
        ...result,
        dryRun: config.dryRun,
        needsFromYou: config.dryRun
          ? ["DRY_RUN=true : les envois ont été simulés. Pour envoyer réellement, voir la section « Passer à l'envoi réel » du README."]
          : [],
      };
    }

    case "campaign.followup": {
      const result = await prepareFollowUps();
      return { prepared: result.prepared, skipped: result.skipped.slice(0, 10) };
    }

    // --- ENVOI TEST --------------------------------------------------------
    case "send.test": {
      const to = (input.email as unknown as string) ?? config.from.email;
      const result = await sendTestEmail(to);
      return {
        ...result,
        needsFromYou: result.dryRun
          ? ["DRY_RUN=true : le test a été simulé, aucun email n'est parti. Passez DRY_RUN=false pour un vrai test."]
          : [],
      };
    }

    // --- CRM ---------------------------------------------------------------
    case "crm.create_client": {
      const companyName = input.companyName as unknown as string;
      const offer = (input.offer as unknown as string) ?? "PREMIUM";
      if (!companyName) {
        return {
          skipped: true,
          reason: "Nom d'entreprise absent.",
          needsFromYou: [
            "Précisez l'entreprise. Format reconnu : « Nouveau client. Entreprise : Salon Éclat. Offre : PREMIUM ».",
          ],
        };
      }
      let result;
      try {
        result = await createClientFromProspect({
          companyName,
          offer: offer as never,
          contactEmail: input.email as unknown as string | undefined,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        // Cas courant et attendu : aucun email fiable connu. Ce n'est pas un
        // bug, c'est le refus d'inventer. On dit quoi faire.
        if (/adresse email/i.test(message)) {
          return {
            skipped: true,
            reason: message,
            needsFromYou: [
              `Donnez l'email de contact de ${companyName} : « Nouveau client. Entreprise : ${companyName}. Offre : ${offer}. Email : contact@exemple.fr ». Aucune adresse ne sera devinée.`,
            ],
          };
        }
        throw error;
      }
      if (!result.project) return { client: result.client.companyName, created: false };

      const status = await projectStatus(result.project.id);
      return {
        client: result.client.companyName,
        offer: result.client.offer,
        price: result.client.offerPrice,
        projectId: result.project.id,
        tasks: status.tasksTotal,
        missingInfo: status.missingRequired.length,
        needsFromYou: [
          `Dossier créé. ${status.missingRequired.length} information(s) à demander au client : ${status.missingRequired.slice(0, 6).map((m) => m.label).join(", ")}${status.missingRequired.length > 6 ? "…" : ""}`,
        ],
      };
    }

    case "project.onboarding_status": {
      const projects = await prisma.project.findMany({
        where: { status: "ACTIVE" },
        include: { client: true },
      });
      const report = [];
      for (const p of projects) {
        const status = await projectStatus(p.id);
        report.push({
          project: p.name,
          phase: p.phase,
          progress: `${status.tasksDone}/${status.tasksTotal}`,
          missing: status.missingRequired.map((m) => m.label),
          readyToProduce: status.readyToProduce,
        });
      }
      return {
        projects: report,
        needsFromYou: report
          .filter((r) => r.missing.length > 0)
          .map((r) => `${r.project} : demander ${r.missing.slice(0, 5).join(", ")}`),
      };
    }

    case "project.advance": {
      const projects = await prisma.project.findMany({ where: { status: "ACTIVE" } });
      const results = [];
      for (const p of projects) {
        const r = await advanceProject(p.id);
        results.push({ project: p.name, ...r });
      }
      return { projects: results };
    }

    // --- REPONSES ----------------------------------------------------------
    case "operator.mission": {
      const { runMission } = await import("@/lib/operator/mission");
      const result = await runMission({
        brief: (input.brief as unknown as string) ?? "Mission de prospection",
        city: input.city as unknown as string | undefined,
        sectors: input.sectors as unknown as string[] | undefined,
        limit: input.limit as unknown as number | undefined,
      });
      return {
        missionId: result.missionId,
        statut: result.status,
        trouvés: result.found,
        qualifiés: result.qualified,
        écartés: result.rejected,
        "à trancher": result.needsHuman,
        "emails prêts": result.emailsPrepared,
        étapes: result.steps,
        ...(result.needsFromYou.length > 0 ? { needsFromYou: result.needsFromYou } : {}),
      };
    }

    case "operator.tick": {
      const { runAllJobs } = await import("@/lib/scheduler/jobs");
      const results = await runAllJobs();
      const needs: string[] = [];

      const decisions = results.find((r) => r.job === "decide-replies");
      const humaines = (decisions?.details?.HUMAN_REVIEW as number) ?? 0;
      if (humaines > 0) {
        needs.push(`${humaines} réponse(s) nécessitent votre lecture — voir /replies.`);
      }
      const relances = results.find((r) => r.job === "due-followups");
      if ((relances?.itemsChanged ?? 0) > 0) {
        needs.push(`${relances!.itemsChanged} relance(s) préparée(s) : elles attendent votre approbation.`);
      }

      return {
        jobs: results.map((r) => ({
          job: r.job,
          exécuté: r.ran && !r.skipped,
          ignoré: r.skipped,
          résumé: r.summary,
        })),
        note: "Aucun email envoyé : un tour d'opérateur prépare, il n'expédie pas.",
        ...(needs.length > 0 ? { needsFromYou: needs } : {}),
      };
    }

    case "replies.sync": {
      const { imapStatus } = await import("@/lib/imap/config");
      const status = imapStatus();
      if (!status.configured) {
        return {
          skipped: true,
          reason: `Boîte non configurée — manquant dans .env : ${status.missing.join(", ")}`,
          needsFromYou: [
            `Renseignez ${status.missing.join(", ")} dans .env, puis vérifiez avec : npm run amyn -- imap-check`,
          ],
        };
      }

      const { ImapSource } = await import("@/lib/imap/client");
      const { syncReplies } = await import("@/lib/replies/sync");
      const report = await syncReplies(new ImapSource());

      if (report.error) {
        return { skipped: true, reason: `Lecture de la boîte impossible : ${report.error}` };
      }

      const needs: string[] = [];
      if (report.interested > 0) {
        needs.push(`${report.interested} prospect(s) intéressé(s) : à rappeler — voir /replies.`);
      }
      if (report.needsHuman > 0) {
        needs.push(`${report.needsHuman} réponse(s) nécessitent votre lecture : trop ambiguës pour être classées.`);
      }
      if (report.unmatched > 0) {
        needs.push(`${report.unmatched} expéditeur(s) inconnu(s) : enregistrés sans prospect rattaché.`);
      }

      return {
        examined: report.fetched,
        stored: report.stored,
        duplicates: report.duplicates,
        interested: report.interested,
        optOuts: report.optOuts,
        needsHuman: report.needsHuman,
        unmatched: report.unmatched,
        note: "Boîte lue en lecture seule. Aucun email envoyé, aucun message modifié ou supprimé.",
        ...(needs.length > 0 ? { needsFromYou: needs } : {}),
      };
    }

    case "replies.classify": {
      const email = input.email as unknown as string | undefined;
      const body = (input.body as unknown as string) ?? "";
      if (!email) {
        return {
          skipped: true,
          reason: "Adresse de l'expéditeur absente.",
          needsFromYou: [
            "Indiquez l'adresse et le texte de la réponse : npm run amyn -- reply <email> \"<texte>\"",
          ],
        };
      }
      const contact = await prisma.contact.findFirst({ where: { email: email.toLowerCase() } });
      if (!contact) {
        return { skipped: true, reason: `Aucun prospect connu avec l'adresse ${email}.` };
      }
      const result = await recordReply({
        prospectId: contact.prospectId,
        fromEmail: email,
        subject: "(réponse transmise à l'agent)",
        body,
      });
      return { classification: result.classification, confidence: result.confidence, reason: result.reason };
    }

    // --- ETAT --------------------------------------------------------------
    case "status.report": {
      const { pipelineSnapshot } = await import("@/lib/analytics");
      return pipelineSnapshot();
    }

    default:
      throw new Error(`Aucun exécuteur pour l'action « ${action.type} ».`);
  }
}
