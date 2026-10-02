"use client";

import { useState } from "react";
import type { Locale } from "@/lib/i18n/config";
import { CALC_DEFAULTS, CALC_LIMITS, computeCapacity, getDemo } from "@/lib/proofsprint-demo";

type Field = "hours" | "rate" | "share";

/**
 * Calculateur de capacité : trois hypothèses visibles, une formule écrite
 * en clair, et un résultat net qui peut être négatif — il reste affiché.
 */
export function CapacityCalculator({ locale }: { locale: Locale }) {
  const t = getDemo(locale).calc;
  const [raw, setRaw] = useState<Record<Field, string>>({
    hours: String(CALC_DEFAULTS.hours),
    rate: String(CALC_DEFAULTS.rate),
    share: String(CALC_DEFAULTS.share),
  });
  const num = (f: Field) => Number(raw[f].replace(",", ".")) || 0;
  const result = computeCapacity({ hours: num("hours"), rate: num("rate"), share: num("share") });
  const intl = locale === "fr" ? "fr-FR" : "en-GB";
  const eur = (n: number) =>
    new Intl.NumberFormat(intl, { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);
  const hoursFmt = (n: number) => new Intl.NumberFormat(intl, { maximumFractionDigits: 1 }).format(n);

  const fields: { key: Field; label: string; max: number; step: number }[] = [
    { key: "hours", label: t.hours, max: CALC_LIMITS.hours, step: 1 },
    { key: "rate", label: t.rate, max: CALC_LIMITS.rate, step: 5 },
    { key: "share", label: t.share, max: CALC_LIMITS.share, step: 5 },
  ];

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <fieldset className="rounded-[var(--radius-md)] border border-line p-6 sm:p-7">
        <legend className="px-1 font-medium text-fg">{t.inputs}</legend>
        <div className="grid gap-5">
          {fields.map((f) => (
            <div key={f.key}>
              <label htmlFor={`calc-${f.key}`} className="flex items-baseline justify-between gap-3 text-[0.9375rem] font-medium text-fg">
                {f.label}
                <span className="label text-[0.6875rem] text-fg-3">{t.assumption}</span>
              </label>
              <input
                id={`calc-${f.key}`}
                type="number"
                inputMode="decimal"
                min={0}
                max={f.max}
                step={f.step}
                value={raw[f.key]}
                onChange={(e) => setRaw((r) => ({ ...r, [f.key]: e.target.value }))}
                className="mt-2.5 block w-full rounded-[var(--radius-sm)] border border-line bg-surface px-4 py-3.5 font-mono text-[1rem] text-fg focus:border-accent"
              />
            </div>
          ))}
        </div>
        <p className="mt-6 text-[0.875rem] leading-relaxed text-fg-2">{t.formula}</p>
      </fieldset>

      <div className="rounded-[var(--radius-md)] border border-line bg-[linear-gradient(160deg,rgb(242_238_230/0.05),rgb(242_238_230/0.012))] p-6 sm:p-7">
        <div aria-live="polite" aria-atomic="true">
          <p className="label text-fg-3">{t.capacity}</p>
          <output htmlFor="calc-hours calc-rate calc-share" data-testid="capacity" className="mt-2 block text-[clamp(2.2rem,5vw,3rem)] font-semibold leading-none tracking-[-0.04em] text-fg">
            {eur(result.capacity)}
          </output>
          <p className="mt-6 text-fg-2">
            {t.net}
            {locale === "fr" ? "\u00a0:" : ":"}{" "}
            <output data-testid="net" className={`font-mono font-semibold ${result.net < 0 ? "text-[#f3c0b2]" : "text-[#b9e2c8]"}`}>
              {eur(result.net)}
            </output>
          </p>
          <p data-testid="breakeven" className="mt-2 text-[0.9375rem] text-fg-2">
            {result.breakEvenHours === null ? t.noBreakEven : t.breakEven(hoursFmt(result.breakEvenHours))}
          </p>
        </div>
        <div className="mt-6 border-t border-line pt-5">
          <p className="label text-fg-3">{t.interpretation}</p>
          <p data-testid="interpretation" className="mt-2 text-fg">
            {result.coversFee ? t.above : t.below}
          </p>
          <p className="mt-3 text-[0.875rem] leading-relaxed text-fg-2">{t.caveat}</p>
        </div>
      </div>
    </div>
  );
}
