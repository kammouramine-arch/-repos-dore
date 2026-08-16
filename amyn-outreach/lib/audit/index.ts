// ---------------------------------------------------------------------------
// LOT 2 — AUDIT DE SITE (emplacement réservé)
//
// Rôle : produire un diagnostic FACTUEL, chaque problème accompagné d'une
// preuve vérifiable stockée en base (table Issue).
//
// Règles non négociables :
//   • Les vérifications techniques sont déterministes (du code, pas de l'IA).
//   • Si le site bloque le robot → auditStatus = INCOMPLETE, on n'affirme rien.
//   • Un problème sans preuve n'est jamais enregistré.
// ---------------------------------------------------------------------------

import type { IssueType } from "@/lib/constants";

export type DetectedIssue = {
  type: IssueType;
  severity: "LOW" | "MEDIUM" | "HIGH";
  title: string;
  summary: string;
  evidenceUrl?: string;
  evidenceSnippet?: string;
  evidenceNote?: string;
  detectionMethod: "AUTOMATED" | "AI" | "MANUAL";
};

export type AuditReport = {
  status: "COMPLETE" | "INCOMPLETE" | "FAILED";
  note?: string;
  issues: DetectedIssue[];
};

export interface AuditCheck {
  readonly type: IssueType;
  run(context: unknown): Promise<DetectedIssue | null>;
}

// Implémentations à venir au lot 2.
