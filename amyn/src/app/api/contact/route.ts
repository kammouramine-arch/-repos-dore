import {
  HONEYPOT_FIELD,
  hasErrors,
  validateContact,
  type ContactValues,
} from "@/lib/contact-form";

/**
 * Réception des demandes de contact.
 *
 * Tout se passe côté serveur : la clé d'envoi n'est lue que dans
 * `process.env`, elle ne traverse jamais le navigateur et n'apparaît nulle
 * part dans le code. Sans les variables d'environnement, la route refuse
 * proprement au lieu d'échouer en silence.
 */

/* Adresse de réception. Le domaine possède déjà des MX OVH actifs, donc une
   boîte sur amyn.agency reçoit bien le courrier ; la valeur reste réglable
   par variable d'environnement pour ne rien coder en dur. */
const TO = process.env.CONTACT_TO_EMAIL || "contact@amyn.agency";

/* Expéditeur technique. Il n'est vu que dans la boîte de réception d'AMYN :
   c'est le Reply-To qui porte l'adresse du prospect. */
const FROM = process.env.CONTACT_FROM_EMAIL || "AMYN <onboarding@resend.dev>";

const SUBJECT = "Nouvelle demande de contact — AMYN";

/**
 * Limitation de débit, au mieux.
 *
 * La mémoire d'une fonction serverless ne survit pas d'une instance à
 * l'autre : ceci arrête les envois répétés d'un même visiteur, pas une
 * attaque distribuée. C'est un garde-fou, pas une sécurité — d'où le
 * champ-piège en première ligne de défense.
 */
const WINDOW_MS = 10 * 60 * 1000;
const MAX_PER_WINDOW = 5;
const hits = new Map<string, number[]>();

function rateLimited(ip: string) {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  recent.push(now);
  hits.set(ip, recent);

  /* On empêche la table de grossir indéfiniment sur une instance chaude. */
  if (hits.size > 500) {
    for (const [key, times] of hits) {
      if (times.every((t) => now - t >= WINDOW_MS)) hits.delete(key);
    }
  }

  return recent.length > MAX_PER_WINDOW;
}

const escape = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

function buildEmail(v: ContactValues, receivedAt: string) {
  const rows: [string, string][] = [
    ["Prénom", v.firstName],
    ["Nom", v.lastName],
    ["Entreprise", v.company],
    ["Email", v.email],
    ["Téléphone", v.phone || "—"],
    ["Reçue le", receivedAt],
  ];

  /* Mise en page claire sur fond clair : une boîte mail n'est pas le site,
     elle doit rester lisible partout, y compris en mode sombre natif. */
  const html = `<!doctype html>
<html lang="fr"><body style="margin:0;padding:32px 16px;background:#f4f1ea;font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;color:#1a1a1c">
  <table role="presentation" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;background:#ffffff;border:1px solid #e4e0d7">
    <tr><td style="padding:28px 32px;border-bottom:1px solid #e4e0d7">
      <div style="font-size:12px;letter-spacing:.28em;text-transform:uppercase;color:#a1854b;font-weight:600">AMYN</div>
      <div style="margin-top:10px;font-size:19px;font-weight:600">Nouvelle demande de contact</div>
    </td></tr>
    <tr><td style="padding:8px 32px 24px">
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
        ${rows
          .map(
            ([label, value]) => `<tr>
          <td style="padding:14px 0;border-bottom:1px solid #f0ece3;font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:#8a8681;width:132px;vertical-align:top">${escape(label)}</td>
          <td style="padding:14px 0;border-bottom:1px solid #f0ece3;font-size:15px;line-height:1.5">${escape(value)}</td>
        </tr>`,
          )
          .join("")}
      </table>
      <div style="margin-top:26px;font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:#8a8681">Message</div>
      <div style="margin-top:10px;font-size:15px;line-height:1.65;white-space:pre-wrap">${escape(v.message)}</div>
    </td></tr>
    <tr><td style="padding:18px 32px;background:#faf8f4;border-top:1px solid #e4e0d7;font-size:12px;color:#8a8681">
      Répondez directement à cet e-mail pour joindre ${escape(v.firstName)}.
    </td></tr>
  </table>
</body></html>`;

  const text = [
    "Nouvelle demande de contact — AMYN",
    "",
    ...rows.map(([label, value]) => `${label} : ${value}`),
    "",
    "Message :",
    v.message,
  ].join("\n");

  return { html, text };
}

export async function POST(request: Request) {
  let payload: Record<string, unknown>;
  try {
    payload = await request.json();
  } catch {
    return Response.json({ error: "Requête invalide." }, { status: 400 });
  }

  /* ① Le champ-piège. Un robot l'a rempli : on répond « c'est envoyé » sans
     rien envoyer, pour ne pas lui apprendre qu'il a été repéré. */
  if (typeof payload[HONEYPOT_FIELD] === "string" && payload[HONEYPOT_FIELD]) {
    return Response.json({ ok: true });
  }

  /* ② Revalidation serveur, avec les mêmes règles que le navigateur. */
  const values: ContactValues = {
    firstName: String(payload.firstName ?? "").trim(),
    lastName: String(payload.lastName ?? "").trim(),
    company: String(payload.company ?? "").trim(),
    email: String(payload.email ?? "").trim(),
    phone: String(payload.phone ?? "").trim(),
    message: String(payload.message ?? "").trim(),
  };

  const errors = validateContact(values);
  if (hasErrors(errors)) {
    return Response.json({ error: "Formulaire incomplet.", errors }, { status: 422 });
  }

  /* ③ Débit — mesuré sur les demandes valides uniquement. Une faute de
     frappe ne doit pas consommer le quota du visiteur : ce qu'on protège,
     c'est la boîte de réception, pas le formulaire. */
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "inconnu";
  if (rateLimited(ip)) {
    return Response.json(
      { error: "Trop de demandes envoyées. Réessayez dans quelques minutes." },
      { status: 429 },
    );
  }

  const receivedAt = new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "full",
    timeStyle: "short",
    timeZone: "Europe/Paris",
  }).format(new Date());

  const { html, text } = buildEmail(values, receivedAt);
  const apiKey = process.env.RESEND_API_KEY;

  /* En développement sans clé, on écrit la demande dans la console plutôt
     que d'exiger un secret pour tester le parcours. Jamais en production. */
  if (!apiKey) {
    if (process.env.NODE_ENV !== "production") {
      console.info(`\n[contact] Demande reçue (mode développement)\n${text}\n`);
      return Response.json({ ok: true, delivery: "console" });
    }
    console.error("[contact] RESEND_API_KEY manquante : envoi impossible.");
    return Response.json(
      {
        error:
          "Le service d'envoi est momentanément indisponible. Écrivez-nous directement par email.",
      },
      { status: 503 },
    );
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: FROM,
        to: [TO],
        /* Un clic sur « Répondre » écrit au prospect, pas à AMYN. */
        reply_to: values.email,
        subject: SUBJECT,
        html,
        text,
      }),
    });

    if (!response.ok) {
      console.error(
        `[contact] Envoi refusé (${response.status}) : ${await response.text()}`,
      );
      return Response.json(
        { error: "L'envoi a échoué. Réessayez dans un instant." },
        { status: 502 },
      );
    }
  } catch (error) {
    console.error("[contact] Envoi impossible :", error);
    return Response.json(
      { error: "L'envoi a échoué. Réessayez dans un instant." },
      { status: 502 },
    );
  }

  return Response.json({ ok: true });
}
