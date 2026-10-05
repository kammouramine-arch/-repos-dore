"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Nombre qui monte jusqu'à sa valeur quand il entre à l'écran (1,2 s).
 * Rendu serveur et « moins d'animations » : la valeur finale, directement.
 */
export function CountUp({ value, locale, currency = false }: { value: number; locale: "fr" | "en"; currency?: boolean }) {
  const [shown, setShown] = useState(value);
  const el = useRef<HTMLSpanElement>(null);
  const fmt = new Intl.NumberFormat(locale === "fr" ? "fr-FR" : "en-GB", currency ? { style: "currency", currency: "EUR", maximumFractionDigits: 0 } : {});

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || !el.current) return;
    let frame = 0;
    const io = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      io.disconnect();
      const start = performance.now();
      const tick = (now: number) => {
        const p = Math.min(1, (now - start) / 1200);
        setShown(Math.round(value * (1 - Math.pow(1 - p, 3))));
        if (p < 1) frame = requestAnimationFrame(tick);
      };
      setShown(0);
      frame = requestAnimationFrame(tick);
    }, { threshold: 0.4 });
    io.observe(el.current);
    return () => {
      io.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [value]);

  return (
    <span ref={el} className="tabular-nums">
      {fmt.format(shown)}
    </span>
  );
}
