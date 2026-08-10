"use client";

import { motion, useMotionValue, useSpring } from "framer-motion";
import { useEffect } from "react";

/**
 * LA LUEUR — le noir devient vivant.
 *
 * Un halo doré très faible suit le curseur avec un léger retard élastique.
 * On ne le remarque pas consciemment ; on remarque seulement que le fond
 * « respire ».
 *
 * Il est masqué en CSS au doigt (mobile) et si l'utilisateur a réduit les
 * animations — voir la règle `.cursor-glow` dans globals.css. Passer par le
 * CSS plutôt que par un état React évite un rendu supplémentaire au montage.
 */
export function CursorGlow() {
  const x = useMotionValue(-600);
  const y = useMotionValue(-600);

  /* Le ressort crée la traîne : la lueur ne colle pas au curseur. */
  const springX = useSpring(x, { stiffness: 55, damping: 22, mass: 0.6 });
  const springY = useSpring(y, { stiffness: 55, damping: 22, mass: 0.6 });

  useEffect(() => {
    const move = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      x.set(e.clientX);
      y.set(e.clientY);
    };
    window.addEventListener("pointermove", move, { passive: true });
    return () => window.removeEventListener("pointermove", move);
  }, [x, y]);

  return (
    <motion.div
      aria-hidden
      style={{ x: springX, y: springY }}
      className="cursor-glow pointer-events-none fixed left-0 top-0 z-0 h-[42rem] w-[42rem] -translate-x-1/2 -translate-y-1/2 rounded-full"
    />
  );
}
