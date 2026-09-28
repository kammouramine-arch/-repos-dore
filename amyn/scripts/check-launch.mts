/**
 * Contrôle avant mise en ligne publique.
 *
 *   npm run check:launch
 *
 * Échoue tant qu'une information légale obligatoire ou une clause
 * contractuelle manque, ou que l'adresse de l'hébergeur n'a pas été
 * vérifiée. Ne remplace pas une relecture juridique : il empêche seulement
 * de publier des emplacements « [À COMPLÉTER] ».
 */
import {
  LEGAL_LABELS,
  TERMS_LABELS,
  hosting,
  missingLegalFields,
  missingTerms,
} from "../src/lib/legal.ts";

const problems: string[] = [
  ...missingLegalFields().map((k) => `Mentions légales — ${LEGAL_LABELS[k]}`),
  ...missingTerms().map((k) => `Conditions des services — ${TERMS_LABELS[k]}`),
  ...(hosting.verified ? [] : ["Hébergeur — adresse à vérifier (hosting.verified)"]),
  ...(process.env.RESEND_API_KEY ? [] : ["Formulaires — RESEND_API_KEY absente de cet environnement"]),
];

if (problems.length) {
  console.error("\nMise en ligne publique : informations manquantes\n");
  for (const p of problems) console.error(`  ✗ ${p}`);
  console.error("\nÀ renseigner dans src/lib/legal.ts (et les variables d'environnement).\n");
  process.exit(1);
}
console.log("✓ Informations légales et configuration complètes.");
