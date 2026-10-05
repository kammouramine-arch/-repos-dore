import {
  auditSummaryRows,
  sanitizeRevenueAudit,
  validateRevenueAudit,
  type RevenueAuditValues,
} from "@/lib/forms/revenue-audit";
import { receivedAt, renderRequestEmail } from "@/lib/server/email";
import { handleForm } from "@/lib/server/handle-form";

/**
 * Réception des demandes de Revenue Audit. Même chemin que les autres
 * formulaires : validation serveur, pièges à robots, débit, puis remise à
 * contact@amyn.agency. Le visiteur ne voit la confirmation que si l'envoi
 * a réellement eu lieu (voir handleForm).
 */
export async function POST(request: Request) {
  return handleForm<RevenueAuditValues>(request, {
    sanitize: sanitizeRevenueAudit,
    validate: validateRevenueAudit,
    compose: (v) => {
      const subject = `Revenue Audit — ${v.company}`;
      const { html, text } = renderRequestEmail({
        title: "Nouvelle demande de Revenue Audit",
        rows: [...auditSummaryRows(v), ["Reçue le", receivedAt()]],
        message: v.problemDetails || undefined,
        messageLabel: "Exemple de perte d'opportunité",
        footer: `Répondez directement à cet e-mail pour écrire à ${v.name}.`,
      });
      return { subject, html, text };
    },
  });
}
