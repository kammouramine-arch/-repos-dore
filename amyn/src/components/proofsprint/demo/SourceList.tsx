"use client";

import { useEffect, useState } from "react";
import type { Locale } from "@/lib/i18n/config";
import { evidence, getDemo } from "@/lib/proofsprint-demo";
import { OPEN_SOURCE_EVENT } from "./EvidenceMatrix";

/**
 * Les huit sources fictives. Une référence cliquée dans la matrice (ou une
 * adresse #S03) ouvre l'extrait correspondant, le fait défiler à l'écran
 * et y place le focus clavier.
 */
export function SourceList({ locale }: { locale: Locale }) {
  const t = getDemo(locale);
  const [open, setOpen] = useState<Set<string>>(new Set());

  useEffect(() => {
    const reveal = (id: string) => {
      if (!evidence.sources.some((s) => s.id === id)) return;
      setOpen((prev) => new Set(prev).add(id));
      requestAnimationFrame(() => {
        const el = document.getElementById(id);
        el?.scrollIntoView({ block: "start" });
        el?.querySelector<HTMLElement>("summary")?.focus({ preventScroll: true });
      });
    };
    const onEvent = (e: Event) => reveal((e as CustomEvent<string>).detail);
    const onHash = () => reveal(decodeURIComponent(window.location.hash.slice(1)));
    onHash();
    window.addEventListener(OPEN_SOURCE_EVENT, onEvent);
    window.addEventListener("hashchange", onHash);
    return () => {
      window.removeEventListener(OPEN_SOURCE_EVENT, onEvent);
      window.removeEventListener("hashchange", onHash);
    };
  }, []);

  return (
    <ul className="border-t border-line">
      {evidence.sources.map((s) => (
        <li key={s.id} className="border-b border-line">
          <details
            id={s.id}
            open={open.has(s.id)}
            onToggle={(e) => {
              const isOpen = (e.currentTarget as HTMLDetailsElement).open;
              setOpen((prev) => {
                const next = new Set(prev);
                if (isOpen) next.add(s.id);
                else next.delete(s.id);
                return next;
              });
            }}
            className="group scroll-mt-[calc(var(--header-h)+1.5rem)]"
          >
            <summary className="flex min-h-14 cursor-pointer list-none items-center gap-4 py-4 outline-none focus-visible:ring-2 focus-visible:ring-gold [&::-webkit-details-marker]:hidden">
              <span className="font-mono text-[0.875rem] text-gold">{s.id}</span>
              <span className="flex-1 font-medium text-fg">{s.title[locale]}</span>
              <span className="font-mono text-[0.8125rem] text-fg-3">§{s.section}</span>
              <span aria-hidden className="text-fg-3 transition-transform duration-300 group-open:rotate-45">+</span>
            </summary>
            <div className="pb-6 pl-0 sm:pl-12">
              <blockquote className="border-l-2 border-gold/60 pl-4 text-[1rem] leading-relaxed text-fg">
                {s.quote[locale]}
              </blockquote>
              <p className="mt-3 text-[0.8125rem] text-fg-3">{t.sources.fictional}</p>
              <a href={`#${t.anchor.matrix}`} className="mt-3 inline-flex min-h-11 items-center text-[0.875rem] text-fg-2 underline underline-offset-4 hover:text-fg">
                {t.sources.backToMatrix}
              </a>
            </div>
          </details>
        </li>
      ))}
    </ul>
  );
}
