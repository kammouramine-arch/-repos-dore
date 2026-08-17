// ---------------------------------------------------------------------------
// GENERATION VIA L'API CLAUDE
//
// ETAT : implementee. Active des que ANTHROPIC_API_KEY est presente dans .env.
// Sans cle, generate.ts bascule automatiquement sur le generateur template,
// qui produit des emails corrects sans aucune dependance externe.
//
// Le modele ne recoit QUE des faits deja prouves et enregistres en base.
// Sa sortie repasse ensuite par verifyEmail() : s'il invente quoi que ce soit,
// le brouillon est refuse. Le modele n'a pas le dernier mot.
// ---------------------------------------------------------------------------

import Anthropic from "@anthropic-ai/sdk";
import { offerMeta } from "@/lib/constants";

const MODEL = "claude-opus-5";

export type ClaudeInput = {
  prospect: { name: string; city: string; sector: string };
  issues: Array<{ type: string; title: string; summary: string; evidenceUrl: string | null }>;
  offerKey: string | null;
  senderEmail: string;
  step: number;
};

const SYSTEM_PROMPT = `Tu rédiges des emails de prospection B2B pour AMYN, une agence Web & Growth basée à Lille qui aide les commerces et petites entreprises locales.

CONTRAINTES ABSOLUES — un email qui les viole est rejeté automatiquement :
- N'écris QUE sur les constats fournis. N'ajoute aucun autre problème.
- Aucun chiffre, aucun pourcentage, aucune statistique, sauf le prix de l'offre s'il est fourni.
- Aucune promesse de résultat ("vous gagnerez", "vous doublerez", "garanti").
- Aucun superlatif ("meilleur", "leader", "n°1").
- Aucune affirmation sur les pertes, le chiffre d'affaires ou les concurrents de l'entreprise.
- Aucun faux compliment sur un site que tu n'as pas vu.
- Pas de ton commercial agressif, pas d'urgence artificielle.

STYLE :
- Français, tutoiement jamais, vouvoiement toujours.
- 8 à 12 lignes maximum, phrases courtes.
- Ton d'un artisan qui écrit à un autre artisan : direct, concret, sans jargon.
- Mentionne le problème principal de façon factuelle, puis sa conséquence concrète pour ses clients.
- Termine par une proposition simple et une porte de sortie explicite.

OBLIGATOIRE dans le corps :
- La signature "Amyn / AMYN — Web & Growth, Lille" et l'adresse de contact fournie.
- Une phrase permettant de s'opposer simplement (répondre STOP).`;

export async function generateWithClaude(input: ClaudeInput): Promise<{
  subject: string;
  body: string;
  model: string;
}> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY absente.");

  const client = new Anthropic({ apiKey });
  const offer = offerMeta(input.offerKey);

  const facts = input.issues
    .map(
      (i, n) =>
        `${n + 1}. ${i.title}\n   Constat vérifié : ${i.summary}${i.evidenceUrl ? `\n   Source : ${i.evidenceUrl}` : ""}`,
    )
    .join("\n");

  const userPrompt = [
    `Entreprise : ${input.prospect.name}`,
    `Secteur : ${input.prospect.sector}`,
    `Ville : ${input.prospect.city}`,
    "",
    "Constats vérifiés lors de l'audit (les seuls que tu peux mentionner) :",
    facts,
    "",
    offer
      ? `Offre recommandée : ${offer.label} à ${offer.price} ${offer.unit}. Tu peux citer ce prix, aucun autre chiffre.`
      : "Aucune offre recommandée : ne cite aucun prix.",
    `Adresse de contact à faire figurer : ${input.senderEmail}`,
    "",
    input.step === 0
      ? "Rédige le premier email de prise de contact."
      : `Rédige la relance numéro ${input.step}. Elle doit être plus courte que le premier message, rappeler brièvement le point principal, et proposer clairement d'arrêter là.`,
  ].join("\n");

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 4000,
    system: SYSTEM_PROMPT,
    output_config: {
      effort: "medium",
      format: {
        type: "json_schema",
        schema: {
          type: "object",
          properties: {
            subject: { type: "string", description: "Objet de l'email, sans point final." },
            body: { type: "string", description: "Corps complet de l'email, signature comprise." },
          },
          required: ["subject", "body"],
          additionalProperties: false,
        },
      },
    },
    messages: [{ role: "user", content: userPrompt }],
  });

  if (response.stop_reason === "refusal") {
    throw new Error(
      "Le modèle a refusé de répondre. Bascule sur le générateur template.",
    );
  }

  const text = response.content.find((b) => b.type === "text");
  if (!text || text.type !== "text") throw new Error("Réponse Claude vide.");

  const parsed = JSON.parse(text.text) as { subject: string; body: string };
  if (!parsed.subject?.trim() || !parsed.body?.trim()) {
    throw new Error("Réponse Claude incomplète.");
  }

  return { subject: parsed.subject.trim(), body: parsed.body.trim(), model: MODEL };
}

export function claudeAvailability() {
  return process.env.ANTHROPIC_API_KEY
    ? { available: true, note: `Clé présente. Modèle ${MODEL}.` }
    : {
        available: false,
        missing: "ANTHROPIC_API_KEY",
        note:
          "Sans clé, les emails sont générés par le moteur template (déterministe, basé sur les mêmes preuves). Renseigner ANTHROPIC_API_KEY dans .env pour activer la rédaction par Claude.",
      };
}
