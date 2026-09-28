import {
  sanitizeFirstLook,
  validateFirstLook,
  type FirstLookValues,
} from "@/lib/forms/first-look";
import { receivedAt, renderRequestEmail } from "@/lib/server/email";
import { handleForm } from "@/lib/server/handle-form";

/** Réception des demandes de premier aperçu. */
export async function POST(request: Request) {
  return handleForm<FirstLookValues>(request, {
    sanitize: sanitizeFirstLook,
    validate: validateFirstLook,
    compose: (v) => {
      const outreach = v.source === "outreach";
      const subject = `Premier aperçu — ${v.company}${outreach ? " (suite à un message AMYN)" : ""}`;
      const { html, text } = renderRequestEmail({
        title: "Nouvelle demande de premier aperçu",
        rows: [
          ["Nom", v.name],
          ["Entreprise", v.company],
          ["E-mail", v.email],
          ["Téléphone", v.phone || "—"],
          ["Site actuel", v.website || "—"],
          ["Autre présence", v.presence || "—"],
          ["À regarder", v.areas.join(", ")],
          ["Origine", outreach ? "Lien d'un message envoyé par AMYN" : "Site amyn.agency"],
          ["Reçue le", receivedAt()],
        ],
        message: v.notes || undefined,
        messageLabel: "Précisions",
        footer: `Répondez directement à cet e-mail pour écrire à ${v.name}.`,
      });
      return { subject, html, text };
    },
  });
}
