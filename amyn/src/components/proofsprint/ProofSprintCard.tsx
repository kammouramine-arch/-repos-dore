import Link from "next/link";
import { ArrowUpRight } from "@/components/ui/Icons";
import type { Locale } from "@/lib/i18n/config";
import { href } from "@/lib/i18n/routes";
import { getProofSprint } from "@/lib/proofsprint";

/**
 * Carte ProofSprint, à côté des services existants (accueil, page
 * Services). Même matière que les autres cartes du site : bord fin, voile
 * clair, coins arrondis ; le laiton signale l'offre sans crier.
 */
export function ProofSprintCard({ locale, className = "" }: { locale: Locale; className?: string }) {
  const t = getProofSprint(locale).card;
  return (
    <Link
      href={href("proofsprint", locale)}
      data-reveal
      className={`group relative flex flex-col gap-6 overflow-hidden rounded-[1.5rem] border border-[rgb(242_238_230/0.1)] bg-[linear-gradient(160deg,rgb(242_238_230/0.05),rgb(242_238_230/0.015))] p-6 shadow-[0_40px_100px_-50px_rgb(0_0_0/0.9)] transition-[border-color,transform] duration-500 ease-[var(--ease-out)] hover:-translate-y-1 hover:border-gold/40 sm:flex-row sm:items-center sm:gap-10 sm:p-8 ${className}`}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute -right-20 -top-24 size-72 rounded-full bg-[radial-gradient(closest-side,rgb(198_167_106/0.14),transparent_70%)]"
      />
      <span className="relative min-w-0 flex-1">
        <span className="label inline-flex items-center gap-2 text-gold">
          <span aria-hidden className="size-1.5 rounded-full bg-gold" />
          {t.label}
        </span>
        <span className="mt-4 block text-[clamp(1.6rem,3.6vw,2.6rem)] font-semibold leading-none tracking-[-0.04em] text-bone">
          ProofSprint
        </span>
        <span className="mt-4 block max-w-2xl text-[1rem] leading-relaxed text-bone-2">{t.summary}</span>
        <span className="mt-5 flex flex-wrap gap-2">
          {t.facts.map((f) => (
            <span key={f} className="rounded-full border border-[rgb(242_238_230/0.12)] px-3.5 py-1.5 text-[0.875rem] text-bone-2">
              {f}
            </span>
          ))}
        </span>
      </span>
      <span className="relative inline-flex items-center gap-3 text-[0.9375rem] font-medium text-bone">
        {t.cta}
        <span
          aria-hidden
          className="flex size-12 items-center justify-center rounded-full border border-gold/60 text-gold-2 transition-[background-color,color,transform] duration-500 ease-[var(--ease-spring)] group-hover:rotate-45 group-hover:bg-gold group-hover:text-ink"
        >
          <ArrowUpRight className="size-5" />
        </span>
      </span>
    </Link>
  );
}
