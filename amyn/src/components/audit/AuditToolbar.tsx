"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { track } from "@/lib/analytics";

/**
 * Barre de l'audit (écran uniquement — absente du PDF) :
 *   - sommaire, avec la section en cours ;
 *   - « Présenter » : en-tête et pied du site masqués, une section par
 *     écran, plein écran si le navigateur l'accepte ; flèches, Page
 *     suivante / précédente et barre d'espace pour avancer, Échap pour
 *     quitter ;
 *   - « Exporter en PDF » : la boîte d'impression du navigateur, avec la
 *     mise en page d'impression dédiée (globals.css, « Revenue Audit »).
 * Mesure : ouverture, sections vues, export. Aucune adresse ni nom
 * d'entreprise n'est transmis avec les événements.
 */
type Labels = { contents: string; present: string; exit: string; export: string; presentHint: string };

export function AuditToolbar({
  sections,
  labels,
  company,
  product,
  fictional,
  sampleLabel,
}: {
  sections: { id: string; label: string }[];
  labels: Labels;
  company: string;
  product: string;
  fictional: boolean;
  sampleLabel: string;
}) {
  const [active, setActive] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [presenting, setPresenting] = useState(false);
  const exported = useRef(0);

  /* Ouverture et sections vues. */
  useEffect(() => {
    track("audit_opened", { fictional });
    const seen = new Set<string>();
    const els = Array.from(document.querySelectorAll<HTMLElement>("[data-audit-section]"));
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          const id = (e.target as HTMLElement).dataset.auditSection!;
          setActive(id);
          if (!seen.has(id)) {
            seen.add(id);
            track("audit_section_viewed", { section: id, fictional });
          }
        }
      },
      { rootMargin: "-40% 0px -55% 0px" },
    );
    els.forEach((el) => io.observe(el));

    /* Impression lancée depuis le navigateur (Ctrl/Cmd + P) : comptée aussi. */
    const onPrint = () => {
      if (Date.now() - exported.current > 3000) track("audit_pdf_exported", { via: "browser", fictional });
    };
    window.addEventListener("beforeprint", onPrint);
    return () => {
      io.disconnect();
      window.removeEventListener("beforeprint", onPrint);
    };
  }, [fictional]);

  const go = useCallback((dir: 1 | -1) => {
    /* Positions à l'écran : la section courante est calée sous la barre
       (scroll-margin), la suivante est la première au-dessous. */
    const els = Array.from(document.querySelectorAll<HTMLElement>(".audit-cover, [data-audit-section]"));
    const bar = document.querySelector<HTMLElement>(".audit-toolbar")?.offsetHeight ?? 0;
    const tops = els.map((el) => el.getBoundingClientRect().top - bar);
    const target = dir === 1 ? els.find((_, i) => tops[i] > 24) : [...els].reverse().find((_, i) => tops[els.length - 1 - i] < -24);
    target?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  const exit = useCallback(() => {
    delete document.documentElement.dataset.presenting;
    setPresenting(false);
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
  }, []);

  function present() {
    document.documentElement.dataset.presenting = "";
    setPresenting(true);
    document.documentElement.requestFullscreen?.().catch(() => {});
    document.querySelector(".audit-cover")?.scrollIntoView({ block: "start" });
  }

  /* Clavier en présentation. */
  useEffect(() => {
    if (!presenting) return;
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (/^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName)) return;
      if (["ArrowDown", "ArrowRight", "PageDown", " "].includes(e.key)) {
        e.preventDefault();
        go(1);
      } else if (["ArrowUp", "ArrowLeft", "PageUp"].includes(e.key)) {
        e.preventDefault();
        go(-1);
      } else if (e.key === "Escape") exit();
    };
    const onFs = () => {
      if (!document.fullscreenElement) exit();
    };
    window.addEventListener("keydown", onKey);
    document.addEventListener("fullscreenchange", onFs);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.removeEventListener("fullscreenchange", onFs);
    };
  }, [presenting, go, exit]);

  /* Sortie propre si l'on quitte la page en présentation. */
  useEffect(() => () => void delete document.documentElement.dataset.presenting, []);

  function exportPdf() {
    exported.current = Date.now();
    track("audit_pdf_exported", { via: "button", fictional });
    window.print();
  }

  const current = sections.find((s) => s.id === active);

  return (
    <div data-print-hide="" className="audit-toolbar sticky top-[var(--header-h)] z-30 border-b border-[rgb(242_238_230/0.1)] bg-[rgb(12_12_11/0.92)] backdrop-blur-md">
      <div className="mx-auto flex w-full max-w-[88rem] items-center justify-between gap-3 px-5 py-2.5 sm:px-8 lg:px-12">
        <p className="flex min-w-0 items-center gap-2.5 text-[0.8125rem] text-bone-2">
          <span className="truncate">
            <span className="text-bone">{product}</span> · {company}
          </span>
          {fictional && <span className="label hidden shrink-0 rounded-full border border-gold/40 px-2 py-0.5 text-[0.6875rem] text-gold-2 md:inline">{sampleLabel}</span>}
        </p>

        <div className="flex shrink-0 items-center gap-1.5">
          <div className="relative">
            <button
              type="button"
              onClick={() => setOpen((o) => !o)}
              aria-expanded={open}
              aria-controls="audit-contents"
              className="inline-flex min-h-10 items-center gap-2 rounded-full border border-[rgb(242_238_230/0.16)] px-3.5 text-[0.8125rem] text-bone transition-colors hover:border-gold/60"
            >
              <span className="hidden sm:inline">{current ? current.label : labels.contents}</span>
              <span className="sm:hidden">{labels.contents}</span>
              <svg aria-hidden viewBox="0 0 24 24" className={`size-3.5 transition-transform ${open ? "rotate-180" : ""}`} fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M6 9l6 6 6-6" />
              </svg>
            </button>
            {open && (
              <ol
                id="audit-contents"
                className="absolute right-0 top-full mt-2 w-64 rounded-2xl border border-[rgb(242_238_230/0.14)] bg-[rgb(16_16_15/0.98)] p-2 shadow-[0_30px_80px_-30px_rgb(0_0_0/0.9)]"
              >
                {sections.map((s, i) => (
                  <li key={s.id}>
                    <a
                      href={`#${s.id}`}
                      onClick={() => setOpen(false)}
                      aria-current={s.id === active ? "true" : undefined}
                      className={`flex items-center gap-3 rounded-xl px-3 py-2 text-[0.875rem] transition-colors hover:bg-[rgb(242_238_230/0.06)] ${s.id === active ? "text-bone" : "text-bone-2"}`}
                    >
                      <span className="font-mono text-[0.6875rem] text-gold">{String(i + 1).padStart(2, "0")}</span>
                      {s.label}
                    </a>
                  </li>
                ))}
              </ol>
            )}
          </div>
          {presenting ? (
            <button type="button" onClick={exit} className="inline-flex min-h-10 items-center rounded-full bg-bone px-4 text-[0.8125rem] font-medium text-ink">
              {labels.exit}
            </button>
          ) : (
            <button
              type="button"
              onClick={present}
              title={labels.presentHint}
              className="hidden min-h-10 items-center rounded-full border border-[rgb(242_238_230/0.16)] px-4 text-[0.8125rem] text-bone transition-colors hover:border-gold/60 md:inline-flex"
            >
              {labels.present}
            </button>
          )}
          <button
            type="button"
            onClick={exportPdf}
            className="inline-flex min-h-10 items-center gap-2 rounded-full bg-bone px-4 text-[0.8125rem] font-medium text-ink transition-colors hover:bg-gold-2"
          >
            <svg aria-hidden viewBox="0 0 24 24" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M12 4v11M7 10l5 5 5-5M5 20h14" />
            </svg>
            <span className="hidden sm:inline">{labels.export}</span>
            <span className="sm:hidden">PDF</span>
          </button>
        </div>
      </div>
      {presenting && <p className="pb-2 text-center text-[0.6875rem] text-bone-3">{labels.presentHint}</p>}
    </div>
  );
}
