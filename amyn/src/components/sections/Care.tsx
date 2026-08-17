"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { DisplayLines } from "@/components/ui/DisplayLines";
import { care } from "@/lib/content";
import { EASE, inView, stagger } from "@/lib/motion";

/**
 * SECTION 07 — AMYN CARE — « LE POULS »
 *
 * Partout ailleurs sur ce site, le mouvement s'arrête dès que le visiteur
 * s'arrête : tout est piloté par le scroll. Ici, et ici seulement, une
 * impulsion continue de traverser l'écran toute seule.
 *
 * C'est l'argument de l'abonnement, rendu sensible avant d'être lu : le
 * site ne s'arrête pas le jour de la mise en ligne. On n'a pas besoin de
 * l'écrire, on le voit.
 *
 * La section est posée sur un fond légèrement relevé, avec un filet en haut
 * et en bas : c'est la seule de tout le site à se présenter comme une plaque
 * distincte. Un abonnement n'est pas une étape du récit, c'est un objet.
 */
export function Care() {
  const calm = useReducedMotion();

  return (
    <section
      id="care"
      className="relative border-y border-bone/10 bg-ink-soft py-24 sm:py-32"
    >
      <Container className="relative">
        <motion.div {...inView} variants={stagger(0.09)}>
          <motion.div
            variants={{
              hidden: { opacity: 0 },
              visible: { opacity: 1, transition: { duration: 0.8, ease: EASE } },
            }}
            className="flex items-center gap-4"
          >
            <span className="eyebrow text-bone-mute">{care.index}</span>
            <span className="h-px w-8 bg-gold/60" />
            <span className="eyebrow text-gold">{care.eyebrow}</span>
          </motion.div>

          <div className="mt-10 lg:flex lg:items-end lg:justify-between lg:gap-16">
            <h2 className="display text-[clamp(1.9rem,5vw,4.25rem)] uppercase">
              <DisplayLines lines={care.title} />
            </h2>

            {/* Le bloc d'abonnement. */}
            <motion.div
              variants={{
                hidden: { opacity: 0, y: 20 },
                visible: {
                  opacity: 1,
                  y: 0,
                  transition: { duration: 0.8, delay: 0.2, ease: EASE },
                },
              }}
              className="mt-12 shrink-0 lg:mt-0 lg:text-right"
            >
              <p className="eyebrow text-gold">{care.name}</p>

              <p className="display mt-4 text-[clamp(2.1rem,3.8vw,3.25rem)]">
                <span className="text-metal">{care.price}</span>
                <span className="ml-2 font-display text-[0.42em] font-medium tracking-normal text-bone-mute">
                  {care.period}
                </span>
              </p>

              <p className="mt-4 max-w-xs text-balance text-[0.9rem] leading-[1.65] text-bone-dim lg:ml-auto">
                {care.pitch}
              </p>

              <div className="mt-8 lg:flex lg:justify-end">
                <Button href="/contact" arrow={false}>
                  {care.cta}
                </Button>
              </div>
            </motion.div>
          </div>
        </motion.div>

        {/* ---- LE POULS ------------------------------------------------- */}
        <motion.div
          {...inView}
          variants={{
            hidden: { scaleX: 0 },
            visible: {
              scaleX: 1,
              transition: { duration: 1.2, ease: EASE },
            },
          }}
          className="relative mt-20 h-px w-full origin-left bg-bone/12 sm:mt-24"
        >
          {!calm && (
            <span aria-hidden className="absolute inset-0 overflow-hidden">
              {/* L'impulsion fait 22 % de la largeur ; la déplacer de 560 %
                  de sa propre largeur la fait traverser toute la ligne. */}
              <motion.span
                className="absolute left-0 top-0 h-px w-[22%] bg-gradient-to-r from-transparent via-gold to-transparent"
                animate={{ x: ["-110%", "560%"] }}
                transition={{
                  duration: 6.5,
                  repeat: Infinity,
                  repeatDelay: 1.2,
                  ease: "linear",
                }}
              />
            </span>
          )}
        </motion.div>

        <motion.div {...inView} variants={stagger(0.07, 0.1)}>
          {/* Le témoin de surveillance : il respire, il ne clignote pas. */}
          <motion.div
            variants={{
              hidden: { opacity: 0 },
              visible: { opacity: 1, transition: { duration: 0.7, ease: EASE } },
            }}
            className="mt-8 flex items-center gap-3"
          >
            <motion.span
              aria-hidden
              className="h-1.5 w-1.5 rounded-full bg-gold"
              animate={calm ? {} : { opacity: [0.3, 1, 0.3] }}
              transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut" }}
            />
            <span className="eyebrow text-bone-mute">{care.status}</span>
          </motion.div>

          <ul className="mt-12 grid gap-x-10 gap-y-6 sm:grid-cols-2 lg:grid-cols-3">
            {care.benefits.map((benefit, i) => (
              <motion.li
                key={benefit}
                variants={{
                  hidden: { opacity: 0, y: 16 },
                  visible: {
                    opacity: 1,
                    y: 0,
                    transition: {
                      duration: 0.7,
                      delay: i * 0.07,
                      ease: EASE,
                    },
                  },
                }}
                className="flex items-baseline gap-4 border-t border-bone/[0.09] pt-4"
              >
                <span aria-hidden className="mt-2 h-px w-5 shrink-0 bg-gold/50" />
                <span className="text-[0.95rem] leading-[1.5] text-bone">
                  {benefit}
                </span>
              </motion.li>
            ))}
          </ul>
        </motion.div>
      </Container>
    </section>
  );
}
