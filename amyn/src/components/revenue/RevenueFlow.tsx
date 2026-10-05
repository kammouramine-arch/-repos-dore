"use client";

import { useEffect, useRef, useState } from "react";
import { AmynMark } from "@/components/layout/Logo";
import { Check } from "@/components/ui/Icons";
import type { RevenueCopy } from "@/lib/revenue-os";

/**
 * Visuel du hero : une demande traverse Revenue OS.
 *
 * Une seule horloge (≈ 0,85 s par étape) fait avancer l'état ; tout le
 * reste est en transitions CSS (opacité, couleur, transform). L'horloge
 * s'arrête quand le visuel sort de l'écran ou que l'onglet est caché.
 * Avec « moins d'animations », le schéma complet est affiché, immobile.
 *
 * Étapes : 1 demande · 2-4 statuts · 5-7 actions · 8 opportunité · 9-11 pause.
 */
const LAST = 11;
const TICK = 850;

export function RevenueFlow({ t }: { t: RevenueCopy["flow"] }) {
  const [step, setStep] = useState(LAST);
  const host = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let visible = false;
    let timer = 0;
    const run = () => {
      window.clearInterval(timer);
      if (!visible || document.hidden) return;
      timer = window.setInterval(() => setStep((s) => (s >= LAST ? 0 : s + 1)), TICK);
    };
    /* Le schéma complet s'affiche d'abord (rendu serveur), puis l'animation
       repart du début au premier battement. */
    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      run();
    });
    if (host.current) io.observe(host.current);
    document.addEventListener("visibilitychange", run);
    return () => {
      window.clearInterval(timer);
      io.disconnect();
      document.removeEventListener("visibilitychange", run);
    };
  }, []);

  const on = (n: number) => step >= n;
  const flowing = (from: number, to: number) => step >= from && step < to;
  const stageFill = Math.max(0, Math.min(1, (step - 4) / 5));

  return (
    <div
      ref={host}
      role="img"
      aria-label={`${t.label} — ${t.aria}`}
      className="relative rounded-[1.5rem] border border-[rgb(242_238_230/0.1)] bg-[linear-gradient(160deg,rgb(242_238_230/0.055),rgb(242_238_230/0.012))] p-4 shadow-[0_40px_100px_-50px_rgb(0_0_0/0.9)] sm:p-6"
    >
      <span className="label inline-flex items-center gap-2 rounded-full border border-gold/40 px-3 py-1 text-[0.6875rem] text-gold-2">
        <span className="size-1.5 rounded-full bg-gold" />
        {t.label}
      </span>

      {/* 1 · La demande arrive */}
      <div
        className={`mt-5 flex items-start gap-3 rounded-[var(--radius-md)] border p-3.5 transition-[opacity,transform,border-color] duration-700 ease-[var(--ease-out)] ${
          on(1) ? "translate-y-0 border-gold/40 opacity-100" : "-translate-y-2 border-line opacity-40"
        } bg-[rgb(14_14_14/0.82)]`}
      >
        <span className="relative mt-1 flex size-2.5 shrink-0">
          {flowing(1, 3) && <span className="absolute inset-0 animate-ping rounded-full bg-gold/70 motion-reduce:hidden" />}
          <span className="relative size-2.5 rounded-full bg-gold" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-baseline justify-between gap-3">
            <span className="label text-[0.6875rem] text-fg-2">{t.leadSource}</span>
            <span className="font-mono text-[0.75rem] text-fg-3">{t.leadTime}</span>
          </span>
          <span className="mt-1.5 block truncate text-[0.875rem] text-fg">{t.leadText}</span>
        </span>
      </div>

      <Connector active={flowing(1, 4)} lit={on(2)} />

      {/* 2-4 · Revenue OS qualifie */}
      <div className="flex flex-col items-center gap-3 sm:flex-row sm:gap-5">
        <div
          className={`relative flex shrink-0 items-center gap-2.5 rounded-full border px-4 py-2.5 transition-[border-color,box-shadow] duration-700 ${
            on(2) ? "border-gold/70 shadow-[0_0_40px_-8px_rgb(198_167_106/0.55)]" : "border-line"
          } bg-[rgb(18_16_12/0.9)]`}
        >
          <AmynMark className="size-5 text-bone" />
          <span className="text-[0.9375rem] font-semibold tracking-[-0.02em] text-fg">{t.core}</span>
        </div>
        <ul className="flex flex-wrap justify-center gap-1.5 sm:justify-start">
          {t.statuses.map((s, i) => (
            <li
              key={s}
              className={`rounded-full border px-2.5 py-1 text-[0.75rem] transition-[opacity,transform,background-color,color,border-color] duration-500 ${
                on(2 + i)
                  ? i === 2
                    ? "scale-100 border-gold bg-gold text-ink opacity-100"
                    : "scale-100 border-gold/50 bg-[rgb(198_167_106/0.12)] text-gold-2 opacity-100"
                  : "scale-95 border-line text-fg-3 opacity-40"
              }`}
            >
              {s}
            </li>
          ))}
        </ul>
      </div>

      {/* 5-7 · Le système agit */}
      <div aria-hidden className="relative mx-auto mt-3 h-5 w-[calc(100%-4rem)] sm:w-[calc(100%-6rem)]">
        <span className={`absolute inset-x-0 top-1/2 h-px transition-colors duration-700 ${on(5) ? "bg-gold/60" : "bg-line"}`} />
        <span className={`absolute left-1/2 top-0 h-1/2 w-px transition-colors duration-700 ${on(5) ? "bg-gold/60" : "bg-line"}`} />
        {[0, 50, 100].map((x, i) => (
          <span key={x} className={`absolute top-1/2 h-1/2 w-px transition-colors duration-700 ${on(5 + i) ? "bg-gold/60" : "bg-line"}`} style={{ left: `${x}%` }} />
        ))}
      </div>
      <ul className="grid grid-cols-3 gap-2">
        {t.actions.map((a, i) => (
          <li
            key={a}
            className={`flex flex-col items-center gap-2 rounded-[var(--radius-md)] border px-2 py-3 text-center transition-[opacity,transform,border-color] duration-500 ${
              on(5 + i) ? "translate-y-0 border-gold/40 opacity-100" : "translate-y-1 border-line opacity-40"
            } bg-[rgb(14_14_14/0.82)]`}
          >
            <span
              className={`flex size-6 items-center justify-center rounded-full transition-colors duration-500 ${
                on(5 + i) ? "bg-gold text-ink" : "border border-line text-fg-3"
              }`}
            >
              <Check className="size-3.5" />
            </span>
            <span className="text-[0.75rem] leading-tight text-fg sm:text-[0.8125rem]">{a}</span>
          </li>
        ))}
      </ul>

      <Connector active={flowing(7, 9)} lit={on(8)} />

      {/* 8 · L'opportunité */}
      <div
        className={`flex items-center justify-between gap-4 rounded-[var(--radius-md)] border p-4 transition-[opacity,transform,border-color,box-shadow] duration-700 ease-[var(--ease-out)] ${
          on(8)
            ? "scale-100 border-gold/70 opacity-100 shadow-[0_20px_60px_-30px_rgb(198_167_106/0.6)]"
            : "scale-[0.98] border-line opacity-40"
        } bg-[linear-gradient(120deg,rgb(198_167_106/0.14),rgb(14_14_14/0.9))]`}
      >
        <span className="text-[0.9375rem] font-medium text-fg">{t.result}</span>
        <span className="font-mono text-[1.15rem] font-semibold text-gold-2">{t.resultValue}</span>
      </div>

      {/* Le parcours complet */}
      <div aria-hidden className="mt-5">
        <div className="relative h-px bg-line">
          <span
            className="absolute inset-y-0 left-0 bg-gradient-to-r from-gold/40 to-gold transition-[width] duration-700 ease-[var(--ease-out)]"
            style={{ width: `${stageFill * 100}%` }}
          />
        </div>
        <ol className="mt-2.5 flex justify-between gap-1">
          {t.stages.map((s, i) => (
            <li
              key={s}
              className={`text-[0.6875rem] transition-colors duration-500 ${
                stageFill * (t.stages.length - 1) >= i - 0.01 && step >= 4 ? "text-fg-2" : "text-fg-3/70"
              } ${i % 2 === 1 ? "max-sm:hidden" : ""}`}
            >
              {s}
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}

/** Liaison verticale ; une impulsion la parcourt quand l'étape est active. */
function Connector({ active, lit }: { active: boolean; lit: boolean }) {
  return (
    <div aria-hidden className="relative mx-auto my-1.5 h-7 w-px overflow-hidden">
      <span className={`absolute inset-0 transition-colors duration-700 ${lit ? "bg-gold/60" : "bg-line"}`} />
      {active && <span className="flow-pulse absolute left-1/2 top-0 size-1.5 -translate-x-1/2 rounded-full bg-gold-2 shadow-[0_0_10px_2px_rgb(198_167_106/0.6)]" />}
    </div>
  );
}
