import { sanitizeProject, validateProject, type ProjectValues } from "@/lib/forms/project";
import { receivedAt, renderRequestEmail } from "@/lib/server/email";
import { handleForm } from "@/lib/server/handle-form";

/** Réception des demandes de projet. */
export async function POST(request: Request) {
  return handleForm<ProjectValues>(request, {
    sanitize: sanitizeProject,
    validate: validateProject,
    compose: (v) => {
      const { html, text } = renderRequestEmail({
        title: "Nouvelle demande de projet",
        rows: [
          ["Nom", v.name],
          ["Entreprise", v.company],
          ["E-mail", v.email],
          ["Téléphone", v.phone || "—"],
          ["Site actuel", v.website || "—"],
          ["Services", v.services.join(", ")],
          ["Situation", v.situation],
          ["Objectif", v.objective],
          ["Budget", v.budget],
          ["Échéance", v.timeline],
          ["Reçue le", receivedAt()],
        ],
        message: v.description,
        messageLabel: "Description du projet",
        footer: `Répondez directement à cet e-mail pour écrire à ${v.name}.`,
      });
      return { subject: `Demande de projet — ${v.company}`, html, text };
    },
  });
}
