"use client";

import { useEffect } from "react";

/**
 * La lumière du hero suit le curseur de quelques pixels : pose --hx et --hy
 * (de -1 à 1) sur le hero, avec une inertie douce. Ordinateur seulement,
 * jamais si le visiteur a demandé moins d'animations, et aucune boucle
 * quand le curseur ne bouge plus.
 */
export function HeroLight() {
  useEffect(() => {
    const fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const hero = document.querySelector<HTMLElement>("[data-hero-scene]")?.parentElement;
    if (!fine || calm || !hero) return;

    const target = { x: 0, y: 0 };
    const pos = { x: 0, y: 0 };
    let frame = 0;

    const tick = () => {
      pos.x += (target.x - pos.x) * 0.06;
      pos.y += (target.y - pos.y) * 0.06;
      hero.style.setProperty("--hx", pos.x.toFixed(4));
      hero.style.setProperty("--hy", pos.y.toFixed(4));
      frame = Math.abs(target.x - pos.x) + Math.abs(target.y - pos.y) > 0.002 ? requestAnimationFrame(tick) : 0;
    };
    const onMove = (e: PointerEvent) => {
      const r = hero.getBoundingClientRect();
      if (e.clientY > r.bottom) return;
      target.x = ((e.clientX - r.left) / r.width) * 2 - 1;
      target.y = ((e.clientY - r.top) / r.height) * 2 - 1;
      if (!frame) frame = requestAnimationFrame(tick);
    };
    const onLeave = () => {
      target.x = 0;
      target.y = 0;
      if (!frame) frame = requestAnimationFrame(tick);
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    hero.addEventListener("pointerleave", onLeave);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("pointermove", onMove);
      hero.removeEventListener("pointerleave", onLeave);
    };
  }, []);

  return null;
}
