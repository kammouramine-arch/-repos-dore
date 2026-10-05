import type { RevenueAudit } from "../../lib/audit/types.ts";
import { elanHabitatEn } from "./elan-habitat.en.ts";
import { elanHabitatFr } from "./elan-habitat.fr.ts";

/**
 * Exemples PUBLICS et FICTIFS uniquement (adresse /audit/<slug>).
 * Les audits de prospects réels ne sont jamais écrits ici : voir README.md
 * (audits scellés, `npm run audit:seal`).
 */
export const AUDITS: RevenueAudit[] = [elanHabitatFr, elanHabitatEn];
