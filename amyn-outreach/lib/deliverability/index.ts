// ---------------------------------------------------------------------------
// DÉLIVRABILITÉ — vérification réelle des enregistrements DNS
//
// SPF, DKIM et DMARC ne sont pas du code : ce sont des enregistrements DNS à
// poser chez le registrar du domaine. Ce module ne les crée pas — il INTERROGE
// le DNS et rapporte ce qui existe vraiment.
//
// AUCUNE PROMESSE : même avec les trois enregistrements corrects, personne ne
// peut garantir qu'un email arrivera en boîte principale. Ces enregistrements
// évitent d'être rejeté d'emblée ; le reste dépend de la réputation, du
// contenu, du volume et du destinataire.
// ---------------------------------------------------------------------------

import { promises as dns } from "node:dns";

export type DnsCheck = {
  id: "spf" | "dkim" | "dmarc" | "mx";
  label: string;
  /** OK = présent et exploitable · MISSING = absent · WARN = présent mais perfectible */
  status: "OK" | "MISSING" | "WARN" | "ERROR";
  found: string[];
  detail: string;
  /** Ce qu'il faut poser, exactement. */
  fix?: { host: string; type: string; value: string };
};

export type DeliverabilityReport = {
  domain: string;
  checks: DnsCheck[];
  ready: boolean;
  summary: string;
  disclaimer: string;
};

const DISCLAIMER =
  "Ces enregistrements évitent d'être rejeté d'emblée. Ils ne garantissent " +
  "pas l'arrivée en boîte principale : cela dépend aussi de la réputation du " +
  "domaine, du volume, du contenu et du destinataire.";

async function txt(name: string): Promise<string[]> {
  try {
    const records = await dns.resolveTxt(name);
    return records.map((parts) => parts.join(""));
  } catch {
    return [];
  }
}

/**
 * Selecteurs DKIM testes par defaut.
 *
 * POURQUOI CETTE LISTE EST LONGUE. Une cle DKIM ne se decouvre pas : elle se
 * devine, selecteur par selecteur. Il n'existe aucun moyen de demander au DNS
 * « quels selecteurs ce domaine publie-t-il ? ». Une liste trop courte fait
 * donc dire « DKIM absent » a un domaine parfaitement signe — un faux negatif
 * qui bloquerait a tort tout envoi automatique.
 *
 * La liste couvre les hebergeurs francais et les services d'envoi courants.
 * Elle ne sera jamais exhaustive : c'est pourquoi `--selecteur=` existe, pour
 * verifier directement celui que porte un en-tete reel (tag `s=`).
 */
export const SELECTEURS_COURANTS = [
  // OVHcloud
  "ovhcloud", "ovh", "ovhcloud1", "ovhcloud2", "ovhmail",
  // Generiques les plus repandus
  "mail", "default", "dkim", "dkim1", "dkim2", "selector", "selector1", "selector2",
  "s1", "s2", "k1", "k2", "key1", "key2", "smtp", "mx", "email", "sig1",
  // Microsoft, Google, autres hebergeurs
  "google", "gmail", "o365", "outlook", "zimbra", "gandi", "scaleway", "ionos",
  // Services d'envoi
  "sendgrid", "mandrill", "amazonses", "mailjet", "sendinblue", "brevo",
  "mailchimp", "postmark", "sparkpost", "protonmail", "fm1", "fm2", "fm3",
  // Selecteurs dates, frequents chez les hebergeurs qui font tourner leurs cles
  "20230601", "20240101", "20250101", "20260101", "202301", "202401", "202501",
];

export async function checkDeliverability(
  domain: string,
  options: { dkimSelectors?: string[] } = {},
): Promise<DeliverabilityReport> {
  const checks: DnsCheck[] = [];
  const selectors = options.dkimSelectors ?? SELECTEURS_COURANTS;

  // --- MX ------------------------------------------------------------------
  try {
    const mx = await dns.resolveMx(domain);
    checks.push(
      mx.length > 0
        ? {
            id: "mx", label: "Serveurs de réception (MX)", status: "OK",
            found: mx.map((m) => `${m.priority} ${m.exchange}`),
            detail: `${mx.length} enregistrement(s) MX. Le domaine peut recevoir des emails.`,
          }
        : {
            id: "mx", label: "Serveurs de réception (MX)", status: "MISSING", found: [],
            detail: "Aucun MX : le domaine ne peut pas recevoir d'email, donc aucune réponse ne vous parviendra.",
            fix: { host: domain, type: "MX", value: "mx1.mail.ovh.net (priorité 1), mx2/mx3 en secours" },
          },
    );
  } catch (e) {
    checks.push({
      id: "mx", label: "Serveurs de réception (MX)", status: "ERROR", found: [],
      detail: `Interrogation DNS impossible : ${e instanceof Error ? e.message : String(e)}`,
    });
  }

  // --- SPF -----------------------------------------------------------------
  const spfRecords = (await txt(domain)).filter((r) => r.toLowerCase().startsWith("v=spf1"));
  if (spfRecords.length === 0) {
    checks.push({
      id: "spf", label: "SPF", status: "MISSING", found: [],
      detail: "Aucun SPF : vos emails seront traités comme non authentifiés par la plupart des serveurs.",
      fix: { host: domain, type: "TXT", value: "v=spf1 include:mx.ovh.com ~all" },
    });
  } else if (spfRecords.length > 1) {
    // Deux SPF invalident l'authentification : la RFC n'en autorise qu'un.
    checks.push({
      id: "spf", label: "SPF", status: "WARN", found: spfRecords,
      detail: `${spfRecords.length} enregistrements SPF : la norme n'en autorise qu'un, l'authentification échouera.`,
      fix: { host: domain, type: "TXT", value: "Fusionner en un seul : v=spf1 include:mx.ovh.com ~all" },
    });
  } else {
    const spf = spfRecords[0];
    const inclutOvh = /include:mx\.ovh\.com/i.test(spf);
    const finStricte = /[~-]all\s*$/.test(spf.trim());
    checks.push({
      id: "spf",
      label: "SPF",
      status: inclutOvh && finStricte ? "OK" : "WARN",
      found: spfRecords,
      detail: !inclutOvh
        ? "SPF présent mais n'autorise pas les serveurs OVHcloud : vos envois échoueront la vérification."
        : !finStricte
          ? "SPF présent mais sans mécanisme de fin (~all ou -all) : la protection est incomplète."
          : "SPF correct : les serveurs OVHcloud sont autorisés à envoyer pour ce domaine.",
      fix: inclutOvh && finStricte ? undefined : { host: domain, type: "TXT", value: "v=spf1 include:mx.ovh.com ~all" },
    });
  }

  // --- DKIM ----------------------------------------------------------------
  const dkimTrouves: string[] = [];
  for (const sel of selectors) {
    const records = await txt(`${sel}._domainkey.${domain}`);
    const cles = records.filter((r) => /(v=DKIM1|k=rsa|p=)/i.test(r));
    if (cles.length > 0) dkimTrouves.push(`${sel} : ${cles[0].slice(0, 60)}…`);
  }
  checks.push(
    dkimTrouves.length > 0
      ? {
          id: "dkim", label: "DKIM", status: "OK", found: dkimTrouves,
          detail: `Signature DKIM active (sélecteur${dkimTrouves.length > 1 ? "s" : ""} : ${dkimTrouves.map((d) => d.split(" :")[0]).join(", ")}).`,
        }
      : {
          id: "dkim", label: "DKIM", status: "MISSING", found: [],
          detail:
            `Aucune clé DKIM trouvée (${selectors.length} sélecteurs testés). ` +
            `Si un en-tête réel montre DKIM=PASS, relancer avec le sélecteur exact : ` +
            `npm run amyn -- dns ${domain} --selecteur=<valeur du tag s=>. ` +
            "Sans signature, une part importante des envois finira en indésirables.",
          fix: {
            host: `<sélecteur>._domainkey.${domain}`,
            type: "TXT",
            value: "Généré par OVHcloud : espace client → Emails → onglet DKIM → activer. OVHcloud pose l'enregistrement automatiquement si le DNS est chez eux.",
          },
        },
  );

  // --- DMARC ---------------------------------------------------------------
  const dmarcRecords = (await txt(`_dmarc.${domain}`)).filter((r) => /v=DMARC1/i.test(r));
  if (dmarcRecords.length === 0) {
    checks.push({
      id: "dmarc", label: "DMARC", status: "MISSING", found: [],
      detail: "Aucun DMARC : vous ne recevez aucun rapport et rien n'indique aux serveurs quoi faire d'un email non authentifié.",
      fix: {
        host: `_dmarc.${domain}`,
        type: "TXT",
        value: `v=DMARC1; p=none; rua=mailto:dmarc@${domain}; pct=100`,
      },
    });
  } else {
    const dmarc = dmarcRecords[0];
    const politique = /p=(none|quarantine|reject)/i.exec(dmarc)?.[1]?.toLowerCase() ?? "none";
    checks.push({
      id: "dmarc", label: "DMARC", status: "OK", found: dmarcRecords,
      detail:
        `DMARC présent, politique p=${politique}. ` +
        (politique === "none"
          ? "Mode observation : commencez ainsi, puis passez à quarantine une fois SPF et DKIM stables."
          : "Politique active."),
    });
  }

  const bloquants = checks.filter((c) => c.status === "MISSING" || c.status === "ERROR");
  const ready = bloquants.length === 0;

  return {
    domain,
    checks,
    ready,
    summary: ready
      ? `Les enregistrements d'authentification sont en place pour ${domain}.`
      : `${bloquants.length} enregistrement(s) à poser : ${bloquants.map((b) => b.label).join(", ")}.`,
    disclaimer: DISCLAIMER,
  };
}
