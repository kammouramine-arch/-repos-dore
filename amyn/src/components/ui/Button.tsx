import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowRight } from "./Icons";

type Variant = "primary" | "secondary" | "text";

/**
 * Trois niveaux d'action :
 *  - primary   : l'action du site, « Recevoir un premier aperçu » ;
 *  - secondary : une exploration (« Voir les réalisations ») ;
 *  - text      : un lien discret.
 *
 * Les deux premiers sont des boutons « application » : lumière qui suit le
 * curseur, attraction magnétique, enfoncement puis ressort à l'appui (voir
 * `.btn` dans globals.css et Interactions.tsx).
 */
export function buttonClass(variant: Variant = "primary", className = "", size: "md" | "sm" = "md") {
  if (variant === "text") {
    return `group inline-flex min-h-11 items-center gap-2 text-[0.9375rem] font-medium text-fg transition-colors ${className}`;
  }
  return `btn group ${variant === "primary" ? "btn-primary" : "btn-secondary"} ${size === "sm" ? "btn-sm" : ""} ${className}`;
}

export function ButtonLink({
  href,
  children,
  variant = "primary",
  size = "md",
  arrow = true,
  className = "",
}: {
  href: string;
  children: ReactNode;
  variant?: Variant;
  size?: "md" | "sm";
  arrow?: boolean;
  className?: string;
}) {
  return (
    <Link
      href={href}
      data-magnetic={variant === "text" ? undefined : ""}
      className={buttonClass(variant, className, size)}
    >
      <span className={variant === "text" ? "link-line" : undefined}>{children}</span>
      {arrow && <ArrowRight className="nudge size-4 shrink-0" />}
    </Link>
  );
}
