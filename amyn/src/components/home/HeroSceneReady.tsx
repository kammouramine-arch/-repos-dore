"use client";

import { useEffect } from "react";

/**
 * Les deux images du décor (planète, reliefs) ne sont demandées qu'une fois
 * la page chargée : elles ne concurrencent ni le titre, ni les polices, ni
 * les maquettes. Elles sont décodées d'avance, puis `data-ready` sur la
 * scène les fait apparaître en fondu. Les reliefs ne sont chargés que sur
 * grand écran, le seul où ils s'affichent.
 */
const PLANET = "/hero/planet.webp";
const RELIEF = "/hero/relief.webp";

export function HeroSceneReady() {
  useEffect(() => {
    const scene = document.querySelector<HTMLElement>("[data-hero-scene]");
    if (!scene) return;
    let cancelled = false;

    const decode = (src: string) => {
      const img = new Image();
      img.src = src;
      return img.decode().catch(() => undefined);
    };
    const start = () => {
      const wide = window.matchMedia("(min-width: 1024px)").matches;
      Promise.all([decode(PLANET), wide ? decode(RELIEF) : undefined]).then(() => {
        if (!cancelled) scene.setAttribute("data-ready", "");
      });
    };

    if (document.readyState === "complete") start();
    else window.addEventListener("load", start, { once: true });
    return () => {
      cancelled = true;
      window.removeEventListener("load", start);
    };
  }, []);

  return null;
}
