"use client";

import { motion, useMotionValueEvent, useScroll } from "framer-motion";
import { useState } from "react";
import { useIntro } from "@/components/layout/IntroGate";
import { Container } from "@/components/ui/Container";
import { Wordmark } from "@/components/ui/Wordmark";
import { nav } from "@/lib/content";
import { DURATION, EASE } from "@/lib/motion";

/**
 * En-tête fixe, volontairement minimal : le nom, quatre liens, une action.
 *
 * Au repos il flotte sur le noir sans aucun fond. Dès qu'on scrolle, un
 * voile flou et un filet apparaissent pour que les liens restent lisibles
 * par-dessus le contenu — jamais avant, sinon la barre alourdit le hero.
 */
export function Header() {
  const { ready } = useIntro();
  const { scrollY } = useScroll();
  const [scrolled, setScrolled] = useState(false);

  useMotionValueEvent(scrollY, "change", (v) => setScrolled(v > 64));

  return (
    <motion.header
      initial={{ opacity: 0, y: -16 }}
      animate={ready ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: DURATION.base, delay: 0.5, ease: EASE }}
      className={`fixed inset-x-0 top-0 z-30 transition-[background-color,backdrop-filter,border-color] duration-500 ${
        scrolled
          ? "border-b border-bone/10 bg-ink/70 backdrop-blur-xl"
          : "border-b border-transparent"
      }`}
    >
      <Container className="flex h-16 items-center justify-between sm:h-20">
        <a href="#hero" aria-label="AMYN — accueil" className="shrink-0">
          <Wordmark className="text-base sm:text-lg" />
        </a>

        <nav className="hidden items-center gap-10 md:flex">
          {nav.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="group relative font-display text-[0.7rem] font-medium uppercase tracking-[0.2em] text-bone-dim transition-colors duration-300 hover:text-bone"
            >
              {item.label}
              {/* Le filet doré se trace sous le lien au survol. */}
              <span className="absolute -bottom-1.5 left-0 h-px w-full origin-left scale-x-0 bg-gold transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-x-100" />
            </a>
          ))}
        </nav>

        <a
          href="#contact"
          className="group font-display text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-bone transition-colors duration-300 hover:text-gold"
        >
          Parler à AMYN
          <span className="ml-2 inline-block transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:translate-x-1">
            →
          </span>
        </a>
      </Container>
    </motion.header>
  );
}
