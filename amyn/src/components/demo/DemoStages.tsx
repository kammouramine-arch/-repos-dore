"use client";

import { useEffect, useState, type ReactNode } from "react";
import { AmynMark } from "@/components/layout/Logo";
import { ButtonLink } from "@/components/ui/Button";
import { Check } from "@/components/ui/Icons";
import type { Locale } from "@/lib/i18n/config";
import { href } from "@/lib/i18n/routes";
import type { DemoCopy, DemoStageId } from "@/lib/revenue-demo";
import { site } from "@/lib/site";

/**
 * Les douze écrans de la démonstration. Chaque écran reçoit `k`, le nombre
 * d'étapes déjà jouées : tout ce qui apparaît dépend de `k`, en transitions
 * CSS. Un écran affiché avec `k` maximal est complet et immobile (rendu
 * serveur, « moins d'animations », pause).
 */

export type StageProps = { t: DemoCopy; k: number; locale: Locale; sampleHref: string };

/* --- Vocabulaire visuel --------------------------------------------------- */

const appear = (on: boolean) =>
  `transition-[opacity,transform] duration-500 ease-[var(--ease-out)] ${on ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-2 opacity-0"}`;
const lit = (on: boolean) => `transition-opacity duration-500 ${on ? "opacity-100" : "opacity-35"}`;
const panel = "rounded-[1.1rem] border border-line bg-[rgb(242_238_230/0.03)]";
const mono = "font-mono text-[0.6875rem] uppercase tracking-[0.14em] text-fg-3";

function Tick({ on, tone = "gold" }: { on: boolean; tone?: "gold" | "risk" }) {
  return (
    <span
      aria-hidden
      className={`flex size-5 shrink-0 items-center justify-center rounded-full transition-colors duration-500 ${
        on ? (tone === "risk" ? "bg-[#c9634f] text-ink" : "bg-gold text-ink") : "border border-line-strong text-transparent"
      }`}
    >
      <Check className="size-3" />
    </span>
  );
}

function Pill({ children, tone = "gold", className = "" }: { children: ReactNode; tone?: "gold" | "solid" | "risk" | "quiet"; className?: string }) {
  const tones = {
    gold: "border border-gold/50 bg-[rgb(198_167_106/0.1)] text-gold-2",
    solid: "bg-gold text-ink",
    risk: "border border-[rgb(220_140_120/0.6)] bg-[rgb(120_40_28/0.35)] text-[#f3c0b2]",
    quiet: "border border-line text-fg-2",
  };
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[0.6875rem] font-semibold uppercase tracking-[0.1em] ${tones[tone]} ${className}`}>
      {children}
    </span>
  );
}

/** Nombre qui monte jusqu'à sa valeur quand `on` devient vrai. */
export function Num({ value, on, locale, currency = false, duration = 1100 }: { value: number; on: boolean; locale: Locale; currency?: boolean; duration?: number }) {
  const [shown, setShown] = useState(on ? value : 0);
  useEffect(() => {
    if (!on) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let frame = 0;
    const start = performance.now();
    const step = (now: number) => {
      const p = reduced ? 1 : Math.min(1, (now - start) / duration);
      setShown(Math.round(value * (1 - Math.pow(1 - p, 3))));
      if (p < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => {
      cancelAnimationFrame(frame);
      setShown(0);
    };
  }, [on, value, duration]);
  const fmt = new Intl.NumberFormat(locale === "fr" ? "fr-FR" : "en-GB", currency ? { style: "currency", currency: "EUR", maximumFractionDigits: 0 } : {});
  return <span className="tabular-nums">{fmt.format(on ? shown : 0)}</span>;
}

/** Récit de l'écran (gauche sur ordinateur, haut sur téléphone). */
function Story({ kicker, title, caption, wide = false }: { kicker: string; title: string; caption: string; wide?: boolean }) {
  return (
    <div className={wide ? "max-w-3xl" : "lg:col-span-4"}>
      <p className="label text-gold">{kicker}</p>
      <h2 className="mt-3 text-[clamp(1.6rem,2.6vw,2.25rem)] font-semibold leading-[1.02] tracking-[-0.035em] text-fg">{title}</h2>
      <p className="mt-3 max-w-md text-[0.9375rem] leading-relaxed text-fg-2">{caption}</p>
    </div>
  );
}

function Split({ story, children }: { story: ReactNode; children: ReactNode }) {
  return (
    <div className="grid h-full gap-6 lg:grid-cols-12 lg:gap-8">
      {story}
      <div className="min-w-0 lg:col-span-8">{children}</div>
    </div>
  );
}

/* --- 00 · La demande ------------------------------------------------------ */

function Enquiry({ t: { enquiry: t }, k }: StageProps) {
  return (
    <Split story={<Story kicker={t.kicker} title={t.title} caption={t.caption} />}>
      <div className="flex flex-col items-stretch gap-3 lg:flex-row lg:items-center lg:gap-4">
        <ul className="flex flex-wrap gap-1.5 lg:w-36 lg:flex-col">
          {t.channels.map((c, i) => (
            <li key={c} className={`rounded-full border px-3 py-1.5 text-[0.75rem] transition-colors duration-500 ${i === 0 && k >= 1 ? "border-gold/60 text-fg" : "border-line text-fg-3"}`}>
              {c}
            </li>
          ))}
        </ul>

        <div className={`${panel} min-w-0 flex-1 p-4 sm:p-5 ${appear(k >= 1)} ${k >= 1 ? "" : "lg:-translate-x-3"}`}>
          <div className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-2 text-[0.75rem] text-fg-2">
              <span className="relative flex size-2">
                {k >= 1 && k < 3 && <span className="absolute inset-0 animate-ping rounded-full bg-gold/70 motion-reduce:hidden" />}
                <span className="relative size-2 rounded-full bg-gold" />
              </span>
              {t.source}
            </span>
            <span className="font-mono text-[0.75rem] text-gold">{t.time}</span>
          </div>
          <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-line pt-4">
            <div>
              <dt className={mono}>{t.customerLabel}</dt>
              <dd className="mt-1 text-[0.9375rem] font-medium text-fg">{t.customer}</dd>
            </div>
            <div>
              <dt className={mono}>{t.locationLabel}</dt>
              <dd className="mt-1 text-[0.9375rem] font-medium text-fg">{t.location}</dd>
            </div>
            <div className="col-span-2">
              <dt className={mono}>{t.messageLabel}</dt>
              <dd className="mt-1.5 font-serif text-[1.15rem] leading-snug text-fg">{t.message}</dd>
              {t.gloss && <dd className="mt-1.5 text-[0.8125rem] text-fg-3">{t.gloss}</dd>}
            </div>
          </dl>
        </div>

        {/* Liaison : verticale sur téléphone, horizontale sur ordinateur */}
        <div aria-hidden className="relative mx-auto h-8 w-px overflow-hidden lg:mx-0 lg:h-px lg:w-12">
          <span className={`absolute inset-0 transition-colors duration-700 ${k >= 2 ? "bg-gold/70" : "bg-line"}`} />
          {k === 2 && <span className="demo-travel absolute left-0 top-0 size-1.5 rounded-full bg-gold-2 shadow-[0_0_10px_2px_rgb(198_167_106/0.6)]" />}
        </div>

        <div className="flex flex-col items-center gap-2.5 lg:w-40">
          <span
            className={`flex items-center gap-2 rounded-full border px-4 py-2.5 transition-[border-color,box-shadow] duration-700 ${
              k >= 3 ? "border-gold/70 shadow-[0_0_40px_-8px_rgb(198_167_106/0.55)]" : "border-line"
            } bg-[rgb(18_16_12/0.9)]`}
          >
            <AmynMark className="size-5 text-bone" />
            <span className="text-[0.9375rem] font-semibold text-fg">Revenue OS</span>
          </span>
          <span className={appear(k >= 4)}>
            <Pill>
              <Check className="size-3" />
              {t.received}
            </Pill>
          </span>
        </div>
      </div>
    </Split>
  );
}

/* --- 01 · Réponse ---------------------------------------------------------- */

function ResponseStage({ t: { response: t }, k }: StageProps) {
  return (
    <Split story={<Story kicker={t.kicker} title={t.title} caption={t.caption} />}>
      <div className="grid gap-3 sm:grid-cols-[1fr_12rem]">
        <div className={`${panel} flex min-h-[19rem] flex-col overflow-hidden lg:h-[27rem]`}>
          <div className="flex items-center gap-2.5 border-b border-line px-4 py-3">
            <span aria-hidden className="flex size-7 items-center justify-center rounded-full bg-gold text-[0.6875rem] font-bold text-ink">ÉH</span>
            <span className="text-[0.8125rem] font-medium text-fg">{t.channel}</span>
            <span className="ml-auto font-mono text-[0.6875rem] text-gold">{t.time}</span>
          </div>
          <ol className="flex flex-1 flex-col justify-end gap-2.5 overflow-hidden p-3 sm:p-4">
            {t.messages.map((m, i) => {
              const os = m.from === "os";
              const on = k >= i + 1;
              return (
                <li key={i} className={`flex ${os ? "justify-start" : "justify-end"} ${on ? "" : "hidden"}`}>
                  <p
                    className={`demo-msg max-w-[88%] rounded-2xl px-3.5 py-2.5 text-[0.8125rem] leading-snug ${
                      os ? "rounded-bl-md border border-line bg-[rgb(242_238_230/0.05)] text-fg" : "rounded-br-md bg-bone text-ink"
                    }`}
                  >
                    {m.text}
                  </p>
                </li>
              );
            })}
            {k >= 1 && k < 6 && (
              <li aria-hidden className={`flex ${k % 2 === 1 ? "justify-end" : "justify-start"}`}>
                <span className="flex gap-1 rounded-full border border-line px-3 py-2">
                  {[0, 1, 2].map((d) => (
                    <span key={d} className="demo-dot size-1.5 rounded-full bg-fg-3" style={{ animationDelay: `${d * 140}ms` }} />
                  ))}
                </span>
              </li>
            )}
          </ol>
        </div>
        <div className={`${panel} p-4`}>
          <p className={mono}>{t.collectingLabel}</p>
          <ul className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2.5 sm:grid-cols-1">
            {t.collecting.map((c, i) => {
              const on = k >= t.collectedAfter[i];
              return (
                <li key={c} className={`flex items-center gap-2.5 text-[0.8125rem] ${lit(on)}`}>
                  <Tick on={on} />
                  <span className="text-fg">{c}</span>
                </li>
              );
            })}
          </ul>
          <p className="mt-4 border-t border-line pt-3 text-[0.75rem] leading-relaxed text-fg-3">{t.note}</p>
        </div>
      </div>
    </Split>
  );
}

/* --- 02 · Qualification ---------------------------------------------------- */

function Qualification({ t: { qualification: t }, k, locale }: StageProps) {
  const r = 42;
  const c = 2 * Math.PI * r;
  return (
    <Split story={<Story kicker={t.kicker} title={t.title} caption={t.caption} />}>
      <div className="grid gap-3 md:grid-cols-[1fr_14rem]">
        <dl className={`${panel} divide-y divide-line px-4 sm:px-5`}>
          {t.fields.map(([label, value], i) => (
            <div key={label} className={`grid gap-1 py-3 sm:grid-cols-[7.5rem_1fr] sm:gap-4 ${appear(k >= i + 1)}`}>
              <dt className={mono}>{label}</dt>
              <dd className="text-[0.9375rem] font-medium text-fg">{value}</dd>
            </div>
          ))}
        </dl>
        <div className="grid gap-3 max-md:grid-cols-2">
          <div className={`${panel} flex flex-col items-center justify-center p-4`}>
            <p className={mono}>{t.scoreLabel}</p>
            <div className="relative mt-2 size-28">
              <svg viewBox="0 0 100 100" className="size-full -rotate-90">
                <circle cx="50" cy="50" r={r} fill="none" stroke="rgb(242 238 230 / 0.1)" strokeWidth="6" />
                <circle
                  cx="50"
                  cy="50"
                  r={r}
                  fill="none"
                  stroke="var(--color-gold)"
                  strokeWidth="6"
                  strokeLinecap="round"
                  strokeDasharray={c}
                  strokeDashoffset={k >= 6 ? c * (1 - t.score / 100) : c}
                  className="transition-[stroke-dashoffset] duration-[1100ms] ease-[var(--ease-out)]"
                />
              </svg>
              <span className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-[1.9rem] font-semibold leading-none tracking-[-0.04em] text-fg">
                  <Num value={t.score} on={k >= 6} locale={locale} />
                </span>
                <span className="mt-1 text-[0.6875rem] text-fg-3">/ 100</span>
              </span>
            </div>
          </div>
          <div className={`${panel} flex flex-col justify-center gap-3 p-4`}>
            <div className={appear(k >= 7)}>
              <p className={mono}>{t.statusLabel}</p>
              <Pill tone="solid" className="mt-2">
                {t.status}
              </Pill>
            </div>
            <ul className={`space-y-1.5 ${appear(k >= 8)}`}>
              {t.factors.map(([f, ok]) => (
                <li key={f} className="flex items-center gap-2 text-[0.75rem] text-fg-2">
                  <span aria-hidden className={`size-1.5 shrink-0 rounded-full ${ok ? "bg-gold" : "border border-fg-3"}`} />
                  {f}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </Split>
  );
}

/* --- 03 · CRM ---------------------------------------------------------------- */

function Crm({ t: { crm: t }, k }: StageProps) {
  const synced = k >= t.fields.length + 1;
  return (
    <Split story={<Story kicker={t.kicker} title={t.title} caption={t.caption} />}>
      <div className={`${panel} overflow-hidden`}>
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-3 sm:px-5">
          <span className="text-[0.875rem] font-medium text-fg">{t.record}</span>
          <span className="font-mono text-[0.6875rem] text-fg-3">{t.recordId}</span>
        </div>
        <dl className="grid sm:grid-cols-2">
          {t.fields.map(([label, value], i) => {
            const on = k >= i + 1;
            return (
              <div key={label} className={`border-b border-line px-4 py-3 sm:px-5 sm:odd:border-r ${i === t.fields.length - 1 ? "sm:col-span-2" : ""}`}>
                <dt className={`${mono} flex items-center gap-2`}>
                  <span aria-hidden className={`size-1.5 rounded-full transition-colors duration-500 ${on ? "bg-gold" : "bg-line-strong"}`} />
                  {label}
                </dt>
                <dd className={`mt-1 min-h-[1.4em] text-[0.875rem] text-fg ${on ? "demo-type" : "opacity-0"}`}>{value}</dd>
              </div>
            );
          })}
        </dl>
        <div className="flex items-center justify-between gap-3 px-4 py-3 sm:px-5">
          <span className={appear(synced)}>
            <Pill tone="solid">
              <Check className="size-3" />
              {t.synced}
            </Pill>
          </span>
          <span className={`font-mono text-[0.75rem] text-gold ${appear(synced)}`}>{t.time}</span>
        </div>
      </div>
    </Split>
  );
}

/* --- 04 · Attribution -------------------------------------------------------- */

function Routing({ t: { routing: t }, k }: StageProps) {
  return (
    <Split story={<Story kicker={t.kicker} title={t.title} caption={t.caption} />}>
      <div className="grid gap-3 md:grid-cols-[1fr_15rem]">
        <ul className="grid grid-cols-2 gap-2.5">
          {t.team.map((p) => {
            const chosen = p.chosen && k >= 1;
            const dimmed = !p.chosen && k >= 1;
            return (
              <li
                key={p.name}
                className={`rounded-[1.1rem] border p-3.5 transition-[opacity,border-color,background-color,box-shadow] duration-700 sm:p-4 ${
                  chosen
                    ? "border-gold/70 bg-[rgb(198_167_106/0.1)] shadow-[0_20px_50px_-30px_rgb(198_167_106/0.7)]"
                    : `border-line bg-[rgb(242_238_230/0.03)] ${dimmed ? "opacity-40" : ""}`
                }`}
              >
                <span className="flex items-center gap-2.5">
                  <span aria-hidden className={`flex size-8 shrink-0 items-center justify-center rounded-full text-[0.8125rem] font-semibold ${chosen ? "bg-gold text-ink" : "bg-[rgb(242_238_230/0.08)] text-fg-2"}`}>
                    {p.name[0]}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[0.9375rem] font-medium text-fg">{p.name}</span>
                    <span className="block truncate text-[0.75rem] text-fg-3">{p.role}</span>
                  </span>
                </span>
                <span className="mt-3 block text-[0.75rem] text-fg-2">{p.detail}</span>
              </li>
            );
          })}
        </ul>
        <div className={`${panel} p-4`}>
          <p className={mono}>{t.reasonsLabel}</p>
          <ul className="mt-3 space-y-2.5">
            {t.reasons.map((r, i) => (
              <li key={r} className={`flex items-center gap-2.5 text-[0.8125rem] text-fg ${lit(k >= i + 2)}`}>
                <Tick on={k >= i + 2} />
                {r}
              </li>
            ))}
          </ul>
        </div>
        <div className={`md:col-span-2 ${appear(k >= 6)}`}>
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-[1.1rem] border border-gold/60 bg-[linear-gradient(110deg,rgb(198_167_106/0.16),rgb(14_14_14/0.9))] px-4 py-3">
            <span className="text-[0.9375rem] font-medium text-fg">{t.assigned}</span>
            <span className="font-mono text-[0.75rem] text-gold">{t.time}</span>
          </div>
        </div>
      </div>
    </Split>
  );
}

/* --- 05 · Brief -------------------------------------------------------------- */

function Brief({ t: { brief: t }, k }: StageProps) {
  return (
    <Split story={<Story kicker={t.kicker} title={t.title} caption={t.caption} />}>
      <article className="rounded-[1.1rem] border border-line bg-[rgb(242_238_230/0.045)] p-4 shadow-[0_30px_80px_-50px_rgb(0_0_0/0.9)] sm:p-6">
        <header className="flex flex-wrap items-baseline justify-between gap-2 border-b border-line pb-3">
          <span className="font-serif text-[1.35rem] leading-none text-fg">{t.doc}</span>
          <span className="text-[0.75rem] text-fg-3">{t.for}</span>
        </header>
        <div className="mt-4 grid gap-x-6 gap-y-4 sm:grid-cols-2">
          {t.sections.map((s, i) => (
            <section key={s.label} className={`${i === 0 ? "sm:col-span-2" : ""} ${appear(k >= i + 1)}`}>
              <h3 className={mono}>{s.label}</h3>
              {s.body && <p className="mt-1.5 text-[0.875rem] leading-relaxed text-fg">{s.body}</p>}
              {s.list && (
                <ul className="mt-1.5 space-y-1">
                  {s.list.map((x) => (
                    <li key={x} className="flex gap-2 text-[0.8125rem] leading-snug text-fg-2">
                      <span aria-hidden className="mt-[0.45rem] size-1 shrink-0 rounded-full bg-gold" />
                      {x}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ))}
        </div>
        <div className={`mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gold/60 bg-[rgb(198_167_106/0.1)] px-4 py-3 ${appear(k >= 5)}`}>
          <span className={mono}>{t.nextLabel}</span>
          <span className="text-[0.9375rem] font-semibold text-fg">{t.next}</span>
        </div>
        <p className={`mt-3 text-[0.6875rem] text-fg-3 ${appear(k >= 6)}`}>{t.footer}</p>
      </article>
    </Split>
  );
}

/* --- 06 · Rendez-vous -------------------------------------------------------- */

function Appointment({ t: { appointment: t }, k }: StageProps) {
  return (
    <Split story={<Story kicker={t.kicker} title={t.title} caption={t.caption} />}>
      <div className="grid gap-3 md:grid-cols-[1fr_15rem]">
        <div className={`${panel} p-4`}>
          <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
            {t.days.map((d, di) => (
              <div key={d.day} className="min-w-0">
                <p className="text-center font-mono text-[0.6875rem] text-fg-3">{d.day}</p>
                <ul className="mt-2 space-y-1.5">
                  {d.slots.map((s, si) => {
                    const chosen = di === t.chosenDay && si === t.chosenSlot && k >= 1;
                    return (
                      <li
                        key={s}
                        className={`rounded-lg border px-1 py-2 text-center font-mono text-[0.6875rem] transition-[background-color,border-color,color,transform] duration-500 sm:text-[0.75rem] ${
                          chosen ? "scale-105 border-gold bg-gold font-semibold text-ink" : k >= 2 ? "border-line text-fg-3 opacity-50" : "border-line-strong text-fg-2"
                        }`}
                      >
                        {s}
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
          <p className={`mt-3 text-[0.8125rem] text-fg-2 ${appear(k >= 1)}`}>{t.picked}</p>
          <div className={`mt-3 rounded-xl border border-gold/60 bg-[linear-gradient(110deg,rgb(198_167_106/0.16),rgb(14_14_14/0.9))] px-4 py-3 ${appear(k >= 2)}`}>
            <Pill tone="solid">
              <Check className="size-3" />
              {t.booked}
            </Pill>
            <p className="mt-2 text-[0.875rem] text-fg">{t.bookedDetail}</p>
          </div>
        </div>
        <div className="grid gap-3">
          <ul className={`${panel} space-y-2.5 p-4`}>
            {t.effects.map((e, i) => (
              <li key={e} className={`flex items-center gap-2.5 text-[0.8125rem] text-fg ${lit(k >= i + 3)}`}>
                <Tick on={k >= i + 3} />
                {e}
              </li>
            ))}
          </ul>
          <div className={`rounded-[1.1rem] border border-gold/50 p-4 ${appear(k >= 8)}`}>
            <p className={mono}>{t.statLabel}</p>
            <p className="mt-1.5 text-[2.1rem] font-semibold leading-none tracking-[-0.04em] text-gold-2">{t.stat}</p>
            <p className="mt-2 text-[0.75rem] italic text-fg-3">{t.statNote}</p>
          </div>
        </div>
      </div>
    </Split>
  );
}

/* --- 07 · Après l'appel ------------------------------------------------------ */

function AfterCall({ t: { aftercall: t }, k }: StageProps) {
  return (
    <Split story={<Story kicker={t.kicker} title={t.title} caption={t.caption} />}>
      <div>
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <Pill tone="quiet">
            <Check className="size-3" />
            {t.done}
          </Pill>
          <span className={appear(k >= 7)}>
            <Pill>{t.human}</Pill>
          </span>
        </div>
        <ul className="grid gap-2 sm:grid-cols-2">
          {t.items.map((it, i) => (
            <li key={it.label} className={`${panel} p-3.5 ${appear(k >= i + 1)} ${it.approval ? "border-gold/40" : ""}`}>
              <div className="flex items-center justify-between gap-2">
                <h3 className={mono}>{it.label}</h3>
                {it.approval && (
                  <span
                    className={`rounded-full px-2 py-0.5 text-[0.6875rem] font-semibold uppercase tracking-[0.08em] transition-colors duration-500 ${
                      k >= 7 && i === 3 ? "bg-gold text-ink" : "border border-gold/50 text-gold-2"
                    }`}
                  >
                    {it.approval}
                  </span>
                )}
              </div>
              <p className="mt-1.5 text-[0.8125rem] leading-snug text-fg">{it.body}</p>
            </li>
          ))}
        </ul>
      </div>
    </Split>
  );
}

/* --- 08 · Proposition -------------------------------------------------------- */

function Proposal({ t: { proposal: t }, k }: StageProps) {
  return (
    <Split story={<Story kicker={t.kicker} title={t.title} caption={t.caption} />}>
      <div className="grid gap-3 md:grid-cols-[15rem_1fr]">
        <div className={`rounded-[1.1rem] border border-line bg-[rgb(242_238_230/0.045)] p-4 ${appear(k >= 1)}`}>
          <p className={mono}>{t.doc}</p>
          <p className="mt-1 text-[0.8125rem] text-fg-2">{t.customer}</p>
          <p className="mt-5 text-[2.3rem] font-semibold leading-none tracking-[-0.04em] text-fg">{t.amount}</p>
          <div className={`mt-4 ${appear(k >= 2)}`}>
            <Pill tone="solid">{t.status}</Pill>
          </div>
        </div>
        <div className={`${panel} p-4`}>
          <ol className="relative space-y-3">
            <span aria-hidden className="absolute bottom-2 left-[0.5625rem] top-2 w-px bg-line" />
            {t.timeline.map((s, i) => {
              const on = k >= i + 3;
              const risk = s.kind === "risk";
              return (
                <li key={s.day} className={`relative flex items-start gap-3 ${lit(on)}`}>
                  <Tick on={on} tone={risk ? "risk" : "gold"} />
                  <span className="min-w-0">
                    <span className={`block font-mono text-[0.6875rem] ${risk ? "text-[#f3c0b2]" : "text-gold"}`}>{s.day}</span>
                    <span className={`block text-[0.875rem] ${risk ? "font-semibold uppercase tracking-[0.04em] text-[#f3c0b2]" : "text-fg"}`}>{s.label}</span>
                  </span>
                </li>
              );
            })}
          </ol>
          <div className={`mt-4 rounded-xl border border-gold/60 bg-[rgb(198_167_106/0.1)] px-4 py-3 ${appear(k >= 7)}`}>
            <p className={mono}>{t.nextLabel}</p>
            <p className="mt-1 text-[0.9375rem] font-semibold text-fg">{t.next}</p>
          </div>
        </div>
        <p className={`text-[1.05rem] font-semibold tracking-[-0.015em] text-gold-2 md:col-span-2 ${appear(k >= 7)}`}>{t.emphasis}</p>
      </div>
    </Split>
  );
}

/* --- 09 · Réactivation ------------------------------------------------------- */

function Reactivation({ t: { reactivation: t }, k, locale }: StageProps) {
  return (
    <div className="grid h-full gap-5 lg:grid-cols-12 lg:gap-8">
      <div className="lg:col-span-12">
        <Story kicker={t.kicker} title={t.title} caption={t.caption} wide />
      </div>
      <div className={`${panel} min-w-0 overflow-hidden lg:col-span-7`}>
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-3">
          <span className="text-[0.8125rem] text-fg-2">{t.crm}</span>
          <span className="text-[1.15rem] font-semibold text-fg">
            <Num value={t.count} on={k >= 1} locale={locale} />
          </span>
        </div>
        <div className={`flex flex-wrap gap-1.5 border-b border-line px-4 py-2.5 ${appear(k >= 2)}`}>
          {t.filters.map((f) => (
            <span key={f} className="rounded-full border border-gold/40 px-2.5 py-1 text-[0.6875rem] text-gold-2">
              {f}
            </span>
          ))}
        </div>
        <ul>
          {t.rows.map((row, i) => {
            const hl = i === t.highlight && k >= 3;
            return (
              <li
                key={row[0]}
                className={`grid grid-cols-[1fr_auto] gap-x-3 border-b border-line px-4 py-2.5 text-[0.8125rem] transition-[background-color,opacity] duration-500 last:border-0 sm:grid-cols-[9rem_1fr_7rem] ${
                  hl ? "bg-[rgb(198_167_106/0.12)]" : k >= 3 ? "opacity-40" : ""
                }`}
              >
                <span className={`font-medium ${hl ? "text-fg" : "text-fg-2"}`}>{row[0]}</span>
                <span className="text-right text-fg-3 sm:order-last">{row[2]}</span>
                <span className="col-span-2 text-fg-3 sm:col-span-1">
                  {row[1]} · <span className={hl ? "text-gold-2" : ""}>{row[3]}</span>
                </span>
              </li>
            );
          })}
        </ul>
      </div>
      <div className="grid min-w-0 content-start gap-3 lg:col-span-5">
        <ol className={`${panel} grid grid-cols-2 gap-x-3 gap-y-2 p-4`}>
          <li className={`${mono} col-span-2`}>{t.workflowLabel}</li>
          {t.workflow.map((w, i) => (
            <li key={w} className={`flex items-center gap-2 text-[0.75rem] leading-tight text-fg ${lit(k >= i + 4)}`}>
              <Tick on={k >= i + 4} />
              {w}
            </li>
          ))}
        </ol>
        <div className={appear(k >= 8)}>
          <p className="ml-auto w-fit max-w-[92%] rounded-2xl rounded-br-md bg-bone px-4 py-2.5 font-serif text-[1.05rem] leading-snug text-ink">{t.reply}</p>
          {t.replyGloss && <p className="mt-1 text-right text-[0.75rem] text-fg-3">{t.replyGloss}</p>}
        </div>
        <ul className="grid grid-cols-2 gap-2">
          {t.outcomes.map((o, i) => (
            <li key={o} className={`flex items-center gap-2 rounded-xl border border-gold/40 px-3 py-2 text-[0.75rem] text-fg ${appear(k >= i + 9)}`}>
              <Check className="size-3.5 shrink-0 text-gold" />
              {o}
            </li>
          ))}
        </ul>
        <p className={`text-[0.6875rem] leading-relaxed text-fg-3 ${appear(k >= 8)}`}>{t.note}</p>
      </div>
    </div>
  );
}

/* --- 10 · Vue direction ------------------------------------------------------ */

function Dashboard({ t: { dashboard: t }, k, locale }: StageProps) {
  const max = Math.max(...t.funnel.map(([, v]) => v));
  return (
    <div className="flex h-full flex-col gap-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <Story kicker={t.kicker} title={t.title} caption={t.caption} wide />
        <span className={`self-start lg:self-auto ${lit(k >= 4 || k === 0)}`}>
          <Pill>{t.tag}</Pill>
        </span>
      </div>
      <figure className="overflow-hidden rounded-[1.1rem] border border-line bg-[rgb(12_12_12/0.85)]">
        <dl className="grid grid-cols-2 gap-px bg-line sm:grid-cols-4 lg:grid-cols-7">
          {t.metrics.map((m, i) => (
            <div key={m.label} className={`bg-[rgb(12_12_12)] px-3.5 py-3.5 ${i === 6 ? "col-span-2 sm:col-span-1" : ""}`}>
              <dt className="text-[0.6875rem] leading-tight text-fg-3">{m.label}</dt>
              <dd className={`mt-1.5 text-[1.35rem] font-semibold leading-none tracking-[-0.03em] ${m.alert ? "text-[#efb3a2]" : m.gold ? "text-gold-2" : "text-fg"}`}>
                <Num value={m.value} on={k >= 1} locale={locale} currency={m.currency} />
              </dd>
            </div>
          ))}
        </dl>
        <div className="grid gap-px bg-line md:grid-cols-2">
          <div className="bg-[rgb(12_12_12)] p-4">
            <p className={mono}>{t.funnelLabel}</p>
            <ul className="mt-3 space-y-2.5">
              {t.funnel.map(([label, v]) => (
                <li key={label} className="grid grid-cols-[6.5rem_1fr_2.5rem] items-center gap-3 text-[0.8125rem]">
                  <span className="text-fg-2">{label}</span>
                  <span className="h-2 overflow-hidden rounded-full bg-[rgb(242_238_230/0.07)]">
                    <span
                      className="block h-full origin-left rounded-full bg-gradient-to-r from-gold/70 to-gold transition-transform duration-[1100ms] ease-[var(--ease-out)]"
                      style={{ transform: `scaleX(${k >= 2 ? v / max : 0})` }}
                    />
                  </span>
                  <span className="text-right font-mono text-fg">{v}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="bg-[rgb(12_12_12)] p-4">
            <p className={mono}>{t.riskLabel}</p>
            <ul className="mt-2">
              {t.risks.map(([who, what], i) => (
                <li key={who} className={`flex items-start gap-2.5 border-b border-line py-2 last:border-0 ${appear(k >= 3)}`} style={{ transitionDelay: `${i * 120}ms` }}>
                  <span aria-hidden className={`mt-1.5 size-1.5 shrink-0 rounded-full ${i === 0 ? "bg-[#e08b7a]" : "bg-gold"}`} />
                  <span>
                    <span className="block text-[0.8125rem] text-fg">{who}</span>
                    <span className="block text-[0.75rem] text-fg-3">{what}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </figure>
    </div>
  );
}

/* --- 11 · Le système ---------------------------------------------------------- */

/* Positions des nœuds autour du cœur (en % du carré). Les libellés courts
   sont placés aux extrémités gauche et droite pour ne jamais déborder. */
const NODE_POS: [number, number][] = [
  [50, 11],
  [80, 23],
  [87, 50],
  [80, 77],
  [50, 89],
  [20, 77],
  [13, 50],
  [20, 23],
];
/* Ordre d'affichage des libellés : index dans `nodes`. */
const NODE_ORDER = [0, 1, 3, 4, 7, 5, 2, 6];

function Finale({ t, k, locale, sampleHref }: StageProps) {
  const f = t.finale;
  return (
    <div className="grid h-full items-center gap-6 lg:grid-cols-12 lg:gap-10">
      <div className="relative mx-auto aspect-square w-full max-w-[24rem] lg:col-span-6 lg:max-w-[30rem]">
        <svg aria-hidden viewBox="0 0 100 100" className="absolute inset-0 size-full">
          {NODE_POS.map(([x, y], i) => (
            <g key={i}>
              <line
                x1="50"
                y1="50"
                x2={x}
                y2={y}
                pathLength={1}
                stroke="rgb(198 167 106 / 0.45)"
                strokeWidth="0.35"
                strokeDasharray="1"
                strokeDashoffset={k >= 2 ? 0 : 1}
                className="transition-[stroke-dashoffset] duration-700 ease-[var(--ease-out)]"
                style={{ transitionDelay: `${i * 70}ms` }}
              />
              {k >= 3 && <line x1="50" y1="50" x2={x} y2={y} pathLength={1} stroke="rgb(245 228 190)" strokeWidth="0.6" strokeLinecap="round" className="demo-flow" style={{ animationDelay: `${i * 180}ms` }} />}
            </g>
          ))}
        </svg>
        {NODE_POS.map(([x, y], i) => (
          <span
            key={i}
            className={`absolute -translate-x-1/2 -translate-y-1/2 whitespace-nowrap rounded-full border border-line-strong bg-[rgb(16_16_16/0.95)] px-2.5 py-1.5 text-[0.6875rem] text-fg transition-[opacity,transform] duration-500 sm:px-3 sm:text-[0.8125rem] ${
              k >= 1 ? "scale-100 opacity-100" : "scale-90 opacity-0"
            }`}
            style={{ left: `${x}%`, top: `${y}%`, transitionDelay: `${i * 60}ms` }}
          >
            {f.nodes[NODE_ORDER[i]]}
          </span>
        ))}
        <span className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center gap-2 rounded-full border border-gold/70 bg-[rgb(18_16_12/0.95)] px-4 py-2.5 shadow-[0_0_60px_-10px_rgb(198_167_106/0.6)]">
          <AmynMark className="size-5 text-bone" />
          <span className="whitespace-nowrap text-[0.875rem] font-semibold text-fg sm:text-[1rem]">{f.core}</span>
        </span>
      </div>

      <div className="lg:col-span-6">
        <p className="text-[clamp(2.2rem,4.6vw,3.9rem)] font-semibold leading-[0.95] tracking-[-0.045em] text-fg">
          {f.lines.map((l, i) => (
            <span key={l} className={`block ${appear(k >= 4)}`} style={{ transitionDelay: `${i * 140}ms` }}>
              {i === 2 ? <em className="accent text-gold-2">{l}</em> : l}
            </span>
          ))}
        </p>
        <div className={`mt-6 border-t border-line pt-5 ${appear(k >= 5)}`}>
          <p className="text-[1.15rem] font-semibold tracking-[-0.02em] text-fg">{f.brand}</p>
          <p className="mt-1 font-serif text-[1.25rem] text-fg-2">{f.tagline}</p>
        </div>
        <div className={`mt-6 flex flex-col gap-3 sm:flex-row sm:items-center ${appear(k >= 6)}`}>
          <ButtonLink href={href("revenueAudit", locale)} className="!min-h-12" track="revenue_audit_clicked_from_demo" trackPlace="demo_finale">
            {f.primary}
          </ButtonLink>
          <a
            href={`mailto:${site.email}?subject=Revenue%20OS`}
            data-track="contact_clicked_from_demo"
            data-track-place="demo_finale"
            className="inline-flex min-h-12 items-center justify-center rounded-full border border-line-strong px-6 text-[0.9375rem] font-medium text-fg transition-colors hover:border-gold/60"
          >
            {f.secondary}
          </a>
        </div>
        <a href={sampleHref} className={`link-line mt-5 inline-flex min-h-11 items-center text-[0.875rem] text-fg-2 ${appear(k >= 6)}`}>
          {f.sample}
        </a>
      </div>
    </div>
  );
}

export const STAGE_COMPONENTS: Record<DemoStageId, (p: StageProps) => ReactNode> = {
  enquiry: Enquiry,
  response: ResponseStage,
  qualification: Qualification,
  crm: Crm,
  routing: Routing,
  brief: Brief,
  appointment: Appointment,
  aftercall: AfterCall,
  proposal: Proposal,
  reactivation: Reactivation,
  dashboard: Dashboard,
  finale: Finale,
};

/** Horodatage affiché dans la barre de l'espace, pour chaque écran. */
export function stageTime(t: DemoCopy, id: DemoStageId): string {
  if (id === "finale") return "—";
  return t[id].time;
}
