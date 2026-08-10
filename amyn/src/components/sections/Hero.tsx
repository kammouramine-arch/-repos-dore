"use client";

import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import { useIntro } from "@/components/layout/IntroGate";
import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Container";
import { MaskLine } from "@/components/ui/MaskLine";
import { hero } from "@/lib/content";
import { EASE, stagger } from "@/lib/motion";

/**
 * HERO — « L'ATELIER »
 *
 * Composition éditoriale asymétrique : le titre occupe la gauche comme un
 * titre de couverture, le discours et les actions se rangent en bas, et les
 * informations de contexte tiennent la ligne de pied.
 *
 * Trois couches se déplacent à des vitesses différentes au scroll (grille,
 * contenu, page) : c'est ce décalage — le parallax — qui crée la profondeur.
 */
export function Hero() {
  const { ready } = useIntro();
  const calm = useReducedMotion();
  const ref = useRef<HTMLElement>(null);

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });

  /* Le contenu remonte plus vite que la page et s'efface : la section
     ne « défile » pas, elle se retire. */
  const contentY = useTransform(scrollYProgress, [0, 1], ["0%", "-18%"]);
  const contentOpacity = useTransform(scrollYProgress, [0, 0.72], [1, 0]);
  /* La grille, elle, traîne derrière : c'est l'arrière-plan. */
  const gridY = useTransform(scrollYProgress, [0, 1], ["0%", "12%"]);

  const parallax = calm ? {} : { y: contentY, opacity: contentOpacity };

  return (
    <section
      ref={ref}
      id="hero"
      className="relative flex min-h-[100svh] flex-col overflow-hidden"
    >
      {/* ---- Couche 1 : l'atmosphère ------------------------------------ */}
      <div aria-hidden className="spotlight pointer-events-none absolute inset-0" />

      {/* ---- Couche 2 : la grille de composition ------------------------ */}
      <motion.div
        aria-hidden
        style={calm ? {} : { y: gridY }}
        className="pointer-events-none absolute inset-0"
      >
        <Container className="h-full">
          <div className="hidden h-full grid-cols-4 sm:grid">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="border-l border-bone/[0.045] last:border-r" />
            ))}
          </div>
        </Container>
      </motion.div>

      {/* ---- Couche 3 : le contenu -------------------------------------- */}
      <motion.div
        style={parallax}
        variants={stagger(0.075, 0.05)}
        initial="hidden"
        animate={ready ? "visible" : "hidden"}
        className="relative flex flex-1 flex-col pb-8 pt-24 sm:pb-12 sm:pt-28"
      >
        <div className="flex flex-1 flex-col justify-center">
          <Container>
            {/* Surtitre indexé — la marque de fabrique éditoriale. */}
            <motion.div
              variants={{
                hidden: { opacity: 0 },
                visible: { opacity: 1, transition: { duration: 0.8, ease: EASE } },
              }}
              className="flex items-center gap-4"
            >
              <span className="eyebrow text-bone-mute">{hero.index}</span>
              <span className="h-px w-8 bg-gold/50" />
              <span className="eyebrow text-gold">{hero.eyebrow}</span>
            </motion.div>

            {/* Le titre : une ligne = un masque. */}
            <h1 className="display mt-8 text-[clamp(1.9rem,6.9vw,6.5rem)] uppercase sm:mt-10">
              {hero.title.map((line) => (
                <MaskLine key={line.text}>
                  {line.text}
                  {"accent" in line && line.accent ? (
                    <>
                      {" "}
                      <span className="accent text-[1.08em] text-metal">
                        {line.accent}
                      </span>
                    </>
                  ) : null}
                </MaskLine>
              ))}
            </h1>

            {/* Le filet se trace après le titre : il referme la phrase. */}
            <motion.div
              variants={{
                hidden: { scaleX: 0 },
                visible: {
                  scaleX: 1,
                  transition: { duration: 1, delay: 0.35, ease: EASE },
                },
              }}
              className="mt-10 h-px w-full origin-left bg-bone/12 sm:mt-12"
            />

            {/* Discours à gauche, actions à droite : composition asymétrique. */}
            <div className="mt-8 flex flex-col gap-10 sm:mt-10 lg:flex-row lg:items-end lg:justify-between lg:gap-16">
              <motion.p
                variants={{
                  hidden: { opacity: 0, y: 20 },
                  visible: {
                    opacity: 1,
                    y: 0,
                    transition: { duration: 0.8, delay: 0.45, ease: EASE },
                  },
                }}
                className="max-w-lg text-[0.975rem] leading-[1.75] text-bone-dim sm:text-base"
              >
                {hero.body}
              </motion.p>

              <motion.div
                variants={{
                  hidden: { opacity: 0, y: 20 },
                  visible: {
                    opacity: 1,
                    y: 0,
                    transition: { duration: 0.8, delay: 0.58, ease: EASE },
                  },
                }}
                className="flex shrink-0 flex-col gap-3 sm:flex-row sm:items-center sm:gap-4"
              >
                <Button href={hero.ctaPrimary.href}>{hero.ctaPrimary.label}</Button>
                <Button href={hero.ctaSecondary.href} variant="ghost" arrow={false}>
                  {hero.ctaSecondary.label}
                </Button>
              </motion.div>
            </div>
          </Container>
        </div>

        {/* ---- Ligne de pied : repère de scroll + contexte --------------- */}
        <motion.div
          variants={{
            hidden: { opacity: 0 },
            visible: {
              opacity: 1,
              transition: { duration: 0.9, delay: 0.75, ease: EASE },
            },
          }}
          className="mt-10 sm:mt-14"
        >
          <Container className="flex items-end justify-between gap-6">
            <div className="flex items-center gap-4">
              {/* Un éclat doré descend dans le filet, en boucle. */}
              <div className="relative h-10 w-px overflow-hidden bg-bone/15">
                <motion.div
                  className="absolute inset-x-0 h-4 bg-gold"
                  animate={calm ? {} : { y: ["-100%", "300%"] }}
                  transition={{
                    duration: 2.1,
                    repeat: Infinity,
                    ease: "easeInOut",
                    repeatDelay: 0.4,
                  }}
                />
              </div>
              <span className="eyebrow text-bone-mute">Scroll</span>
            </div>

            <span className="hidden whitespace-nowrap text-right text-[0.7rem] uppercase tracking-[0.18em] text-bone-mute sm:block">
              {hero.meta}
            </span>
          </Container>
        </motion.div>
      </motion.div>
    </section>
  );
}
