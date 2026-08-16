"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { DisplayLines } from "@/components/ui/DisplayLines";
import { contact, finalCta } from "@/lib/content";
import { EASE, inView, stagger } from "@/lib/motion";

/**
 * SECTION 08 — L'APPEL
 *
 * Le conducteur qui court depuis le filet doré de l'intro descend une
 * dernière fois et s'arrête net, sur un point. Sous ce point : une
 * question, trois lignes, un bouton. Rien d'autre à l'écran.
 *
 * C'est la fin du récit ET la fin du motif. Le site n'a plus rien à
 * démontrer, il ne reste qu'à répondre.
 */
export function FinalCta() {
  const mailto = contact.email ? `mailto:${contact.email}` : null;

  return (
    <section
      id="contact"
      className="relative flex min-h-[92svh] flex-col items-center justify-center py-28 text-center sm:py-32"
    >
      <Container className="relative flex flex-col items-center">
        <motion.div {...inView} variants={stagger(0.1)} className="flex flex-col items-center">
          {/* La fin du conducteur. */}
          <motion.span
            aria-hidden
            variants={{
              hidden: { scaleY: 0 },
              visible: {
                scaleY: 1,
                transition: { duration: 1.1, ease: EASE },
              },
            }}
            className="h-24 w-px origin-top bg-gradient-to-b from-transparent via-gold/50 to-gold sm:h-32"
          />
          <motion.span
            aria-hidden
            variants={{
              hidden: { scale: 0 },
              visible: {
                scale: 1,
                transition: { duration: 0.5, delay: 0.9, ease: EASE },
              },
            }}
            className="-mt-[3px] mb-16 h-[7px] w-[7px] rounded-full bg-gold sm:mb-20"
          />

          <h2 className="display text-[clamp(1.9rem,5.4vw,4.75rem)] uppercase">
            <DisplayLines lines={finalCta.title} />
          </h2>

          <motion.p
            variants={{
              hidden: { opacity: 0, y: 18 },
              visible: {
                opacity: 1,
                y: 0,
                transition: { duration: 0.8, delay: 0.25, ease: EASE },
              },
            }}
            className="mt-10 max-w-xl text-balance text-[0.975rem] leading-[1.75] text-bone-dim sm:text-base"
          >
            {finalCta.body}
          </motion.p>

          <motion.div
            variants={{
              hidden: { opacity: 0, y: 18 },
              visible: {
                opacity: 1,
                y: 0,
                transition: { duration: 0.8, delay: 0.4, ease: EASE },
              },
            }}
            className="mt-12"
          >
            <Button href={mailto ?? "#contact"}>{finalCta.cta}</Button>
          </motion.div>

          {/* Une seconde porte d'entrée, discrète, pour qui préfère écrire. */}
          {contact.email && (
            <motion.a
              variants={{
                hidden: { opacity: 0 },
                visible: {
                  opacity: 1,
                  transition: { duration: 0.8, delay: 0.55, ease: EASE },
                },
              }}
              href={`mailto:${contact.email}`}
              className="mt-8 font-display text-[0.72rem] uppercase tracking-[0.18em] text-bone-mute transition-colors duration-400 hover:text-gold"
            >
              {contact.email}
            </motion.a>
          )}
        </motion.div>
      </Container>
    </section>
  );
}
