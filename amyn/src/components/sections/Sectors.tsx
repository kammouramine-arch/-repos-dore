"use client";

import { motion } from "framer-motion";
import { Container } from "@/components/ui/Container";
import { DisplayLines } from "@/components/ui/DisplayLines";
import { GridLines } from "@/components/ui/GridLines";
import { MaskLine } from "@/components/ui/MaskLine";
import { sectors } from "@/lib/content";
import { EASE, inView, stagger } from "@/lib/motion";

/**
 * SECTION 04 — PAR MÉTIER
 *
 * Une table éditoriale : le métier à gauche, ce qu'il demande souvent à
 * droite. Pas de cartes, pas d'icônes — un filet suffit à séparer.
 *
 * La note sous le titre est importante : elle dit que rien n'est inclus
 * d'office. Sans elle, la liste se lirait comme un catalogue de
 * fonctionnalités garanties, ce qui serait faux.
 */
export function Sectors() {
  return (
    <section id="metiers" className="relative pb-32 pt-24 sm:pb-40 sm:pt-32">
      <GridLines />

      <Container className="relative">
        <motion.div {...inView} variants={stagger(0.09)}>
          <motion.div
            variants={{
              hidden: { opacity: 0 },
              visible: { opacity: 1, transition: { duration: 0.8, ease: EASE } },
            }}
            className="flex items-center gap-4"
          >
            <span className="eyebrow text-bone-mute">{sectors.index}</span>
            <span className="h-px w-8 bg-gold/60" />
            <span className="eyebrow text-gold">{sectors.eyebrow}</span>
          </motion.div>

          <h2 className="display mt-8 text-[clamp(1.7rem,4.6vw,4rem)] uppercase sm:mt-10">
            <DisplayLines lines={sectors.title} />
          </h2>

          <motion.p
            variants={{
              hidden: { opacity: 0, y: 16 },
              visible: {
                opacity: 1,
                y: 0,
                transition: { duration: 0.8, delay: 0.2, ease: EASE },
              },
            }}
            className="mt-8 max-w-xl text-balance text-[0.95rem] leading-[1.75] text-bone-dim"
          >
            {sectors.note}
          </motion.p>
        </motion.div>

        <ul className="mt-16 sm:mt-20">
          {sectors.items.map((item, i) => (
            <motion.li
              key={item.name}
              {...inView}
              variants={stagger(0.05, i * 0.05)}
              className="group border-t border-bone/10 last:border-b"
            >
              <div className="flex flex-col gap-2 py-7 transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:translate-x-2 motion-reduce:transition-none sm:flex-row sm:items-baseline sm:gap-10 sm:py-8">
                <h3 className="display w-full shrink-0 text-[clamp(1.35rem,3vw,2.25rem)] uppercase text-bone sm:w-[38%]">
                  <MaskLine>{item.name}</MaskLine>
                </h3>

                <motion.p
                  variants={{
                    hidden: { opacity: 0, y: 12 },
                    visible: {
                      opacity: 1,
                      y: 0,
                      transition: { duration: 0.7, delay: 0.12, ease: EASE },
                    },
                  }}
                  className="text-[0.95rem] leading-[1.65] text-bone-mute transition-colors duration-500 group-hover:text-bone-dim"
                >
                  {item.needs}
                </motion.p>
              </div>
            </motion.li>
          ))}
        </ul>
      </Container>
    </section>
  );
}
