"use client";

import { useEffect, useRef, useState } from "react";
import { Check } from "@/components/ui/Icons";
import type { RevenueCopy } from "@/lib/revenue-os";

/**
 * « Une demande. Un système. Zéro chaos. » — le scénario, au défilement.
 *
 * Ordinateur : à gauche les étapes horodatées ; à droite une fiche
 * opportunité qui reste à l'écran (sticky) et se remplit à mesure que
 * chaque étape passe au centre de l'écran.
 * Téléphone : chaque étape porte ses propres informations ; pas de fiche
 * collante, rien qui saute.
 * Sans JavaScript ou avec « moins d'animations » : tout est affiché.
 */
type Story = RevenueCopy["story"];

export function LeadStory({ t }: { t: Story }) {
  const total = t.steps.length; // l'étape « résultat » vient après
  const [reached, setReached] = useState(total);
  const items = useRef<(HTMLLIElement | null)[]>([]);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (!("IntersectionObserver" in window)) return;
    const els = items.current.filter(Boolean) as HTMLLIElement[];
    const seen = new Set<number>();
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          const i = Number((e.target as HTMLElement).dataset.index);
          if (e.isIntersecting) seen.add(i);
          else if (e.boundingClientRect.top > 0) seen.delete(i);
        }
        setReached(seen.size ? Math.max(...seen) : -1);
      },
      { rootMargin: "-45% 0px -45% 0px" },
    );
    /* Au départ, on n'a encore rien parcouru — sauf si la section est déjà
       dépassée (retour arrière, ancre). */
    const last = els[els.length - 1];
    if (last && last.getBoundingClientRect().bottom > 0) setReached(-1);
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  const fields = t.steps.find((s) => s.fields)?.fields ?? [];
  const at = (i: number) => reached >= i;
  const resultIndex = total;

  return (
    <div className="grid gap-12 lg:grid-cols-12 lg:gap-10">
      <ol className="relative lg:col-span-6">
        <span aria-hidden className="absolute bottom-2 left-[0.6875rem] top-2 w-px bg-line" />
        {t.steps.map((s, i) => (
          <li
            key={`${s.time}-${s.title}`}
            ref={(el) => {
              items.current[i] = el;
            }}
            data-index={i}
            className={`relative pb-10 pl-10 transition-opacity duration-500 last:pb-6 ${at(i) ? "opacity-100" : "lg:opacity-45"}`}
          >
            <span
              aria-hidden
              className={`absolute left-0 top-0.5 flex size-[1.4rem] items-center justify-center rounded-full border transition-colors duration-500 ${
                at(i) ? "border-gold bg-gold text-ink" : "border-line-strong bg-canvas text-fg-3"
              }`}
            >
              <Check className="size-3" />
            </span>
            <p className="font-mono text-[0.8125rem] text-gold">{s.time}</p>
            <h3 className="mt-1 text-[1.2rem] font-semibold tracking-[-0.02em] text-fg">{s.title}</h3>
            {s.quote && <p className="mt-3 max-w-md font-serif text-[1.25rem] leading-snug text-fg">{s.quote}</p>}
            {s.detail && <p className="mt-2 text-fg-2">{s.detail}</p>}
            {s.status && (
              <p className="mt-3">
                <span className="inline-flex items-center gap-2 rounded-full bg-gold px-3 py-1 text-[0.8125rem] font-semibold uppercase tracking-[0.08em] text-ink">
                  {s.status}
                </span>
              </p>
            )}
            {s.fields && (
              <dl className="mt-4 grid max-w-md grid-cols-2 gap-x-6 gap-y-3 lg:hidden">
                {s.fields.map(([k, v]) => (
                  <div key={k}>
                    <dt className="label text-[0.6875rem] text-fg-3">{k}</dt>
                    <dd className="mt-1 text-fg">{v}</dd>
                  </div>
                ))}
              </dl>
            )}
          </li>
        ))}
        <li
          ref={(el) => {
            items.current[resultIndex] = el;
          }}
          data-index={resultIndex}
          className="relative pl-10"
        >
          <span aria-hidden className="absolute left-0 top-1 size-[1.4rem] rounded-full border border-gold bg-[rgb(198_167_106/0.25)]" />
          <div className="rounded-[var(--radius-md)] border border-gold/60 bg-[linear-gradient(120deg,rgb(198_167_106/0.16),rgb(14_14_14/0.9))] p-5 lg:hidden">
            <p className="font-medium text-fg">{t.result.title}</p>
            <p className="mt-1 text-[0.875rem] text-fg-2">
              {t.result.label}
              {t.colon} <span className="font-mono text-[1.1rem] font-semibold text-gold-2">{t.result.value}</span>
            </p>
          </div>
          <p className="hidden pt-1 text-[1.1rem] font-semibold text-fg lg:block">{t.result.title}</p>
        </li>
      </ol>

      {/* La fiche opportunité, qui se remplit (ordinateur) */}
      <div aria-hidden className="hidden lg:col-span-6 lg:block">
        <div className="sticky top-[calc(var(--header-h)+3rem)] rounded-[1.5rem] border border-[rgb(242_238_230/0.1)] bg-[linear-gradient(160deg,rgb(242_238_230/0.055),rgb(242_238_230/0.012))] p-7 shadow-[0_40px_100px_-50px_rgb(0_0_0/0.9)]">
          <div className="flex items-center justify-between">
            <p className="label text-fg-3">{t.record}</p>
            <span className={`rounded-full px-3 py-1 text-[0.75rem] font-semibold uppercase tracking-[0.08em] transition-colors duration-500 ${at(3) ? "bg-gold text-ink" : "border border-line text-fg-3"}`}>
              {t.steps[3]?.status}
            </span>
          </div>
          <p className={`mt-5 font-serif text-[1.3rem] leading-snug transition-colors duration-500 ${at(0) ? "text-fg" : "text-fg-3"}`}>
            {t.steps[0]?.quote}
          </p>
          <dl className="mt-6 grid grid-cols-2 gap-x-6 gap-y-4 border-t border-line pt-6">
            {fields.map(([k, v]) => (
              <div key={k}>
                <dt className="label text-[0.6875rem] text-fg-3">{k}</dt>
                <dd className={`mt-1 transition-[opacity,transform] duration-500 ${at(2) ? "translate-y-0 text-fg opacity-100" : "translate-y-1 opacity-0"}`}>{v}</dd>
              </div>
            ))}
          </dl>
          <ul className="mt-6 space-y-2.5 border-t border-line pt-6">
            {[1, 4, 5, 6].map((i) => (
              <li key={i} className={`flex items-center gap-3 transition-opacity duration-500 ${at(i) ? "opacity-100" : "opacity-30"}`}>
                <span className={`flex size-5 items-center justify-center rounded-full ${at(i) ? "bg-gold text-ink" : "border border-line text-fg-3"}`}>
                  <Check className="size-3" />
                </span>
                <span className="text-[0.9375rem] text-fg">{t.steps[i]?.title}</span>
                <span className="ml-auto font-mono text-[0.8125rem] text-fg-3">{t.steps[i]?.time}</span>
              </li>
            ))}
          </ul>
          <div
            className={`mt-6 flex items-center justify-between rounded-[var(--radius-md)] border p-5 transition-[opacity,transform,border-color] duration-700 ease-[var(--ease-out)] ${
              at(resultIndex) ? "scale-100 border-gold/70 opacity-100" : "scale-[0.98] border-line opacity-35"
            } bg-[linear-gradient(120deg,rgb(198_167_106/0.16),rgb(14_14_14/0.9))]`}
          >
            <span>
              <span className="block font-medium text-fg">{t.result.title}</span>
              <span className="text-[0.875rem] text-fg-2">{t.result.label}</span>
            </span>
            <span className="font-mono text-[1.6rem] font-semibold text-gold-2">{t.result.value}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
