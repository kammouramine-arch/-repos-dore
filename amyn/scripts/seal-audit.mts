/**
 * Scelle un Revenue Audit (JSON en clair, gardé HORS du dépôt) et publie
 * sa version chiffrée dans src/content/audits/sealed/.
 *
 *   npm run audit:seal -- private-audits/acme.json
 *   npm run audit:seal -- private-audits/acme.json --id <identifiant>   (nouvelle clé, même adresse : l'ancien lien cesse de fonctionner)
 *
 * Affiche le lien privé à transmettre au prospect. La clé n'est écrite
 * nulle part ailleurs : conservez le lien dans un endroit sûr.
 */
import fs from "node:fs";
import path from "node:path";
import { isSealedId, sealAudit, validateAudit } from "../src/lib/audit/seal.ts";

const args = process.argv.slice(2);
const file = args.find((a) => !a.startsWith("--") && args[args.indexOf(a) - 1] !== "--id");
const idArg = args.includes("--id") ? args[args.indexOf("--id") + 1] : undefined;

if (!file) {
  console.error("Usage : npm run audit:seal -- <audit.json> [--id <identifiant>]");
  process.exit(1);
}
const root = path.resolve(import.meta.dirname, "..");
const abs = path.resolve(file);
if (abs.startsWith(path.join(root, "src"))) {
  console.error("Le fichier en clair ne doit pas se trouver dans src/ (il serait publié). Utilisez private-audits/.");
  process.exit(1);
}
if (idArg && !isSealedId(idArg)) {
  console.error("Identifiant invalide (32 caractères hexadécimaux).");
  process.exit(1);
}

try {
  const audit = validateAudit({ ...JSON.parse(fs.readFileSync(abs, "utf8")), slug: idArg ?? "pending" });
  const { sealed, key } = await sealAudit(audit, idArg);
  const out = path.join(root, "src/content/audits/sealed", `${sealed.id}.json`);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, JSON.stringify(sealed, null, 2) + "\n");
  const base = sealed.locale === "en" ? "/en" : "";
  console.log(`\nAudit scellé : ${path.relative(root, out)}`);
  console.log(`Entreprise   : ${audit.company.name} (${audit.locale}, ${audit.status})`);
  console.log(`\nLien privé (à transmettre, à conserver en lieu sûr) :\nhttps://www.amyn.agency${base}/audit/p/${sealed.id}#k=${key}\n`);
  console.log("Publication : commit du fichier scellé, puis déploiement.");
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
