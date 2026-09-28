import "server-only";
import { HONEYPOT_FIELD, MIN_FILL_MS, hasErrors } from "@/lib/forms/shared";
import { sendRequestEmail } from "./email";
import { createRateLimiter } from "./rate-limit";

/**
 * Traitement commun des formulaires, dans cet ordre :
 *   1. forme de la requête (type, taille, origine) ;
 *   2. pièges à robots (champ-piège, remplissage trop rapide) : réponse
 *      « envoyé » sans rien envoyer, pour ne rien leur apprendre ;
 *   3. nettoyage puis validation serveur, avec les règles du navigateur ;
 *   4. débit — compté sur les demandes valides seulement : une faute de
 *      frappe ne doit pas consommer le quota d'un visiteur ;
 *   5. envoi.
 */

const MAX_BODY = 24_000;
const limited = createRateLimiter({ max: 5, windowMs: 10 * 60 * 1000 });

const json = (body: object, status = 200) =>
  Response.json(body, { status, headers: { "Cache-Control": "no-store" } });

export async function handleForm<V extends { email: string }>(
  request: Request,
  {
    sanitize,
    validate,
    compose,
  }: {
    sanitize: (raw: Record<string, unknown>) => V;
    validate: (values: V) => object;
    compose: (values: V) => { subject: string; html: string; text: string };
  },
): Promise<Response> {
  /* ① Forme de la requête. */
  if (!request.headers.get("content-type")?.includes("application/json")) {
    return json({ error: "Requête invalide." }, 415);
  }
  const length = Number(request.headers.get("content-length") ?? 0);
  if (length > MAX_BODY) return json({ error: "Demande trop volumineuse." }, 413);

  /* Une requête envoyée depuis un autre site est refusée. */
  const origin = request.headers.get("origin");
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  if (origin && host && new URL(origin).host !== host) {
    return json({ error: "Origine non autorisée." }, 403);
  }

  let raw: Record<string, unknown>;
  try {
    const text = await request.text();
    if (text.length > MAX_BODY) return json({ error: "Demande trop volumineuse." }, 413);
    const parsed: unknown = JSON.parse(text);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error();
    raw = parsed as Record<string, unknown>;
  } catch {
    return json({ error: "Requête invalide." }, 400);
  }

  /* ② Pièges. */
  const trapped = typeof raw[HONEYPOT_FIELD] === "string" && raw[HONEYPOT_FIELD] !== "";
  const elapsed = typeof raw.elapsed === "number" ? raw.elapsed : 0;
  if (trapped || elapsed < MIN_FILL_MS) return json({ ok: true });

  /* ③ Validation. */
  const values = sanitize(raw);
  const errors = validate(values);
  if (hasErrors(errors)) {
    return json({ error: "Certains champs sont à compléter.", errors }, 422);
  }

  /* ④ Débit. */
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "inconnu";
  if (limited(ip)) {
    return json(
      { error: "Plusieurs demandes viennent d'être envoyées. Réessayez dans quelques minutes." },
      429,
    );
  }

  /* ⑤ Envoi. */
  const email = compose(values);
  const result = await sendRequestEmail({ ...email, replyTo: values.email });

  if (result === "unavailable") {
    return json(
      {
        error:
          "L'envoi est momentanément indisponible. Écrivez-nous directement à contact@amyn.agency.",
      },
      503,
    );
  }
  if (result === "failed") {
    return json({ error: "L'envoi a échoué. Réessayez dans un instant." }, 502);
  }
  return json({ ok: true });
}
