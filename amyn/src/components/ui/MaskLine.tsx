"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";
import { EASE } from "@/lib/motion";

/**
 * LA RÉVÉLATION PAR MASQUE — la brique d'animation la plus importante du site.
 *
 * Le texte ne « s'estompe » pas : il remonte depuis SOUS sa propre ligne,
 * qui joue le rôle de fenêtre. C'est ce geste, emprunté à l'imprimerie,
 * qui sépare une animation d'agence d'un simple fade-in de template.
 *
 * Le `py`/`-my` agrandit la fenêtre de découpe sans changer la mise en page,
 * pour que les accents (É, À) et les jambages (p, g) ne soient jamais coupés.
 */
export function MaskLine({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <span className="block overflow-hidden py-[0.14em] -my-[0.14em]">
      <motion.span
        className={`block will-change-transform ${className}`}
        variants={{
          hidden: { y: "115%" },
          visible: {
            y: "0%",
            transition: { duration: 1, ease: EASE },
          },
        }}
      >
        {children}
      </motion.span>
    </span>
  );
}
