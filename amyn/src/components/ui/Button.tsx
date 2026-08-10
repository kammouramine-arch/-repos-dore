import { ArrowRight } from "lucide-react";

type Variant = "gold" | "ghost";

/**
 * Bouton d'AMYN. Deux variantes seulement :
 *  - "gold"  : l'action principale. Un seul par écran, sinon l'or perd sa valeur.
 *  - "ghost" : l'action secondaire, en filet fin.
 *
 * Les micro-interactions sont en CSS pur (survol, flèche qui avance) :
 * c'est plus fluide et ça ne coûte rien au chargement.
 */
export function Button({
  href,
  children,
  variant = "gold",
  arrow = true,
  className = "",
}: {
  href: string;
  children: React.ReactNode;
  variant?: Variant;
  arrow?: boolean;
  className?: string;
}) {
  const base =
    "group relative inline-flex items-center justify-center gap-3 overflow-hidden rounded-full px-7 py-4 " +
    "font-display text-[0.8125rem] font-semibold uppercase tracking-[0.18em] " +
    "transition-[transform,color,background-color,border-color] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] " +
    "active:scale-[0.98] motion-reduce:transition-none";

  const skin =
    variant === "gold"
      ? "bg-gold text-ink hover:bg-gold-light"
      : "border border-bone/20 text-bone hover:border-gold/60 hover:text-gold";

  return (
    <a href={href} className={`${base} ${skin} ${className}`}>
      {/* Reflet métallique qui balaie le bouton au survol. */}
      {variant === "gold" && (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/45 to-transparent transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:translate-x-full motion-reduce:hidden"
        />
      )}

      <span className="relative">{children}</span>

      {arrow && (
        <ArrowRight
          className="relative size-4 transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:translate-x-1 motion-reduce:transition-none"
          strokeWidth={2}
        />
      )}
    </a>
  );
}
