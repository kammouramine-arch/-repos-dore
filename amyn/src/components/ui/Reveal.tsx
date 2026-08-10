"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";
import { DURATION, EASE } from "@/lib/motion";

/**
 * Enveloppe n'importe quel bloc pour qu'il apparaisse à son entrée à l'écran.
 * Ne se joue qu'une fois : un élément qui rejoue son animation à chaque
 * passage donne un effet « démo », pas un effet premium.
 */
export function Reveal({
  children,
  delay = 0,
  y = 24,
  className = "",
}: {
  children: ReactNode;
  delay?: number;
  y?: number;
  className?: string;
}) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.25 }}
      transition={{ duration: DURATION.base, delay, ease: EASE }}
    >
      {children}
    </motion.div>
  );
}
