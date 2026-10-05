"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { track } from "@/lib/analytics";
import type { Locale } from "@/lib/i18n/config";
import { DEMO_STAGES, DEMO_STEPS, type DemoCopy } from "@/lib/revenue-demo";
import { STAGE_COMPONENTS, stageTime } from "./DemoStages";

/**
 * Lecteur de la démonstration.
 *
 * Une seule horloge (≈ 1 s) fait avancer `k` dans l'écran courant ; à la fin
 * d'un écran, une courte pause, puis l'écran suivant. L'horloge s'arrête
 * quand le lecteur sort de l'écran ou que l'onglet est caché.
 *
 * La lecture démarre seule quand le lecteur devient visible. Pause,
 * reprise, retour au début, écran précédent / suivant et accès direct à
 * chaque écran ; flèches du clavier et barre d'espace quand le lecteur a le
 * focus.
 *
 * « Moins d'animations » : pas de lecture automatique, chaque écran est
 * affiché complet ; la navigation reste disponible.
 */
const TICK = 1050;
const HOLD = 3;
const LAST = DEMO_STAGES.length - 1;

export function DemoPlayer({ t, locale, sampleHref }: { t: DemoCopy; locale: Locale; sampleHref: string }) {
  const [stage, setStage] = useState(0);
  /* Rendu serveur : premier écran complet. */
  const [k, setK] = useState(DEMO_STEPS[DEMO_STAGES[0]]);
  const [playing, setPlaying] = useState(false);
  const [visible, setVisible] = useState(false);
  const [reduced, setReduced] = useState(false);
  const host = useRef<HTMLDivElement>(null);
  const started = useRef(false);
  const completed = useRef(false);
  const autostarted = useRef(false);
  const seen = useRef<number | null>(null);

  const id = DEMO_STAGES[stage];
  const steps = DEMO_STEPS[id];

  const start = useCallback(() => {
    if (!started.current) {
      started.current = true;
      track("demo_started", { lang: locale });
      track("demo_stage_viewed", { stage: DEMO_STAGES[stage], index: stage + 1, lang: locale });
    }
    setPlaying(true);
  }, [locale, stage]);

  /* Préférences et visibilité. */
  useEffect(() => {
    const isReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const frame = requestAnimationFrame(() => {
      setReduced(isReduced);
      if (!isReduced) setK(0);
    });
    const io = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { threshold: 0.35 });
    if (host.current) io.observe(host.current);
    return () => {
      cancelAnimationFrame(frame);
      io.disconnect();
    };
  }, []);

  /* Démarrage automatique, une fois, à la première apparition. */
  useEffect(() => {
    if (visible && !reduced && !autostarted.current) {
      autostarted.current = true;
      start();
    }
  }, [visible, reduced, start]);

  /* Écran vu. */
  useEffect(() => {
    if (seen.current === stage) return;
    if (seen.current !== null || started.current) track("demo_stage_viewed", { stage: DEMO_STAGES[stage], index: stage + 1, lang: locale });
    seen.current = stage;
  }, [stage, locale]);

  /* Fin de la démonstration. */
  useEffect(() => {
    if (stage === LAST && k >= DEMO_STEPS.finale && started.current && !completed.current) {
      completed.current = true;
      track("demo_completed", { lang: locale });
    }
  }, [stage, k, locale]);

  /* L'horloge. */
  useEffect(() => {
    if (!playing || !visible) return;
    let timer = 0;
    const schedule = () => {
      window.clearTimeout(timer);
      if (document.hidden) return;
      timer = window.setTimeout(advance, reduced ? TICK * 6 : TICK);
    };
    const advance = () => {
      if (reduced) {
        if (stage >= LAST) setPlaying(false);
        else goTo(stage + 1);
        return;
      }
      if (k < steps + HOLD) setK((v) => v + 1);
      else if (stage < LAST) {
        setStage(stage + 1);
        setK(0);
      } else setPlaying(false);
    };
    schedule();
    document.addEventListener("visibilitychange", schedule);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", schedule);
    };
    // goTo est stable dans les faits (dépend de reduced uniquement).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing, visible, reduced, stage, k, steps]);

  function goTo(next: number) {
    const s = Math.max(0, Math.min(LAST, next));
    setStage(s);
    setK(reduced ? DEMO_STEPS[DEMO_STAGES[s]] : 0);
  }

  function restart() {
    completed.current = false;
    goTo(0);
    start();
  }

  function toggle() {
    if (playing) setPlaying(false);
    else if (stage === LAST && k >= DEMO_STEPS.finale) restart();
    else start();
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if (e.target instanceof HTMLElement && /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return;
    if (e.key === "ArrowRight") {
      e.preventDefault();
      goTo(stage + 1);
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      goTo(stage - 1);
    } else if ((e.key === " " || e.key === "k") && e.target === e.currentTarget) {
      e.preventDefault();
      toggle();
    }
  }

  const Stage = STAGE_COMPONENTS[id];
  const shown = Math.min(k, steps);
  const progress = steps ? shown / steps : 1;

  return (
    <div
      ref={host}
      role="region"
      aria-roledescription={locale === "fr" ? "démonstration" : "demonstration"}
      aria-label={t.player.aria}
      tabIndex={0}
      onKeyDown={onKeyDown}
      className="demo-frame relative overflow-clip rounded-[1.75rem] border border-[rgb(242_238_230/0.12)] bg-[linear-gradient(170deg,rgb(24_22_19/0.96),rgb(10_10_10/0.98))] shadow-[0_60px_140px_-60px_rgb(0_0_0/0.95)] outline-none focus-visible:ring-2 focus-visible:ring-gold/60"
    >
      {/* Barre de l'espace de travail */}
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-line px-4 py-3 sm:px-6">
        <span className="flex items-center gap-2.5 text-[0.8125rem] text-fg-2">
          <span aria-hidden className="flex gap-1">
            <span className="size-2 rounded-full bg-[rgb(242_238_230/0.18)]" />
            <span className="size-2 rounded-full bg-[rgb(242_238_230/0.18)]" />
            <span className="size-2 rounded-full bg-gold/70" />
          </span>
          {t.player.workspace}
        </span>
        <span className="flex items-center gap-3">
          <span className="font-mono text-[0.75rem] tabular-nums text-gold">{stageTime(t, id)}</span>
          <span className="label rounded-full border border-gold/40 px-2.5 py-1 text-[0.6875rem] text-gold-2">
            <span className="sm:hidden">{t.fictionalShort}</span>
            <span className="max-sm:hidden">{t.fictional}</span>
          </span>
        </span>
      </div>

      <div className="grid lg:grid-cols-[13.5rem_1fr]">
        {/* Rail des étapes (ordinateur) */}
        <nav aria-label={t.player.stages} className="hidden border-r border-line py-4 lg:block">
          <ol>
            {DEMO_STAGES.map((s, i) => {
              const current = i === stage;
              return (
                <li key={s}>
                  <button
                    type="button"
                    onClick={() => goTo(i)}
                    aria-current={current ? "step" : undefined}
                    className={`group relative flex w-full items-center gap-3 px-5 py-[0.4rem] text-left text-[0.8125rem] transition-colors ${current ? "text-fg" : i < stage ? "text-fg-2 hover:text-fg" : "text-fg-3 hover:text-fg-2"}`}
                  >
                    <span aria-hidden className={`absolute inset-y-1 left-0 w-0.5 rounded-full transition-colors ${current ? "bg-gold" : "bg-transparent"}`} />
                    <span className={`font-mono text-[0.6875rem] ${current ? "text-gold" : ""}`}>{String(i + 1).padStart(2, "0")}</span>
                    {t.nav[s]}
                  </button>
                </li>
              );
            })}
          </ol>
        </nav>

        {/* L'écran */}
        <div className="min-w-0">
          <div aria-live="polite" className="sr-only">
            {`${t.player.stage} ${stage + 1} ${t.player.of} ${DEMO_STAGES.length} — ${t.nav[id]}`}
          </div>
          <div
            key={stage}
            className={`p-4 sm:p-6 lg:h-[37rem] lg:overflow-hidden lg:p-8 ${id === "finale" ? "demo-zoom" : "demo-stage-in"}`}
          >
            <Stage t={t} k={shown} locale={locale} sampleHref={sampleHref} />
          </div>
        </div>
      </div>

      {/* Commandes */}
      <div className="sticky bottom-0 z-10 border-t border-line bg-[rgb(14_13_12/0.94)] px-3 py-3 backdrop-blur-md sm:px-6">
        {/* Progression par écran (cliquable) */}
        <ol aria-label={t.player.stages} className="mb-3 grid grid-cols-12 gap-1">
          {DEMO_STAGES.map((s, i) => (
            <li key={s}>
              <button
                type="button"
                onClick={() => goTo(i)}
                aria-label={`${t.player.stage} ${i + 1} — ${t.nav[s]}`}
                aria-current={i === stage ? "step" : undefined}
                className="block w-full py-1.5"
              >
                <span className="block h-1 overflow-hidden rounded-full bg-[rgb(242_238_230/0.1)]">
                  <span
                    className="block h-full origin-left rounded-full bg-gold transition-transform duration-500 ease-[var(--ease-out)]"
                    style={{ transform: `scaleX(${i < stage ? 1 : i === stage ? Math.max(0.06, progress) : 0})` }}
                  />
                </span>
              </button>
            </li>
          ))}
        </ol>
        <div className="flex items-center justify-between gap-3">
          <p className="min-w-0 truncate text-[0.8125rem] text-fg-2">
            <span className="font-mono text-gold">{String(stage + 1).padStart(2, "0")}</span>
            <span className="text-fg-3"> / {DEMO_STAGES.length}</span>
            <span className="ml-2.5 text-fg">{t.nav[id]}</span>
          </p>
          <div className="flex shrink-0 items-center gap-1.5">
            <CtrlButton label={t.player.restart} onClick={restart}>
              <path d="M4 12a8 8 0 1 0 2.4-5.7M4 4v4h4" />
            </CtrlButton>
            <CtrlButton label={t.player.previous} onClick={() => goTo(stage - 1)} disabled={stage === 0}>
              <path d="M15 6l-6 6 6 6" />
            </CtrlButton>
            <button
              type="button"
              onClick={toggle}
              aria-label={playing ? t.player.pause : t.player.play}
              className="flex size-11 items-center justify-center rounded-full bg-bone text-ink transition-transform active:scale-95"
            >
              <svg aria-hidden viewBox="0 0 24 24" className="size-[18px]" fill="currentColor">
                {playing ? <path d="M7 5h3.5v14H7zM13.5 5H17v14h-3.5z" /> : <path d="M8 5.5v13l10-6.5z" />}
              </svg>
            </button>
            <CtrlButton label={t.player.next} onClick={() => goTo(stage + 1)} disabled={stage === LAST}>
              <path d="M9 6l6 6-6 6" />
            </CtrlButton>
          </div>
        </div>
        {reduced && <p className="mt-2 text-[0.75rem] text-fg-3">{t.player.reduced}</p>}
      </div>
    </div>
  );
}

function CtrlButton({ label, onClick, disabled, children }: { label: string; onClick: () => void; disabled?: boolean; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className="flex size-11 items-center justify-center rounded-full border border-line-strong text-fg-2 transition-colors hover:border-gold/60 hover:text-fg disabled:opacity-35"
    >
      <svg aria-hidden viewBox="0 0 24 24" className="size-[18px]" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        {children}
      </svg>
    </button>
  );
}
