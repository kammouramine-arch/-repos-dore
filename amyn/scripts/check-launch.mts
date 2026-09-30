/**
 * Contrôle avant mise en ligne publique.
 *
 *   npm run check:launch
 *
 * Liste les informations légales obligatoires encore absentes (SIREN,
 * forme juridique, adresse, téléphone — LCEN art. 1-1), et vérifie
 * l'hébergeur et la configuration d'envoi des formulaires. Ne remplace pas
 * une relecture juridique.
 */
import { LEGAL_LABELS, hosting, missingLegalFields } from "../src/lib/legal.ts";

const problems: string[] = [
  ...missingLegalFields().map((k) => `Mentions légales — ${LEGAL_LABELS[k]}`),
  ...(hosting.verified ? [] : ["Hébergeur — adresse à vérifier (hosting.verified)"]),
  ...(process.env.SMTP_PASSWORD || process.env.RESEND_API_KEY
    ? []
    : ["Formulaires — ni SMTP_PASSWORD (mot de passe de contact@amyn.agency) ni RESEND_API_KEY dans cet environnement"]),
];

if (problems.length) {
  console.error("\nMise en ligne publique : informations manquantes\n");
  for (const p of problems) console.error(`  ✗ ${p}`);
  console.error("\nÀ renseigner dans src/lib/legal.ts (et les variables d'environnement).\n");
  process.exit(1);
}
console.log("✓ Informations légales et configuration complètes.");
