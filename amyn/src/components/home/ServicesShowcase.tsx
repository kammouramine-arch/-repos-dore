"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { ArrowUpRight } from "@/components/ui/Icons";

export type ShowcaseRow = {
  slug: string;
  number: string;
  name: string;
  tagline: string;
  href: string;
  /** Visuel rendu côté serveur (image de l'écran). */
  thumb: ReactNode;
  phone: boolean;
};

/**
 * Les sept services, en grand.
 *
 * On scanne la liste d'un coup d'œil : numéro, nom, cinq mots. Sur
 * ordinateur, survoler une ligne fait apparaître l'écran correspondant, qui
 * suit le curseur. Sur téléphone, chaque ligne montre directement sa
 * miniature.
 */
export function ServicesShowcase({ rows }: { rows: ShowcaseRow[] }) {
  const [active, setActive] = useState<number | null>(null);
  const host = useRef<HTMLDivElement>(null);
  const card = useRef<HTMLDivElement>(null);
  const target = useRef({ x: 0, y: 0 });
  const pos = useRef({ x: 0, y: 0 });

  /* L'aperçu rejoint le curseur avec un peu d'inertie — seulement pendant
     qu'une ligne est survolée. */
  const hovering = active !== null;
  useEffect(() => {
    if (!hovering) return;
    pos.current = { ...target.current };
    let frame = 0;
    const tick = () => {
      pos.current.x += (target.current.x - pos.current.x) * 0.16;
      pos.current.y += (target.current.y - pos.current.y) * 0.16;
      if (card.current) {
        card.current.style.transform = `translate3d(${pos.current.x}px, ${pos.current.y}px, 0) translate(-50%, -50%)`;
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [hovering]);

  const onMove = (e: React.PointerEvent) => {
    if (e.pointerType !== "mouse" || !host.current) return;
    const r = host.current.getBoundingClientRect();
    target.current = { x: e.clientX - r.left, y: e.clientY - r.top };
  };

  return (
    <div
      ref={host}
      onPointerMove={onMove}
      onPointerLeave={() => setActive(null)}
      className="relative"
    >
      <ol className="border-t border-[rgb(242_238_230/0.1)]">
        {rows.map((row, i) => {
          const on = active === i;
          return (
            <li key={row.slug} data-reveal style={{ "--delay": i * 40 } as React.CSSProperties}>
              <Link
                href={row.href}
                onPointerEnter={(e) => e.pointerType === "mouse" && setActive(i)}
                onFocus={() => setActive(i)}
                onBlur={() => setActive(null)}
                className="group relative flex items-center gap-4 overflow-hidden border-b border-[rgb(242_238_230/0.1)] py-6 transition-colors active:bg-[rgb(242_238_230/0.04)] sm:gap-8 sm:py-9"
              >
                {/* Voile qui remonte au survol. */}
                <span
                  aria-hidden
                  className={`absolute inset-0 origin-bottom bg-gradient-to-r from-[rgb(198_167_106/0.1)] via-[rgb(242_238_230/0.03)] to-transparent transition-transform duration-700 ease-[var(--ease-out)] ${
                    on ? "scale-y-100" : "scale-y-0"
                  }`}
                />
                <span
                  className={`relative w-10 shrink-0 font-mono text-[0.8125rem] transition-colors duration-500 sm:w-16 sm:text-[0.9375rem] ${
                    on ? "text-gold" : "text-bone-3"
                  }`}
                >
                  {row.number}
                </span>

                <span className="relative min-w-0 flex-1">
                  <span
                    className={`block text-[clamp(1.6rem,5.2vw,4.4rem)] font-semibold leading-[0.95] tracking-[-0.045em] transition-[transform,color] duration-700 ease-[var(--ease-out)] ${
                      on ? "translate-x-2 text-bone sm:translate-x-4" : "text-bone/90"
                    }`}
                  >
                    {row.name}
                  </span>
                  <span
                    className={`mt-2 block text-[0.9375rem] text-bone-3 transition-[transform,color] duration-700 ease-[var(--ease-out)] sm:mt-3 sm:text-[1.05rem] ${
                      on ? "translate-x-2 text-bone-2 sm:translate-x-4" : ""
                    }`}
                  >
                    {row.tagline}
                  </span>
                </span>

                {/* Miniature — téléphone et tablette. */}
                <span
                  aria-hidden
                  className={`relative shrink-0 overflow-hidden rounded-lg border border-[rgb(242_238_230/0.12)] lg:hidden ${
                    row.phone ? "h-24 w-14 sm:h-32 sm:w-20" : "h-16 w-24 sm:h-24 sm:w-36"
                  }`}
                >
                  {row.thumb}
                </span>

                <span
                  aria-hidden
                  className={`relative hidden size-14 shrink-0 items-center justify-center rounded-full border transition-[background-color,border-color,color,transform] duration-500 ease-[var(--ease-spring)] lg:flex ${
                    on ? "rotate-0 border-gold bg-gold text-ink" : "rotate-45 border-[rgb(242_238_230/0.18)] text-bone-2"
                  }`}
                >
                  <ArrowUpRight className="size-5" />
                </span>
              </Link>
            </li>
          );
        })}
      </ol>

      {/* Aperçu qui suit le curseur — ordinateur seulement. */}
      <div
        ref={card}
        aria-hidden
        className="pointer-events-none absolute left-0 top-0 z-20 hidden lg:block"
      >
        {rows.map((row, i) => (
          <div
            key={row.slug}
            className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-xl border border-[rgb(242_238_230/0.16)] shadow-[0_40px_90px_-30px_rgb(0_0_0/0.95)] transition-[opacity,transform] duration-500 ease-[var(--ease-out)] ${
              row.phone ? "aspect-[390/844] w-52" : "aspect-[1280/800] w-[26rem]"
            } ${active === i ? "scale-100 opacity-100" : "scale-90 opacity-0"}`}
          >
            {row.thumb}
          </div>
        ))}
      </div>
    </div>
  );
}
