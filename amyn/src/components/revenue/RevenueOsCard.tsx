import Link from "next/link";
import { ArrowUpRight } from "@/components/ui/Icons";
import type { Locale } from "@/lib/i18n/config";
import { href } from "@/lib/i18n/routes";
import { getUi } from "@/lib/i18n/ui";
import { getRevenue } from "@/lib/revenue-os";

/**
 * Carte de l'offre phare, en tête des capacités (page Services) : même
 * matière que la carte ProofSprint, un cran plus affirmée.
 */
export function RevenueOsCard({ locale, className = "" }: { locale: Locale; className?: string }) {
  const r = getRevenue(locale);
  return (
    <Link
      href={href("revenueOs", locale)}
      data-reveal
      data-track="revenue_os_cta_clicked"
      data-track-place="services_card"
      className={`group relative flex flex-col gap-6 overflow-hidden rounded-[1.5rem] border border-gold/40 bg-[linear-gradient(140deg,rgb(198_167_106/0.12),rgb(242_238_230/0.02)_55%)] p-6 shadow-[0_40px_100px_-50px_rgb(0_0_0/0.9)] transition-[border-color,transform] duration-500 ease-[var(--ease-out)] hover:-translate-y-1 hover:border-gold/70 sm:flex-row sm:items-center sm:gap-10 sm:p-10 ${className}`}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute -right-24 -top-28 size-80 rounded-full bg-[radial-gradient(closest-side,rgb(198_167_106/0.2),transparent_70%)]"
      />
      <span className="relative min-w-0 flex-1">
        <span className="label inline-flex items-center gap-2 text-gold">
          <span aria-hidden className="size-1.5 rounded-full bg-gold" />
          {r.intro.eyebrow}
        </span>
        <span className="mt-4 block text-[clamp(1.9rem,4.4vw,3.2rem)] font-semibold leading-none tracking-[-0.045em] text-bone">
          AMYN Revenue OS<sup className="ml-0.5 align-super text-[0.35em] font-normal text-gold">™</sup>
        </span>
        <span className="mt-4 block max-w-2xl text-[1.05rem] leading-relaxed text-bone-2">{r.intro.lead}</span>
        <span className="mt-5 flex flex-wrap gap-2">
          {r.page.facts.map((f) => (
            <span key={f} className="rounded-full border border-[rgb(242_238_230/0.14)] px-3.5 py-1.5 text-[0.875rem] text-bone-2">
              {f}
            </span>
          ))}
        </span>
      </span>
      <span className="relative inline-flex items-center gap-3 text-[0.9375rem] font-medium text-bone">
        {getUi(locale).cta.revenueOs}
        <span
          aria-hidden
          className="flex size-12 items-center justify-center rounded-full bg-gold text-ink transition-transform duration-500 ease-[var(--ease-spring)] group-hover:rotate-45"
        >
          <ArrowUpRight className="size-5" />
        </span>
      </span>
    </Link>
  );
}
