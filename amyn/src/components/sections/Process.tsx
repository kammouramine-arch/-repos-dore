"use client";

import { motion } from "framer-motion";
import { Container } from "@/components/ui/Container";
import { DisplayLines } from "@/components/ui/DisplayLines";
import { GridLines } from "@/components/ui/GridLines";
import { process } from "@/lib/content";
import { EASE, inView, stagger } from "@/lib/motion";

/**
 * SECTION 05 — LA MÉTHODE
 *
 * Quatre étapes, une ligne dorée qui les relie. Elle se trace au scroll :
 * le visiteur voit le projet avancer pendant qu'il lit.
 *
 * Horizontale sur grand écran, verticale sur mobile — même geste, même
 * lecture, sans jamais tasser quatre colonnes sur 390 px.
 */
export function Process() {
  return (
    <section id="methode" className="relative pb-32 pt-24 sm:pb-40 sm:pt-32">
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
            <span className="eyebrow text-bone-mute">{process.index}</span>
            <span className="h-px w-8 bg-gold/60" />
            <span className="eyebrow text-gold">{process.eyebrow}</span>
          </motion.div>

          <h2 className="display mt-8 text-[clamp(1.7rem,4.6vw,4rem)] uppercase sm:mt-10">
            <DisplayLines lines={process.title} />
          </h2>
        </motion.div>

        <div className="relative mt-20 sm:mt-24">
          {/* La ligne qui relie les étapes : horizontale au-dessus des
              colonnes sur grand écran, verticale à gauche sur mobile. */}
          <motion.span
            aria-hidden
            {...inView}
            variants={{
              hidden: { scaleY: 0, scaleX: 0 },
              visible: {
                scaleY: 1,
                scaleX: 1,
                transition: { duration: 1.4, ease: EASE },
              },
            }}
            className="absolute left-[3px] top-0 w-px origin-top bg-gradient-to-b from-gold/60 to-gold/10 lg:left-0 lg:right-0 lg:top-[3px] lg:h-px lg:w-full lg:origin-left lg:bg-gradient-to-r lg:from-gold/60 lg:to-gold/10"
            style={{ bottom: 0 }}
          />

          <ol className="grid gap-14 lg:grid-cols-4 lg:gap-10">
            {process.steps.map((step, i) => (
              <motion.li
                key={step.n}
                {...inView}
                variants={stagger(0.06, i * 0.12)}
                className="relative pl-10 lg:pl-0 lg:pt-10"
              >
                <motion.span
                  aria-hidden
                  variants={{
                    hidden: { scale: 0 },
                    visible: {
                      scale: 1,
                      transition: { duration: 0.5, ease: EASE },
                    },
                  }}
                  className="absolute left-0 top-[1px] block h-[7px] w-[7px] rounded-full bg-gold lg:left-0 lg:top-0"
                />

                <motion.span
                  variants={{
                    hidden: { opacity: 0 },
                    visible: {
                      opacity: 1,
                      transition: { duration: 0.7, delay: 0.1, ease: EASE },
                    },
                  }}
                  className="eyebrow block text-bone-mute"
                >
                  {step.n}
                </motion.span>

                <motion.h3
                  variants={{
                    hidden: { opacity: 0, y: 16 },
                    visible: {
                      opacity: 1,
                      y: 0,
                      transition: { duration: 0.7, delay: 0.18, ease: EASE },
                    },
                  }}
                  className="display mt-4 text-balance text-[clamp(1.05rem,1.7vw,1.35rem)] uppercase text-bone"
                >
                  {step.name}
                </motion.h3>

                <motion.p
                  variants={{
                    hidden: { opacity: 0, y: 14 },
                    visible: {
                      opacity: 1,
                      y: 0,
                      transition: { duration: 0.7, delay: 0.26, ease: EASE },
                    },
                  }}
                  className="mt-3 max-w-xs text-balance text-[0.9rem] leading-[1.7] text-bone-dim"
                >
                  {step.body}
                </motion.p>
              </motion.li>
            ))}
          </ol>
        </div>
      </Container>
    </section>
  );
}
