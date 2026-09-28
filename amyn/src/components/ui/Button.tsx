import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowRight } from "./Icons";

type Variant = "primary" | "secondary" | "text";

/**
 * Trois niveaux d'action, jamais plus :
 *  - primary   : l'action principale de l'écran (« Recevoir un premier aperçu ») ;
 *  - secondary : l'alternative (« Parler de votre projet ») ;
 *  - text      : un lien d'exploration (« Découvrir nos services »).
 *
 * Les couleurs viennent du ton de la section : un bouton principal est
 * clair sur fond noir, foncé sur fond clair, sans qu'on ait à le dire.
 */
const skins: Record<Variant, string> = {
  primary:
    "min-h-12 rounded-full bg-[var(--btn-bg)] px-6 text-[var(--btn-fg)] hover:bg-[var(--btn-hover-bg)] hover:text-[var(--btn-hover-fg)] sm:px-7",
  secondary:
    "min-h-12 rounded-full border border-line-strong px-6 text-fg hover:border-fg sm:px-7",
  text: "min-h-11 text-fg",
};

export function buttonClass(variant: Variant = "primary", className = "") {
  return [
    "group inline-flex items-center justify-center gap-2.5 whitespace-nowrap text-[0.9375rem] font-medium tracking-[-0.005em]",
    "transition-[background-color,color,border-color,transform] duration-500 ease-[var(--ease-out)] active:scale-[0.985]",
    skins[variant],
    className,
  ].join(" ");
}

export function ButtonLink({
  href,
  children,
  variant = "primary",
  arrow = true,
  className = "",
}: {
  href: string;
  children: ReactNode;
  variant?: Variant;
  arrow?: boolean;
  className?: string;
}) {
  return (
    <Link href={href} className={buttonClass(variant, className)}>
      <span className={variant === "text" ? "link-line" : undefined}>{children}</span>
      {arrow && <ArrowRight className="nudge size-4 shrink-0" />}
    </Link>
  );
}
