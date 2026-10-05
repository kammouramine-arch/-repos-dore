"use client";

import { useRef, useState } from "react";
import { ButtonLink } from "@/components/ui/Button";
import { track } from "@/lib/analytics";
import type { Locale } from "@/lib/i18n/config";
import { OPPORTUNITY_DEFAULTS, OPPORTUNITY_LIMITS, computeOpportunity, type RevenueCopy } from "@/lib/revenue-os";

type Field = "enquiries" | "value" | "conversion" | "lost";

/**
 * Calculateur d'opportunité : quatre hypothèses, une formule écrite en
 * clair, un ordre de grandeur. Toujours présenté comme un scénario
 * illustratif, jamais comme une promesse.
 */
export function OpportunityCalculator({ t, locale, auditHref }: { t: RevenueCopy["calculator"]; locale: Locale; auditHref: string }) {
  const [raw, setRaw] = useState<Record<Field, string>>({
    enquiries: String(OPPORTUNITY_DEFAULTS.enquiries),
    value: String(OPPORTUNITY_DEFAULTS.value),
    conversion: String(OPPORTUNITY_DEFAULTS.conversion),
    lost: String(OPPORTUNITY_DEFAULTS.lost),
  });
  const reported = useRef(false);
  const num = (f: Field) => Number(raw[f].replace(/\s/g, "").replace(",", ".")) || 0;
  const r = computeOpportunity({ enquiries: num("enquiries"), value: num("value"), conversion: num("conversion"), lost: num("lost") });
  const intl = locale === "fr" ? "fr-FR" : "en-GB";
  const eur = new Intl.NumberFormat(intl, { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
  const dec = new Intl.NumberFormat(intl, { maximumFractionDigits: 1 });

  const fields: { key: Field; label: string; max: number; step: number; hint?: string }[] = [
    { key: "enquiries", label: t.enquiries, max: OPPORTUNITY_LIMITS.enquiries, step: 1 },
    { key: "value", label: t.value, max: OPPORTUNITY_LIMITS.value, step: 500 },
    { key: "conversion", label: t.conversion, max: OPPORTUNITY_LIMITS.conversion, step: 1 },
    { key: "lost", label: t.lost, max: OPPORTUNITY_LIMITS.lost, step: 1, hint: t.lostHint },
  ];

  const update = (f: Field, v: string) => {
    setRaw((prev) => ({ ...prev, [f]: v }));
    if (!reported.current) {
      reported.current = true;
      track("roi_calculator_completed", { calculator: "revenue_opportunity", lang: locale });
    }
  };

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <fieldset className="rounded-[var(--radius-md)] border border-line p-5 sm:p-7">
        <legend className="px-1 font-medium text-fg">{t.inputs}</legend>
        <div className="grid gap-5 sm:grid-cols-2">
          {fields.map((f) => (
            <div key={f.key} className={f.hint ? "sm:col-span-2" : ""}>
              <label htmlFor={`opp-${f.key}`} className="block text-[0.9375rem] font-medium text-fg">
                {f.label}
              </label>
              <input
                id={`opp-${f.key}`}
                type="number"
                inputMode="decimal"
                min={0}
                max={f.max}
                step={f.step}
                value={raw[f.key]}
                onChange={(e) => update(f.key, e.target.value)}
                aria-describedby={f.hint ? `opp-${f.key}-hint` : undefined}
                className="mt-2.5 block w-full rounded-[var(--radius-sm)] border border-line bg-surface px-4 py-3.5 font-mono text-[1rem] text-fg focus:border-accent"
              />
              {f.hint && (
                <p id={`opp-${f.key}-hint`} className="mt-2 text-[0.8125rem] text-fg-3">
                  {f.hint}
                </p>
              )}
            </div>
          ))}
        </div>
        <p className="mt-6 text-[0.875rem] leading-relaxed text-fg-2">{t.formula}</p>
      </fieldset>

      <div className="flex flex-col rounded-[var(--radius-md)] border border-gold/40 bg-[linear-gradient(150deg,rgb(198_167_106/0.1),rgb(14_14_14/0.7))] p-5 sm:p-7">
        <span className="label inline-flex w-fit items-center gap-2 rounded-full border border-gold/40 px-3 py-1 text-[0.6875rem] text-gold-2">
          <span aria-hidden className="size-1.5 rounded-full bg-gold" />
          {t.tag}
        </span>
        <div aria-live="polite" aria-atomic="true" className="mt-6">
          <p className="text-fg-2">{t.result}</p>
          <output data-testid="opportunity" htmlFor="opp-enquiries opp-value opp-conversion opp-lost" className="mt-2 block text-[clamp(2.4rem,6vw,3.6rem)] font-semibold leading-none tracking-[-0.04em] text-fg tabular-nums">
            {eur.format(r.annual)}
          </output>
          <dl className="mt-6 grid grid-cols-2 gap-4 border-t border-line pt-5">
            <div>
              <dt className="text-[0.8125rem] text-fg-3">{t.monthlyLost}</dt>
              <dd data-testid="monthly-lost" className="mt-1 font-mono text-[1.1rem] text-fg">{dec.format(r.monthlyLost)}</dd>
            </div>
            <div>
              <dt className="text-[0.8125rem] text-fg-3">{t.customers}</dt>
              <dd data-testid="customers" className="mt-1 font-mono text-[1.1rem] text-fg">{dec.format(r.customersPerYear)}</dd>
            </div>
          </dl>
        </div>
        <p className="mt-6 text-[0.8125rem] leading-relaxed text-fg-2">{t.disclaimer}</p>
        <div className="mt-auto pt-7">
          <ButtonLink href={auditHref} variant="secondary" className="border-gold/60" track="revenue_audit_cta_clicked" trackPlace="calculator">
            {t.cta}
          </ButtonLink>
        </div>
      </div>
    </div>
  );
}
