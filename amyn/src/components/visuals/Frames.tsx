"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/**
 * Toile à l'échelle.
 *
 * Les interfaces présentées sont écrites à leur taille réelle (1440 px pour
 * un site, 390 px pour un téléphone) puis réduites par une transformation :
 * le texte reste vectoriel, donc net, et les proportions sont exactement
 * celles d'un vrai écran.
 *
 * L'emplacement est réservé dès le premier rendu par `aspect-ratio` : rien
 * ne bouge dans la page quand la mise à l'échelle s'applique.
 *
 * Pour les technologies d'assistance, l'ensemble est UNE image, décrite par
 * `label` ; le texte de la maquette ne leur est pas lu.
 */
export function ScaledCanvas({
  width,
  height,
  label,
  children,
  className = "",
}: {
  width: number;
  height: number;
  label: string;
  children: ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) =>
      setScale(entry.contentRect.width / width),
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [width]);

  return (
    <div
      ref={ref}
      role="img"
      aria-label={label}
      className={`relative w-full overflow-hidden ${className}`}
      style={{ aspectRatio: `${width} / ${height}` }}
    >
      <div
        aria-hidden
        className="absolute left-0 top-0 origin-top-left transition-opacity duration-500"
        style={{
          width,
          height,
          transform: `scale(${scale})`,
          opacity: scale ? 1 : 0,
        }}
      >
        {children}
      </div>
    </div>
  );
}

/** Fenêtre de navigateur : pastilles, adresse, et la page en dessous. */
export function BrowserFrame({
  url,
  width,
  height,
  label,
  children,
  className = "",
}: {
  url: string;
  width: number;
  height: number;
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`overflow-hidden rounded-[var(--radius-md)] border border-[rgb(242_238_230/0.14)] bg-ink-2 shadow-[0_40px_100px_-40px_rgb(0_0_0/0.85)] ${className}`}
    >
      <div
        aria-hidden
        className="flex items-center gap-3 border-b border-[rgb(242_238_230/0.1)] px-3.5 py-2.5"
      >
        <span className="flex shrink-0 gap-1.5">
          <span className="size-2 rounded-full bg-[rgb(242_238_230/0.16)]" />
          <span className="size-2 rounded-full bg-[rgb(242_238_230/0.16)]" />
          <span className="size-2 rounded-full bg-[rgb(242_238_230/0.16)]" />
        </span>
        <span className="mx-auto max-w-[70%] truncate rounded-full bg-[rgb(242_238_230/0.06)] px-3 py-1 font-mono text-[0.625rem] tracking-wide text-bone-3">
          {url}
        </span>
        <span className="w-[34px] shrink-0" />
      </div>
      <ScaledCanvas width={width} height={height} label={label}>
        {children}
      </ScaledCanvas>
    </div>
  );
}

/** Téléphone : un cadre sobre, sans encoche ni marque. */
export function PhoneFrame({
  label,
  children,
  className = "",
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-[2.4rem] border border-[rgb(242_238_230/0.16)] bg-ink-3 p-[5%] shadow-[0_40px_90px_-30px_rgb(0_0_0/0.9)] ${className}`}
    >
      <div className="overflow-hidden rounded-[1.9rem]">
        <ScaledCanvas width={390} height={800} label={label}>
          {children}
        </ScaledCanvas>
      </div>
    </div>
  );
}
