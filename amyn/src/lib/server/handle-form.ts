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

/* Messages renvoyés au visiteur, dans sa langue (champ `lang` de la
   demande ; français par défaut, y compris avant lecture de la demande). */
const MESSAGES = {
  fr: {
    invalid: "Requête invalide.",
    tooLarge: "Demande trop volumineuse.",
    origin: "Origine non autorisée.",
    fields: "Certains champs sont à compléter.",
    rate: "Plusieurs demandes viennent d'être envoyées. Réessayez dans quelques minutes.",
    unavailable:
      "L'envoi est momentanément indisponible. Écrivez-nous directement à contact@amyn.agency.",
    failed: "L'envoi a échoué. Réessayez dans un instant.",
  },
  en: {
    invalid: "Invalid request.",
    tooLarge: "This request is too large.",
    origin: "Origin not allowed.",
    fields: "Some fields still need your attention.",
    rate: "Several requests were just sent. Please try again in a few minutes.",
    unavailable:
      "Sending is temporarily unavailable. Please email us directly at contact@amyn.agency.",
    failed: "Sending failed. Please try again in a moment.",
  },
} as const;
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
  let m: (typeof MESSAGES)[keyof typeof MESSAGES] = MESSAGES.fr;

  /* ① Forme de la requête. */
  if (!request.headers.get("content-type")?.includes("application/json")) {
    return json({ error: m.invalid }, 415);
  }
  const length = Number(request.headers.get("content-length") ?? 0);
  if (length > MAX_BODY) return json({ error: m.tooLarge }, 413);

  /* Une requête envoyée depuis un autre site est refusée. */
  const origin = request.headers.get("origin");
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  if (origin && host && new URL(origin).host !== host) {
    return json({ error: m.origin }, 403);
  }

  let raw: Record<string, unknown>;
  try {
    const text = await request.text();
    if (text.length > MAX_BODY) return json({ error: m.tooLarge }, 413);
    const parsed: unknown = JSON.parse(text);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error();
    raw = parsed as Record<string, unknown>;
  } catch {
    return json({ error: m.invalid }, 400);
  }
  if (raw.lang === "en") m = MESSAGES.en;

  /* ② Pièges. */
  const trapped = typeof raw[HONEYPOT_FIELD] === "string" && raw[HONEYPOT_FIELD] !== "";
  const elapsed = typeof raw.elapsed === "number" ? raw.elapsed : 0;
  if (trapped || elapsed < MIN_FILL_MS) return json({ ok: true });

  /* ③ Validation. */
  const values = sanitize(raw);
  const errors = validate(values);
  if (hasErrors(errors)) {
    return json({ error: m.fields, errors }, 422);
  }

  /* ④ Débit. */
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "inconnu";
  if (limited(ip)) {
    return json({ error: m.rate }, 429);
  }

  /* ⑤ Envoi. */
  const email = compose(values);
  const result = await sendRequestEmail({ ...email, replyTo: values.email });

  if (result === "unavailable") {
    return json({ error: m.unavailable }, 503);
  }
  if (result === "failed") {
    return json({ error: m.failed }, 502);
  }
  return json({ ok: true });
}
