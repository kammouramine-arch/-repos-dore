// ---------------------------------------------------------------------------
// REGISTRE DES REGLES D'AUDIT
//
// Ajouter une regle = creer son fichier + ajouter une ligne ici.
// Aucune autre partie du moteur ne change.
// ---------------------------------------------------------------------------

import type { AuditRule } from "../types";
import { websitePresence, siteReachable, httpsRule } from "./presence";
import { viewportRule } from "./mobile";
import { clickToCallRule, emailOnSiteRule, contactFormRule, whatsappRule } from "./contact";
import { bookingRule, ctaRule } from "./conversion";
import { localInfoRule, openingHoursRule, legalNoticeRule, googleBusinessRule } from "./local";
import {
  performanceRule,
  titleRule,
  metaDescriptionRule,
  brokenLinksRule,
  legacyTechRule,
} from "./technique";

export const ALL_RULES: AuditRule[] = [
  websitePresence,
  siteReachable,
  httpsRule,
  viewportRule,
  clickToCallRule,
  emailOnSiteRule,
  contactFormRule,
  whatsappRule,
  bookingRule,
  ctaRule,
  localInfoRule,
  openingHoursRule,
  legalNoticeRule,
  googleBusinessRule,
  performanceRule,
  titleRule,
  metaDescriptionRule,
  brokenLinksRule,
  legacyTechRule,
].sort((a, b) => a.order - b.order);

export function getRule(id: string): AuditRule | undefined {
  return ALL_RULES.find((r) => r.id === id);
}
