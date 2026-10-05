import { site } from "./site.ts";

/**
 * Prise de rendez-vous commerciale — UNE seule configuration pour tous les
 * appels à échanger avec AMYN (« Réserver une session d'architecture
 * Revenue », « Parler à AMYN »…).
 *
 * Aucun lien de réservation n'est configuré aujourd'hui : les boutons
 * ouvrent un e-mail à contact@amyn.agency. Pour brancher un outil de
 * réservation, renseigner son adresse ici (ou la variable d'environnement
 * NEXT_PUBLIC_REVENUE_ARCHITECTURE_BOOKING_URL, prioritaire) : tous les
 * boutons l'ouvriront directement. Seules les adresses https:// sont
 * acceptées.
 */
export const revenueArchitectureBookingUrl: string | null = null;

function configuredUrl(): string | null {
  const raw = process.env.NEXT_PUBLIC_REVENUE_ARCHITECTURE_BOOKING_URL?.trim() || revenueArchitectureBookingUrl;
  if (!raw) return null;
  try {
    const url = new URL(raw);
    return url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

export type SalesSessionLink = { href: string; external: boolean; kind: "booking" | "email" };

/** Lien d'un appel à échanger : réservation si configurée, sinon e-mail. */
export function salesSessionLink(subject: string): SalesSessionLink {
  const url = configuredUrl();
  if (url) return { href: url, external: true, kind: "booking" };
  return { href: `mailto:${site.email}?subject=${encodeURIComponent(subject)}`, external: false, kind: "email" };
}
