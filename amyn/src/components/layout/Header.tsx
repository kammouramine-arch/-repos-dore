"use client";

import { AnimatePresence, motion, useMotionValueEvent, useScroll } from "framer-motion";
import { useEffect, useState } from "react";
import { useIntro } from "@/components/layout/IntroGate";
import { Container } from "@/components/ui/Container";
import { Wordmark } from "@/components/ui/Wordmark";
import { nav } from "@/lib/content";
import { lockScroll } from "@/lib/lenis";
import { DURATION, EASE } from "@/lib/motion";

/**
 * En-tête fixe, volontairement minimal : le nom, quatre liens, une action.
 *
 * Au repos il flotte sur le noir sans aucun fond. Dès qu'on scrolle, un
 * voile flou et un filet apparaissent pour que les liens restent lisibles
 * par-dessus le contenu — jamais avant, sinon la barre alourdit le hero.
 *
 * Le lien de la section en cours reste souligné d'or : c'est la seule
 * indication de position du site, et elle ne coûte pas un pixel de plus.
 */
export function Header() {
  const { ready } = useIntro();
  const { scrollY } = useScroll();
  const [scrolled, setScrolled] = useState(false);
  const [current, setCurrent] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  useMotionValueEvent(scrollY, "change", (v) => setScrolled(v > 64));

  /* Quelle section occupe le milieu de l'écran ? */
  useEffect(() => {
    const targets = nav
      .map((item) => document.getElementById(item.href.slice(1)))
      .filter((el): el is HTMLElement => el !== null);
    if (targets.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setCurrent(entry.target.id);
        }
      },
      { rootMargin: "-45% 0px -45% 0px" },
    );

    targets.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  /* La page ne doit pas défiler derrière le menu ouvert. */
  useEffect(() => {
    lockScroll(menuOpen);
    return () => lockScroll(false);
  }, [menuOpen]);

  /* Échap referme, comme partout ailleurs. */
  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  return (
    <>
      <motion.header
        initial={{ opacity: 0, y: -16 }}
        animate={ready ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: DURATION.base, delay: 0.5, ease: EASE }}
        className={`fixed inset-x-0 top-0 z-30 transition-[background-color,backdrop-filter,border-color] duration-500 ${
          scrolled && !menuOpen
            ? "border-b border-bone/10 bg-ink/70 backdrop-blur-xl"
            : "border-b border-transparent"
        }`}
      >
        <Container className="flex h-16 items-center justify-between sm:h-20">
          <a href="#hero" aria-label="AMYN — accueil" className="shrink-0">
            <Wordmark className="text-base sm:text-lg" />
          </a>

          <nav aria-label="Sections du site" className="hidden items-center gap-10 md:flex">
            {nav.map((item) => {
              const isCurrent = current === item.href.slice(1);
              return (
                <a
                  key={item.href}
                  href={item.href}
                  aria-current={isCurrent ? "true" : undefined}
                  className={`group relative font-display text-[0.7rem] font-medium uppercase tracking-[0.2em] transition-colors duration-300 ${
                    isCurrent ? "text-bone" : "text-bone-dim hover:text-bone"
                  }`}
                >
                  {item.label}
                  {/* Le filet doré se trace sous le lien — au survol, ou en
                      permanence quand on est dans la section. */}
                  <span
                    className={`absolute -bottom-1.5 left-0 h-px w-full origin-left bg-gold transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-x-100 ${
                      isCurrent ? "scale-x-100" : "scale-x-0"
                    }`}
                  />
                </a>
              );
            })}
          </nav>

          <div className="flex items-center gap-6">
            <a
              href="#contact"
              className="group hidden font-display text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-bone transition-colors duration-300 hover:text-gold sm:inline"
            >
              Parler à AMYN
              <span className="ml-2 inline-block transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:translate-x-1">
                →
              </span>
            </a>

            <button
              type="button"
              onClick={() => setMenuOpen((open) => !open)}
              aria-expanded={menuOpen}
              aria-controls="menu-principal"
              className="font-display text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-bone transition-colors duration-300 hover:text-gold md:hidden"
            >
              {menuOpen ? "Fermer" : "Menu"}
            </button>
          </div>
        </Container>
      </motion.header>

      {/* Menu plein écran — petits écrans. Du texte, pas d'icône. */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            id="menu-principal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35, ease: EASE }}
            className="fixed inset-0 z-20 flex flex-col justify-center bg-ink md:hidden"
          >
            <Container>
              <nav aria-label="Menu principal">
                <ul className="space-y-2">
                  {nav.map((item, i) => (
                    <motion.li
                      key={item.href}
                      initial={{ opacity: 0, y: 18 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{
                        duration: 0.5,
                        delay: 0.08 + i * 0.06,
                        ease: EASE,
                      }}
                    >
                      <a
                        href={item.href}
                        onClick={() => setMenuOpen(false)}
                        className="display block py-2 text-[clamp(1.9rem,9vw,2.75rem)] uppercase text-bone"
                      >
                        {item.label}
                      </a>
                    </motion.li>
                  ))}
                </ul>
              </nav>

              <motion.a
                href="#contact"
                onClick={() => setMenuOpen(false)}
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.34, ease: EASE }}
                className="mt-14 inline-flex items-center gap-3 font-display text-[0.75rem] font-semibold uppercase tracking-[0.2em] text-gold"
              >
                Parler à AMYN <span aria-hidden>→</span>
              </motion.a>
            </Container>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
