"use client";

import { useEffect } from "react";

/**
 * Micro-interactions de pointeur, pour tout le site, avec un seul écouteur.
 *
 * - `[data-magnetic]` : l'élément suit légèrement le curseur (4 px au plus)
 *   et reçoit la position du curseur (--px, --py) pour sa lumière interne.
 * - `[data-tilt]` : l'élément s'incline de quelques degrés vers le curseur.
 * - `.cursor-halo` : un halo très doux suit le curseur.
 *
 * Ordinateur seulement (pointeur précis) et jamais si le visiteur a demandé
 * moins d'animations. Au doigt, les états d'appui sont gérés en CSS ; un
 * écouteur passif active `:active` sur iOS.
 */
export function Interactions() {
  useEffect(() => {
    const noop = () => {};
    document.addEventListener("touchstart", noop, { passive: true });

    const fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!fine || calm) {
      return () => document.removeEventListener("touchstart", noop);
    }

    const root = document.documentElement;
    const halo = document.querySelector<HTMLElement>(".cursor-halo");
    let frame = 0;
    let last: PointerEvent | null = null;
    let magnet: HTMLElement | null = null;
    let tilt: HTMLElement | null = null;

    const release = (el: HTMLElement | null, kind: "magnet" | "tilt") => {
      if (!el) return;
      if (kind === "magnet") {
        el.style.removeProperty("--mx");
        el.style.removeProperty("--my");
      } else {
        el.style.removeProperty("--rx");
        el.style.removeProperty("--ry");
      }
    };

    const update = () => {
      frame = 0;
      const e = last;
      if (!e) return;
      if (halo) halo.style.transform = `translate3d(${e.clientX}px, ${e.clientY}px, 0)`;

      const target = e.target instanceof Element ? e.target : null;
      const m = target?.closest<HTMLElement>("[data-magnetic]") ?? null;
      if (m !== magnet) {
        release(magnet, "magnet");
        magnet = m;
      }
      if (m) {
        const r = m.getBoundingClientRect();
        const x = e.clientX - r.left;
        const y = e.clientY - r.top;
        m.style.setProperty("--px", `${x}px`);
        m.style.setProperty("--py", `${y}px`);
        m.style.setProperty("--mx", `${((x / r.width - 0.5) * 8).toFixed(2)}px`);
        m.style.setProperty("--my", `${((y / r.height - 0.5) * 6).toFixed(2)}px`);
      }

      const t = target?.closest<HTMLElement>("[data-tilt]") ?? null;
      if (t !== tilt) {
        release(tilt, "tilt");
        tilt = t;
      }
      if (t) {
        const r = t.getBoundingClientRect();
        const dx = (e.clientX - r.left) / r.width - 0.5;
        const dy = (e.clientY - r.top) / r.height - 0.5;
        t.style.setProperty("--ry", `${(dx * 7).toFixed(2)}deg`);
        t.style.setProperty("--rx", `${(-dy * 5).toFixed(2)}deg`);
      }

      root.style.setProperty("--cx", ((e.clientX / window.innerWidth) * 2 - 1).toFixed(3));
      root.style.setProperty("--cy", ((e.clientY / window.innerHeight) * 2 - 1).toFixed(3));
    };

    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      last = e;
      root.classList.add("has-pointer");
      if (!frame) frame = requestAnimationFrame(update);
    };
    const onLeave = () => {
      root.classList.remove("has-pointer");
      release(magnet, "magnet");
      release(tilt, "tilt");
      magnet = tilt = null;
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    document.documentElement.addEventListener("pointerleave", onLeave);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener("touchstart", noop);
      window.removeEventListener("pointermove", onMove);
      document.documentElement.removeEventListener("pointerleave", onLeave);
    };
  }, []);

  return null;
}
