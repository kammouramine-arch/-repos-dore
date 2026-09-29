/**
 * Tarification — configuration centrale.
 *
 * Tous les services passent par ici pour afficher un prix. Changer de
 * modèle (devis → « à partir de » → prix fixe) se fait donc en modifiant
 * une valeur, sans toucher à une seule page.
 *
 * AU LANCEMENT : tous les services sont en `quote` (sur devis). Aucun
 * montant n'est renseigné, et aucun ne doit l'être tant qu'il n'a pas été
 * validé — ni mention HT/TTC, ni taux de TVA : ce sont des informations
 * fiscales qui dépendent du statut de l'entreprise.
 */

export type PricingMode = "quote" | "startingFrom" | "fixed";

export type Pricing = {
  mode: PricingMode;
  /** Montant pour `fixed` ou `startingFrom`, en unités (ex. 1200). */
  amount?: number;
  currency?: "EUR";
  /** Mention fiscale validée (« HT », « TTC »…). Vide tant qu'elle ne l'est pas. */
  taxLabel?: string;
  /** Faux : le service n'affiche aucune mention de prix. */
  visible: boolean;
};

export const QUOTE_LABELS = { fr: "Sur devis", en: "Priced on quote" } as const;
export const QUOTE_LABEL = QUOTE_LABELS.fr;

/** Le prix par défaut de tout service : sur devis, affiché comme tel. */
export const DEFAULT_PRICING: Pricing = { mode: "quote", visible: true };

const formatAmount = (amount: number, currency = "EUR", locale: "fr" | "en" = "fr") =>
  new Intl.NumberFormat(locale === "en" ? "en-GB" : "fr-FR", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  })
    .format(amount)
    /* Intl insère des espaces insécables fines : on les garde insécables
       mais on uniformise pour des rendus identiques partout. */
    .replace(/ /g, " ");

/**
 * Libellé de prix à afficher, ou `null` si rien ne doit l'être.
 *
 * Un mode incomplet (montant absent) retombe sur « Sur devis » plutôt que
 * d'afficher un prix vide ou faux.
 */
export function priceLabel(pricing: Pricing, locale: "fr" | "en" = "fr"): string | null {
  if (!pricing.visible) return null;
  if (pricing.mode === "quote" || pricing.amount == null) return QUOTE_LABELS[locale];

  const amount = formatAmount(pricing.amount, pricing.currency, locale);
  const tax = pricing.taxLabel ? ` ${pricing.taxLabel}` : "";
  if (pricing.mode !== "startingFrom") return `${amount}${tax}`;
  return locale === "en" ? `From ${amount}${tax}` : `À partir de ${amount}${tax}`;
}
