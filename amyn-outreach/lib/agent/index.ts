// ---------------------------------------------------------------------------
// AMYN AGENT — couche d'orchestration
//
// Recoit une instruction en francais, determine l'intention, construit un PLAN
// d'actions, puis l'execute en respectant les niveaux d'autonomie.
//
// Chaque action enregistre : ce qui a ete fait, pourquoi, avec quelle source,
// quel resultat, ce qui a echoue, ce qui attend une validation.
// Aucune magie noire : tout est dans AgentRun / AgentAction / ActivityLog.
// ---------------------------------------------------------------------------

import { prisma } from "@/lib/db";
import { logActivity } from "@/lib/activity";
import { parseInstruction, type Intent, type ParsedInstruction } from "./intents";
import { getAutonomy } from "./autonomy";

export * from "./intents";
export * from "./autonomy";

export type PlannedAction = {
  module: string;
  type: string;
  description: string;
  rationale: string;
  input: Record<string, unknown>;
};

/**
 * Contexte partage entre les actions d'un meme run.
 * Permet a l'audit de porter sur les prospects que la recherche vient de
 * creer, plutot que sur une requete globale qui ramasserait n'importe quoi.
 */
export type RunContext = { prospectIds: string[]; campaignId?: string };

export type ExecutedAction = PlannedAction & {
  status: "DONE" | "FAILED" | "WAITING_APPROVAL" | "SKIPPED";
  result?: unknown;
  error?: string;
};

export type AgentResult = {
  runId: string;
  intent: Intent;
  parsed: ParsedInstruction;
  actions: ExecutedAction[];
  summary: string;
  status: "DONE" | "PARTIAL" | "FAILED" | "WAITING_APPROVAL";
  needsFromYou: string[];
};

// --- PLANIFICATION ----------------------------------------------------------

export function planActions(parsed: ParsedInstruction): PlannedAction[] {
  const p = parsed.parameters;
  const city = (p.city as string) ?? "Lille";
  const sectors = (p.sectors as string[]) ?? [];
  const limit = (p.limit as number) ?? 10;

  switch (parsed.intent) {
    case "SEARCH":
      return [
        {
          module: "RESEARCH",
          type: "research.search",
          description: `Rechercher ${limit} entreprise(s) — ${sectors.join(", ") || "tous secteurs"} à ${city}`,
          rationale: "L'instruction demande de trouver des entreprises correspondant à une cible.",
          input: { city, sectors, limit },
        },
      ];

    case "AUDIT":
      return [
        {
          module: "AUDIT",
          type: "audit.run",
          description: `Auditer les prospects non encore audités (max ${limit})`,
          rationale: "Un email ne peut citer que des problèmes prouvés : l'audit doit précéder la rédaction.",
          input: { limit },
        },
      ];

    case "CONTACT":
      return [
        {
          module: "CONTACT",
          type: "contact.discover",
          description: `Chercher les emails professionnels publics (max ${limit})`,
          rationale: "Sans email public trouvé sur une source officielle, le prospect reste bloqué.",
          input: { limit },
        },
      ];

    case "SCORE":
      return [
        {
          module: "SCORING",
          type: "scoring.compute",
          description: "Calculer les scores des prospects audités",
          rationale: "Le score priorise l'effort commercial à partir de faits vérifiés.",
          input: { limit: limit * 5 },
        },
      ];

    case "DRAFT":
      return [
        {
          module: "EMAIL",
          type: "email.generate",
          description: `Rédiger les emails des prospects prêts (max ${limit})`,
          rationale: "Chaque email est construit à partir des problèmes prouvés du prospect.",
          input: { limit },
        },
      ];

    case "FOLLOWUP":
      return [
        {
          module: "CAMPAIGN",
          type: "campaign.followup",
          description: "Préparer les relances éligibles",
          rationale: "Une relance ne part jamais si le prospect a répondu ou s'est opposé.",
          input: {},
        },
      ];

    case "CAMPAIGN":
      return [
        {
          module: "CAMPAIGN",
          type: "campaign.create",
          description: `Créer une campagne pour ${sectors.join(", ") || "la cible"} à ${city}`,
          rationale: "Regrouper les prospects permet de piloter la cadence et la conformité.",
          input: { city, sectors, limit },
        },
      ];

    case "SEND":
      return [
        {
          module: "SEND",
          type: "campaign.send",
          description: "Envoyer les emails approuvés",
          rationale: "Seuls les emails approuvés manuellement et conformes peuvent partir.",
          input: { limit },
        },
      ];

    case "PIPELINE":
      return [
        {
          module: "RESEARCH",
          type: "research.search",
          description: `Rechercher ${limit} entreprise(s) — ${sectors.join(", ") || "tous secteurs"} à ${city}`,
          rationale: "Première étape de la chaîne : constituer la liste.",
          input: { city, sectors, limit },
        },
        {
          module: "AUDIT",
          type: "audit.run",
          description: "Auditer chaque entreprise trouvée",
          rationale: "Produire des constats prouvés, seule matière autorisée pour les emails.",
          input: { limit },
        },
        {
          module: "CONTACT",
          type: "contact.discover",
          description: "Chercher les emails professionnels publics",
          rationale: "Sans email public, le prospect est bloqué et n'entre pas en campagne.",
          input: { limit },
        },
        {
          module: "SCORING",
          type: "scoring.compute",
          description: "Calculer les scores",
          rationale: "Prioriser les prospects les plus pertinents.",
          input: { limit },
        },
        {
          module: "EMAIL",
          type: "email.generate",
          description: "Rédiger les emails personnalisés",
          rationale: "Un email par prospect, construit sur ses propres constats.",
          input: { limit },
        },
        {
          module: "CAMPAIGN",
          type: "campaign.create",
          description: "Regrouper le tout dans une campagne prête à approuver",
          rationale: "L'envoi attend une approbation humaine explicite.",
          input: { city, sectors, limit },
        },
      ];

    case "NEW_CLIENT":
      return [
        {
          module: "CRM",
          type: "crm.create_client",
          description: `Créer le dossier client ${p.companyName ?? ""} (${p.offer ?? "offre à préciser"})`,
          rationale: "Un prospect accepté déclenche client, projet, tâches et onboarding.",
          input: p,
        },
      ];

    case "ONBOARDING":
      return [
        {
          module: "PROJECT",
          type: "project.onboarding_status",
          description: "Faire le point sur les informations client manquantes",
          rationale: "La production ne démarre que lorsque les informations obligatoires sont réunies.",
          input: p,
        },
      ];

    case "PROJECT":
      return [
        {
          module: "PROJECT",
          type: "project.advance",
          description: "Faire avancer les projets dont la phase est terminée",
          rationale: "Une phase ne passe que si toutes ses tâches sont faites.",
          input: p,
        },
      ];

    case "REPLY":
      return [
        {
          module: "REPLIES",
          type: "replies.classify",
          description: "Classer la réponse reçue et en tirer les conséquences",
          rationale: "Une opposition doit bloquer immédiatement et définitivement le contact.",
          input: p,
        },
      ];

    case "TEST_EMAIL":
      return [
        {
          module: "SEND",
          type: "send.test",
          description: `Envoyer un email de test vers ${p.email ?? "votre adresse"}`,
          rationale: "Vérifier la chaîne d'envoi avant tout envoi réel.",
          input: p,
        },
      ];

    case "STATUS":
      return [
        {
          module: "ANALYTICS",
          type: "status.report",
          description: "Établir l'état du pipeline",
          rationale: "Donner une vue d'ensemble factuelle.",
          input: {},
        },
      ];

    default:
      return [];
  }
}

// --- EXECUTION --------------------------------------------------------------

export async function runAgent(
  instruction: string,
  options: { autoApprove?: boolean; dryPlan?: boolean } = {},
): Promise<AgentResult> {
  const parsed = parseInstruction(instruction);
  const planned = planActions(parsed);
  const startedAt = Date.now();

  const run = await prisma.agentRun.create({
    data: {
      instruction,
      intent: parsed.intent,
      parameters: JSON.stringify(parsed.parameters),
      parsedBy: "PATTERN",
      status: planned.length === 0 ? "FAILED" : "RUNNING",
    },
  });

  if (parsed.intent === "UNKNOWN" || planned.length === 0) {
    const summary = `Instruction non comprise. ${parsed.explanation}`;
    await prisma.agentRun.update({
      where: { id: run.id },
      data: { status: "FAILED", summary, finishedAt: new Date(), durationMs: Date.now() - startedAt },
    });
    return {
      runId: run.id,
      intent: parsed.intent,
      parsed,
      actions: [],
      summary,
      status: "FAILED",
      needsFromYou: [
        "Reformulez votre instruction. Exemples reconnus : « Trouve 20 coiffeurs à Lille », « Audite les prospects », « Prépare une campagne », « Nouveau client. Entreprise : X. Offre : PREMIUM ».",
      ],
    };
  }

  const executed: ExecutedAction[] = [];
  const needsFromYou: string[] = [];
  const context: RunContext = { prospectIds: [] };

  for (const [index, action] of planned.entries()) {
    const autonomy = await getAutonomy(action.type);

    const record = await prisma.agentAction.create({
      data: {
        agentRunId: run.id,
        module: action.module,
        type: action.type,
        description: action.description,
        rationale: action.rationale,
        autonomy,
        status: autonomy === "APPROVAL_REQUIRED" && !options.autoApprove ? "WAITING_APPROVAL" : "RUNNING",
        input: JSON.stringify(action.input),
        position: index,
        startedAt: new Date(),
      },
    });

    if (autonomy === "APPROVAL_REQUIRED" && !options.autoApprove) {
      executed.push({ ...action, status: "WAITING_APPROVAL" });
      needsFromYou.push(`Validation requise : ${action.description}`);
      continue;
    }

    if (options.dryPlan) {
      await prisma.agentAction.update({ where: { id: record.id }, data: { status: "SKIPPED" } });
      executed.push({ ...action, status: "SKIPPED" });
      continue;
    }

    try {
      const { executeAction } = await import("./executors");
      const result = await executeAction(action, context);
      await prisma.agentAction.update({
        where: { id: record.id },
        data: { status: "DONE", result: JSON.stringify(result), finishedAt: new Date() },
      });
      executed.push({ ...action, status: "DONE", result });

      if (result && typeof result === "object" && "needsFromYou" in result) {
        const needs = (result as { needsFromYou?: string[] }).needsFromYou;
        if (Array.isArray(needs)) needsFromYou.push(...needs);
      }
    } catch (err) {
      const message = (err as Error).message;
      await prisma.agentAction.update({
        where: { id: record.id },
        data: { status: "FAILED", error: message, finishedAt: new Date() },
      });
      executed.push({ ...action, status: "FAILED", error: message });
    }
  }

  const done = executed.filter((a) => a.status === "DONE").length;
  const failed = executed.filter((a) => a.status === "FAILED").length;
  const waiting = executed.filter((a) => a.status === "WAITING_APPROVAL").length;

  const status: AgentResult["status"] =
    waiting > 0 ? "WAITING_APPROVAL" : failed === executed.length ? "FAILED" : failed > 0 ? "PARTIAL" : "DONE";

  const summary = [
    `${done} action(s) exécutée(s)`,
    failed > 0 ? `${failed} en échec` : null,
    waiting > 0 ? `${waiting} en attente de validation` : null,
  ]
    .filter(Boolean)
    .join(", ");

  await prisma.agentRun.update({
    where: { id: run.id },
    data: { status, summary, finishedAt: new Date(), durationMs: Date.now() - startedAt },
  });

  await logActivity({
    actor: "AGENT",
    module: "AGENT",
    action: "agent.run",
    entityType: "AgentRun",
    entityId: run.id,
    summary: `Instruction « ${instruction.slice(0, 120)} » → ${parsed.intent} : ${summary}`,
    details: { parsed, actions: executed.map((a) => ({ type: a.type, status: a.status, error: a.error })) },
    level: failed > 0 ? "WARN" : "INFO",
  });

  return { runId: run.id, intent: parsed.intent, parsed, actions: executed, summary, status, needsFromYou };
}
