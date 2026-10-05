import type { RevenueAudit } from "../../lib/audit/types.ts";
import { elanHabitatEn } from "./elan-habitat.en.ts";
import { elanHabitatFr } from "./elan-habitat.fr.ts";

/**
 * Tous les Revenue Audit publiés. Un audit = un fichier, ajouté ici.
 * Ce module n'est importé que par le serveur (voir lib/audit/registry.ts)
 * et par les tests : il ne doit jamais l'être par un composant client.
 */
export const AUDITS: RevenueAudit[] = [elanHabitatFr, elanHabitatEn];
