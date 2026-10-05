"use client";

import { useMemo, useRef, useState } from "react";
import { track } from "@/lib/analytics";
import type { AuditCopy } from "@/lib/audit/copy";
import { ROI_KEYS, modelRoi, type RoiInputs } from "@/lib/audit/model";
import type { AuditLocale, RoiAssumption, RoiInputKey, RoiScenarios, ScenarioLevers } from "@/lib/audit/types";

/**
 * Modèle économique, modifiable en séance.
 *
 * Les valeurs de départ viennent de l'audit, chacune avec son origine
 * (communiquée / hypothèse). Toute valeur modifiée devient « modifiée en
 * séance ». Une valeur absente reste vide : le modèle ne s'affiche pas
 * tant qu'une hypothèse indispensable manque.
 */
type Copy = AuditCopy["roi"];
const SCENARIOS = ["conservative", "central", "upside"] as const;
const LEVERS: (keyof ScenarioLevers)[] = ["qualificationLift", "closeLift", "reactivationRate"];

const toText = (v: number | null) => (v === null ? "" : String(v));
const toNumber = (s: string): number | null => {
  const n = Number(s.replace(",", ".").replace(/\s/g, ""));
  return s.trim() === "" || !Number.isFinite(n) ? null : n;
};

export function RoiModeller({ copy: t, locale, assumptions, scenarios }: { copy: Copy; locale: AuditLocale; assumptions: RoiAssumption[]; scenarios: RoiScenarios }) {
  const initial = useMemo(() => Object.fromEntries(ROI_KEYS.map((k) => [k, toText(assumptions.find((a) => a.key === k)?.value ?? null)])) as Record<RoiInputKey, string>, [assumptions]);
  const [values, setValues] = useState(initial);
  const initialLevers = useMemo(
    () => Object.fromEntries(SCENARIOS.flatMap((sc) => LEVERS.map((l) => [`${sc}.${l}`, String(scenarios[sc][l])]))) as Record<string, string>,
    [scenarios],
  );
  const [leverText, setLeverText] = useState(initialLevers);
  const levers = Object.fromEntries(
    SCENARIOS.map((sc) => [sc, Object.fromEntries(LEVERS.map((l) => [l, toNumber(leverText[`${sc}.${l}`]) ?? 0]))]),
  ) as unknown as RoiScenarios;
  const [changed, setChanged] = useState<Set<string>>(new Set());
  const interacted = useRef(false);

  const note = () => {
    if (interacted.current) return;
    interacted.current = true;
    track("roi_interacted");
  };

  const inputs = Object.fromEntries(ROI_KEYS.map((k) => [k, toNumber(values[k])])) as RoiInputs;
  const result = modelRoi(inputs, levers);

  const tag = locale === "fr" ? "fr-FR" : "en-GB";
  const eur = new Intl.NumberFormat(tag, { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
  const num = new Intl.NumberFormat(tag, { maximumFractionDigits: 0 });
  const signed = (v: number) => (v > 0 ? "+" : v < 0 ? "−" : "") + eur.format(Math.abs(v));

  const max = result ? Math.max(result.baseline.revenue, ...SCENARIOS.map((s) => result.scenarios[s].revenue)) || 1 : 1;
  const columns = result
    ? [
        { id: "baseline", customers: result.baseline.customers, revenue: result.baseline.revenue, incremental: null, margin: null },
        ...SCENARIOS.map((s) => ({ id: s, customers: result.scenarios[s].customers, revenue: result.scenarios[s].revenue, incremental: result.scenarios[s].incremental, margin: result.scenarios[s].incrementalMargin })),
      ]
    : [];
  const marginKnown = inputs.grossMargin !== null;

  function reset() {
    setValues(initial);
    setLeverText(initialLevers);
    setChanged(new Set());
  }

  return (
    <div className="grid gap-6 lg:grid-cols-12 lg:gap-8">
      {/* Hypothèses */}
      <div className="audit-avoid lg:col-span-5">
        <div className="rounded-[1.25rem] border border-line bg-surface p-5 sm:p-6">
          <p className="label text-fg-3">{t.assumptions}</p>
          <ul className="mt-4 space-y-4">
            {ROI_KEYS.map((k) => {
              const a = assumptions.find((x) => x.key === k);
              const origin = changed.has(k) ? "session" : (a?.origin ?? "hypothesis");
              const empty = values[k].trim() === "";
              const id = `roi-${k}`;
              return (
                <li key={k}>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <label htmlFor={id} className="text-[0.875rem] font-medium text-fg">
                      {t.inputs[k].label}
                    </label>
                    <span
                      className={`rounded-full px-2 py-0.5 font-mono text-[0.6875rem] font-semibold uppercase tracking-[0.12em] ${
                        origin === "provided" ? "border border-fg/60 text-fg" : origin === "session" ? "bg-[var(--audit-gold)] text-ink" : "border border-dashed border-fg/50 text-fg-2"
                      }`}
                    >
                      {t.origin[origin]}
                    </span>
                  </div>
                  <div className={`mt-1.5 flex items-center rounded-lg border bg-canvas ${empty ? "border-dashed border-[var(--audit-risk)]" : "border-line-strong"}`}>
                    <input
                      id={id}
                      inputMode="decimal"
                      value={values[k]}
                      placeholder={t.missing}
                      onChange={(e) => {
                        note();
                        setValues((v) => ({ ...v, [k]: e.target.value }));
                        setChanged((c) => new Set(c).add(k));
                      }}
                      className="w-full min-w-0 bg-transparent px-3 py-2 font-mono text-[0.9375rem] text-fg outline-none placeholder:text-[var(--audit-risk)]"
                    />
                    {t.inputs[k].unit && <span className="pr-3 font-mono text-[0.8125rem] text-fg-3">{t.inputs[k].unit}</span>}
                  </div>
                  {a?.note && <p className="mt-1 text-[0.6875rem] text-fg-3">{a.note}</p>}
                </li>
              );
            })}
          </ul>

          <p className="label mt-7 text-fg-3">{t.levers}</p>
          <table className="mt-3 w-full text-[0.75rem]">
            <thead>
              <tr className="text-fg-3">
                <th className="pb-2 text-left font-normal" />
                {SCENARIOS.map((s) => (
                  <th key={s} scope="col" className="pb-2 text-right font-normal">
                    {t.scenarios[s]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {LEVERS.map((l) => (
                <tr key={l} className="border-t border-line">
                  <th scope="row" className="py-1.5 pr-2 text-left font-normal text-fg-2">
                    {t.leverLabels[l]}
                  </th>
                  {SCENARIOS.map((s) => (
                    <td key={s} className="py-1.5 pl-1.5">
                      <input
                        aria-label={`${t.leverLabels[l]} — ${t.scenarios[s]}`}
                        inputMode="decimal"
                        value={leverText[`${s}.${l}`]}
                        onChange={(e) => {
                          note();
                          const text = e.target.value;
                          setLeverText((v) => ({ ...v, [`${s}.${l}`]: text }));
                          setChanged((c) => new Set(c).add(`lever-${s}-${l}`));
                        }}
                        className="w-full rounded-md border border-line-strong bg-canvas px-2 py-1 text-right font-mono text-fg outline-none"
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>

          {changed.size > 0 && (
            <button type="button" onClick={reset} data-print-hide="" className="mt-5 text-[0.8125rem] text-fg underline underline-offset-4">
              {t.reset}
            </button>
          )}
        </div>
      </div>

      {/* Résultats */}
      <div className="audit-avoid lg:col-span-7">
        <p className="rounded-xl border-2 border-[var(--audit-gold)] px-4 py-3 text-[0.9375rem] font-semibold text-fg">{t.disclaimer}</p>
        {!result ? (
          <p className="mt-5 rounded-xl border border-dashed border-[var(--audit-risk)] p-5 text-fg-2">{t.needInputs}</p>
        ) : (
          <>
            <div className="mt-5 grid grid-cols-2 gap-3 xl:grid-cols-4 print:grid-cols-4">
              {columns.map((c) => (
                <div key={c.id} className={`rounded-[1.1rem] border p-4 ${c.id === "central" ? "border-fg/40 bg-surface" : "border-line"}`}>
                  <p className="label text-fg-3">{t.scenarios[c.id as keyof Copy["scenarios"]]}</p>
                  <p className="mt-3 text-[0.6875rem] text-fg-3">{t.customers}</p>
                  <p className="font-mono text-[1.1rem] text-fg">{num.format(c.customers)}</p>
                  <p className="mt-2 text-[0.6875rem] text-fg-3">{t.revenue}</p>
                  <p className="text-[1.15rem] font-semibold tracking-[-0.02em] text-fg">{eur.format(c.revenue)}</p>
                  {c.incremental !== null && (
                    <>
                      <p className="mt-2 text-[0.6875rem] text-fg-3">{t.incremental}</p>
                      <p className="font-mono text-[0.9375rem] text-accent">{signed(c.incremental)}</p>
                      <p className="mt-2 text-[0.6875rem] text-fg-3">{t.margin}</p>
                      <p className="font-mono text-[0.8125rem] text-fg-2">{c.margin === null ? t.marginMissing : signed(c.margin)}</p>
                    </>
                  )}
                </div>
              ))}
            </div>
            <ul className="mt-6 space-y-2.5" aria-hidden>
              {columns.map((c) => (
                <li key={c.id} className="grid grid-cols-[6.5rem_1fr] items-center gap-3 text-[0.75rem] sm:grid-cols-[8rem_1fr]">
                  <span className="text-fg-2">{t.scenarios[c.id as keyof Copy["scenarios"]]}</span>
                  <span className="h-2.5 overflow-hidden rounded-full bg-line">
                    <span
                      className={`block h-full rounded-full transition-[width] duration-500 ${c.id === "baseline" ? "bg-fg-3" : "bg-[var(--audit-gold)]"}`}
                      style={{ width: `${(c.revenue / max) * 100}%` }}
                    />
                  </span>
                </li>
              ))}
            </ul>
            {!marginKnown && <p className="mt-4 text-[0.8125rem] text-fg-3">{t.marginMissing}.</p>}
          </>
        )}
        <p className="mt-5 text-[0.8125rem] leading-relaxed text-fg-3">{t.formula}</p>
      </div>
    </div>
  );
}
