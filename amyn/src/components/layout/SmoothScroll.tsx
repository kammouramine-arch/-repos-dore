"use client";

import Lenis from "lenis";
import { useEffect } from "react";

/**
 * DÉFILEMENT LISSE (Lenis).
 *
 * Le défilement natif avance par à-coups : c'est le détail qui trahit le plus
 * un site « moyen ». Lenis interpole le mouvement de la molette, ce qui rend
 * du même coup toutes les animations liées au scroll beaucoup plus soyeuses.
 *
 * Il pilote le scroll réel de la fenêtre (et non un faux conteneur), donc
 * Framer Motion continue de lire les positions normalement.
 *
 * Désactivé si l'utilisateur a demandé moins d'animations : dans ce cas le
 * défilement natif du navigateur est exactement ce qu'il attend.
 */
export function SmoothScroll() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const lenis = new Lenis({
      duration: 1.05,
      /* Même famille de courbe que le reste du site : sortie exponentielle. */
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      /* Les liens d'ancrage (#services…) glissent au lieu de sauter. */
      anchors: true,
    });

    let frame = requestAnimationFrame(function raf(time) {
      lenis.raf(time);
      frame = requestAnimationFrame(raf);
    });

    return () => {
      cancelAnimationFrame(frame);
      lenis.destroy();
    };
  }, []);

  return null;
}
