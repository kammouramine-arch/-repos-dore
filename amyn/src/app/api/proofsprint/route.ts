import {
  sanitizeProofSprint,
  validateProofSprint,
  type ProofSprintValues,
} from "@/lib/forms/proofsprint";
import { receivedAt, renderRequestEmail } from "@/lib/server/email";
import { handleForm } from "@/lib/server/handle-form";

/**
 * Réception des demandes ProofSprint. Même chemin que le formulaire
 * « premier aperçu » : validation serveur, pièges à robots, débit, puis
 * remise à contact@amyn.agency. Le visiteur ne voit un message de succès
 * que si l'envoi a réellement eu lieu (voir handleForm).
 */
export async function POST(request: Request) {
  return handleForm<ProofSprintValues>(request, {
    sanitize: sanitizeProofSprint,
    validate: validateProofSprint,
    compose: (v) => {
      const subject = `ProofSprint — ${v.company}`;
      const { html, text } = renderRequestEmail({
        title: "Nouvelle demande ProofSprint",
        rows: [
          ["Entreprise", v.company],
          ["E-mail", v.email],
          ["Nom", v.name || "—"],
          ["Échéance de l'acheteur", v.deadline],
          ["Langue", v.lang === "en" ? "Anglais — répondre en anglais" : "Français"],
          ["Reçue le", receivedAt()],
        ],
        message: v.description,
        messageLabel: "Opportunité",
        footer: `Répondez directement à cet e-mail pour écrire à ${v.name || v.company}. Aucun document source n'a été demandé à ce stade.`,
      });
      return { subject, html, text };
    },
  });
}
