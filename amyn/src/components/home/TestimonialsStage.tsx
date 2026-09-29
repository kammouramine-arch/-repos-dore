"use client";

import { useRef, useState } from "react";
import { ArrowRight } from "@/components/ui/Icons";
import type { Testimonial } from "@/lib/testimonials";

export type StageLabels = {
  region: string;
  slide: string;
  of: string;
  previous: string;
  next: string;
  goTo: string;
  verified: string;
  source: string;
  rating: string;
  outOf: string;
};

/**
 * La scène des témoignages : une grande citation, et en dessous l'index des
 * autres — pas une grille de cartes.
 *
 * - Toutes les citations occupent la même cellule de grille : la hauteur
 *   est celle de la plus longue, rien ne saute en changeant.
 * - Au doigt : un glissement horizontal change de citation, le défilement
 *   vertical reste libre. Au clavier : flèches gauche et droite.
 * - Pas de lecture automatique : on lit à son rythme.
 */
export function TestimonialsStage({ items, labels }: { items: Testimonial[]; labels: StageLabels }) {
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState<"next" | "back">("next");
  const [announce, setAnnounce] = useState(false);
  const start = useRef<{ x: number; y: number } | null>(null);
  const count = items.length;

  const go = (to: number) => {
    const next = (to + count) % count;
    if (next === index) return;
    setDirection(to > index || (index === count - 1 && next === 0) ? "next" : "back");
    setIndex(next);
    setAnnounce(true);
  };

  const pad = (n: number) => String(n).padStart(2, "0");

  return (
    <div
      role="region"
      aria-roledescription="carousel"
      aria-label={labels.region}
      onKeyDown={(e) => {
        if (e.key === "ArrowRight") go(index + 1);
        if (e.key === "ArrowLeft") go(index - 1);
      }}
      className="grid gap-10 lg:grid-cols-12 lg:gap-10"
    >
      {/* Colonne gauche : guillemet, compteur, commandes. */}
      <div className="flex items-end justify-between gap-6 lg:col-span-3 lg:flex-col lg:items-start lg:justify-between">
        <span aria-hidden className="block font-serif text-[7rem] leading-[0.6] text-gold/80 sm:text-[9rem]">
          “
        </span>
        {count > 1 && (
          <div className="flex items-center gap-5">
            <p className="font-mono text-[0.9375rem] tracking-[0.12em] text-bone-2" aria-hidden>
              <span className="text-gold">{pad(index + 1)}</span>
              <span className="text-bone-3"> / {pad(count)}</span>
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => go(index - 1)}
                aria-label={labels.previous}
                className="flex size-12 items-center justify-center rounded-full border border-[rgb(242_238_230/0.16)] text-bone-2 transition-[background-color,border-color,color,transform] duration-300 hover:border-gold hover:text-bone active:scale-90"
              >
                <ArrowRight className="size-4 rotate-180" />
              </button>
              <button
                type="button"
                onClick={() => go(index + 1)}
                aria-label={labels.next}
                className="flex size-12 items-center justify-center rounded-full border border-gold/60 bg-[rgb(198_167_106/0.08)] text-gold-2 transition-[background-color,border-color,color,transform] duration-300 hover:bg-gold hover:text-ink active:scale-90"
              >
                <ArrowRight className="size-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* La citation. */}
      <div
        className="grid touch-pan-y select-text lg:col-span-9"
        onPointerDown={(e) => (start.current = { x: e.clientX, y: e.clientY })}
        onPointerUp={(e) => {
          const s = start.current;
          start.current = null;
          if (!s || count < 2) return;
          const dx = e.clientX - s.x;
          const dy = e.clientY - s.y;
          if (Math.abs(dx) > 56 && Math.abs(dx) > Math.abs(dy) * 1.4) go(dx < 0 ? index + 1 : index - 1);
        }}
      >
        {items.map((t, i) => {
          const active = i === index;
          return (
            <figure
              key={t.id}
              role="group"
              aria-roledescription="slide"
              aria-label={`${labels.slide} ${i + 1} ${labels.of} ${count}`}
              aria-hidden={!active}
              inert={!active}
              className={`[grid-area:1/1] ${
                active
                  ? `visible opacity-100 ${direction === "next" ? "quote-in-next" : "quote-in-back"}`
                  : "invisible opacity-0"
              }`}
            >
              <blockquote lang={t.lang}>
                <p className="font-serif text-[clamp(1.7rem,3.4vw,3.15rem)] leading-[1.14] tracking-[-0.01em] text-bone [text-wrap:pretty]">
                  {t.quote.replace(/'/g, "\u2019")}
                </p>
              </blockquote>
              <figcaption className="mt-9 flex flex-wrap items-center gap-x-5 gap-y-3">
                <span aria-hidden className="h-px w-12 bg-gradient-to-r from-gold to-gold/10" />
                {t.image && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={t.image.src} alt={t.image.alt} width={44} height={44} className="size-11 rounded-full object-cover" />
                )}
                <span>
                  <span className="block text-[1.05rem] font-semibold tracking-[-0.02em] text-bone">{t.name}</span>
                  {(t.company || t.role) && (
                    <span className="block text-[0.9375rem] text-bone-3">
                      {[t.role, t.company].filter(Boolean).join(" · ")}
                    </span>
                  )}
                </span>
                {t.verified && (
                  <span className="flex flex-wrap items-center gap-2">
                    {t.rating && (
                      <span className="rounded-full border border-[rgb(242_238_230/0.14)] px-3 py-1 font-mono text-[0.75rem] text-bone-2">
                        <span aria-hidden className="text-gold">★ </span>
                        {t.rating}/5
                        <span className="sr-only">
                          {" "}
                          — {labels.rating} {t.rating} {labels.outOf}
                        </span>
                      </span>
                    )}
                    {t.source && (
                      <span className="rounded-full border border-[rgb(242_238_230/0.14)] px-3 py-1 font-mono text-[0.75rem] uppercase tracking-[0.1em] text-bone-3">
                        {labels.source}{" "}
                        {t.source.url ? (
                          <a href={t.source.url} rel="noopener noreferrer" target="_blank" className="text-bone-2 underline underline-offset-4">
                            {t.source.label}
                          </a>
                        ) : (
                          t.source.label
                        )}
                      </span>
                    )}
                  </span>
                )}
              </figcaption>
            </figure>
          );
        })}

        {/* Annonce du changement, pour les lecteurs d'écran. */}
        <p aria-live="polite" className="sr-only">
          {announce ? `${labels.slide} ${index + 1} ${labels.of} ${count}` : ""}
        </p>

        {/* Index des témoignages : barres larges, pas de points minuscules. */}
        {count > 1 && (
          <ol className="mt-12 grid gap-3 sm:mt-14" style={{ gridTemplateColumns: `repeat(${count}, minmax(0, 1fr))` }}>
            {items.map((t, i) => (
              <li key={t.id}>
                <button
                  type="button"
                  onClick={() => go(i)}
                  aria-label={`${t.company ?? t.name} — ${labels.goTo} ${i + 1} ${labels.of} ${count}`}
                  aria-current={i === index ? "true" : undefined}
                  className="group flex min-h-11 w-full flex-col justify-center gap-3 text-left"
                >
                  <span className="block h-[2px] overflow-hidden rounded-full bg-[rgb(242_238_230/0.12)]">
                    <span
                      className={`block h-full origin-left bg-gradient-to-r from-gold to-gold-2 transition-transform duration-700 ease-[var(--ease-out)] ${
                        i === index ? "scale-x-100" : "scale-x-0 group-hover:scale-x-25"
                      }`}
                    />
                  </span>
                  <span
                    className={`hidden truncate font-mono text-[0.75rem] uppercase tracking-[0.12em] transition-colors sm:block ${
                      i === index ? "text-bone-2" : "text-bone-3 group-hover:text-bone-2"
                    }`}
                  >
                    {t.company ?? t.name}
                  </span>
                </button>
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}
