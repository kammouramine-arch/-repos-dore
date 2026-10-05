import type { Locale } from "@/lib/i18n/config";
import type { RevenueCopy } from "@/lib/revenue-os";
import { CountUp } from "./CountUp";

/**
 * Vue direction — un espace Revenue OS ILLUSTRATIF. Les chiffres sont
 * fictifs et l'étiquette le dit en tête du panneau : ce ne sont ni des
 * résultats d'AMYN, ni ceux d'un client.
 */
export function RevenueDashboard({ t, locale }: { t: RevenueCopy["dashboard"]; locale: Locale }) {
  const max = Math.max(...t.pipeline.map(([, v]) => v));
  return (
    <figure className="overflow-hidden rounded-[1.5rem] border border-[rgb(242_238_230/0.1)] bg-[rgb(12_12_12/0.92)] shadow-[0_50px_120px_-50px_rgb(0_0_0/0.95)]">
      <figcaption className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4 sm:px-7">
        <span className="label inline-flex items-center gap-2 rounded-full border border-gold/40 px-3 py-1 text-[0.6875rem] text-gold-2">
          <span aria-hidden className="size-1.5 rounded-full bg-gold" />
          {t.tag}
        </span>
        <span className="text-[0.8125rem] text-fg-3">{t.period}</span>
      </figcaption>

      <dl className="grid grid-cols-2 gap-px bg-line sm:grid-cols-3 lg:grid-cols-6">
        {t.metrics.map((m) => (
          <div key={m.label} className="bg-[rgb(12_12_12)] px-5 py-5 sm:px-6">
            <dt className="text-[0.8125rem] text-fg-3">{m.label}</dt>
            <dd className={`mt-2 text-[clamp(1.5rem,3vw,2rem)] font-semibold leading-none tracking-[-0.03em] ${m.alert ? "text-[#efb3a2]" : "text-fg"}`}>
              <CountUp value={m.value} locale={locale} currency={m.currency} />
            </dd>
          </div>
        ))}
      </dl>

      <div className="grid gap-px bg-line lg:grid-cols-2">
        <div className="bg-[rgb(12_12_12)] p-5 sm:p-7">
          <p className="label text-fg-3">{t.pipelineTitle}</p>
          <ul className="mt-5 space-y-3">
            {t.pipeline.map(([stage, v]) => (
              <li key={stage} className="grid grid-cols-[7.5rem_1fr_2rem] items-center gap-3 text-[0.875rem]">
                <span className="text-fg-2">{stage}</span>
                <span aria-hidden className="h-2 overflow-hidden rounded-full bg-[rgb(242_238_230/0.06)]">
                  <span data-reveal="fade" className="block h-full rounded-full bg-gradient-to-r from-gold/50 to-gold" style={{ width: `${(v / max) * 100}%` }} />
                </span>
                <span className="text-right font-mono text-fg">{v}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="bg-[rgb(12_12_12)] p-5 sm:p-7">
          <p className="label text-fg-3">{t.riskTitle}</p>
          <ul className="mt-4">
            {t.risks.map(([what, why]) => (
              <li key={what} className="flex items-start gap-3 border-b border-line py-3.5 last:border-0">
                <span aria-hidden className="mt-1.5 size-2 shrink-0 rounded-full bg-[#e8a08c]" />
                <span>
                  <span className="block text-[0.9375rem] text-fg">{what}</span>
                  <span className="block text-[0.8125rem] text-fg-3">{why}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </figure>
  );
}
