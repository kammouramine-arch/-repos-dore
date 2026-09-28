"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

/**
 * Fait apparaître les éléments `[data-reveal]` quand ils entrent à l'écran.
 *
 * Un seul observateur pour tout le site, et aucune dépendance. Ce qui est
 * déjà visible au montage est marqué AVANT que la classe `reveal-ready` ne
 * masque le reste : rien de visible ne disparaît, rien ne clignote. Sans
 * JavaScript, la classe n'est jamais posée et tout reste affiché.
 */
export function RevealObserver() {
  const pathname = usePathname();

  useEffect(() => {
    const root = document.documentElement;
    const targets = Array.from(
      document.querySelectorAll<HTMLElement>("[data-reveal]:not(.is-in)"),
    );

    if (!("IntersectionObserver" in window)) {
      targets.forEach((el) => el.classList.add("is-in"));
      return;
    }

    const vh = window.innerHeight;
    for (const el of targets) {
      const { top, bottom } = el.getBoundingClientRect();
      if (top < vh * 0.92 && bottom > 0) el.classList.add("is-in");
    }
    root.classList.add("reveal-ready");

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-in");
            observer.unobserve(entry.target);
          }
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.12 },
    );

    targets
      .filter((el) => !el.classList.contains("is-in"))
      .forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, [pathname]);

  return null;
}
