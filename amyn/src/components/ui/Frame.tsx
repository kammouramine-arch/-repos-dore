"use client";

import { motion } from "framer-motion";
import { DURATION, EASE } from "@/lib/motion";

/**
 * LE CADRE — signature visuelle du site.
 *
 * Quatre filets fins qui encadrent l'écran en permanence, comme la marge
 * d'une planche imprimée. C'est ce détail qui fait « objet de marque »
 * plutôt que « page web ». Les filets se tracent au chargement.
 */
export function Frame() {
  const line = "absolute bg-bone/12";

  /* Chaque filet se trace depuis son origine, en 0,9 s. */
  const draw = (axis: "x" | "y", delay: number) => ({
    initial: axis === "x" ? { scaleX: 0 } : { scaleY: 0 },
    animate: axis === "x" ? { scaleX: 1 } : { scaleY: 1 },
    transition: { duration: DURATION.slow, delay, ease: EASE },
  });

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-40 hidden p-4 sm:block sm:p-6"
    >
      <div className="relative h-full w-full">
        <motion.div
          className={`${line} left-0 right-0 top-0 h-px origin-left`}
          {...draw("x", 0)}
        />
        <motion.div
          className={`${line} bottom-0 left-0 right-0 h-px origin-right`}
          {...draw("x", 0.1)}
        />
        <motion.div
          className={`${line} bottom-0 left-0 top-0 w-px origin-top`}
          {...draw("y", 0.05)}
        />
        <motion.div
          className={`${line} bottom-0 right-0 top-0 w-px origin-bottom`}
          {...draw("y", 0.15)}
        />
      </div>
    </div>
  );
}
