import type { ReactNode } from "react";
import type { TrackEvent } from "@/lib/analytics";
import { salesSessionLink } from "@/lib/booking";

/**
 * Bouton « échanger avec AMYN » : ouvre l'outil de réservation s'il est
 * configuré (lib/booking.ts), sinon un e-mail à contact@amyn.agency.
 */
export function SalesSessionLink({
  subject,
  track,
  place,
  className,
  children,
}: {
  subject: string;
  track: TrackEvent;
  place: string;
  className?: string;
  children: ReactNode;
}) {
  const link = salesSessionLink(subject);
  return (
    <a
      href={link.href}
      data-track={track}
      data-track-place={place}
      data-booking={link.kind}
      className={className}
      {...(link.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
    >
      {children}
    </a>
  );
}
