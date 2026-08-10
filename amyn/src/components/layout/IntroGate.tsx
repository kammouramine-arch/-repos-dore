"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { MaskLine } from "@/components/ui/MaskLine";
import { Wordmark } from "@/components/ui/Wordmark";
import { EASE } from "@/lib/motion";

/* Durée du rideau avant qu'il ne se lève, en millisecondes. */
const INTRO_MS = 1500;
const SESSION_KEY = "amyn:intro-seen";

/**
 * `ready` passe à true au moment PRÉCIS où le rideau commence à se lever.
 * Le hero s'anime donc pendant que le voile remonte : les deux mouvements
 * se recouvrent, et la page semble déjà vivante quand on la découvre.
 */
const IntroContext = createContext({ ready: false });
export const useIntro = () => useContext(IntroContext);

/* Rien à écouter : la décision est prise une seule fois, au montage. */
const subscribe = () => () => {};

/* Sur le serveur on ne sait rien du navigateur : on suppose que l'intro joue. */
const playsOnServer = () => true;

/* Côté navigateur : on saute l'intro si elle a déjà été vue dans la session,
   ou si l'utilisateur a demandé moins d'animations. */
const playsInBrowser = () =>
  !(
    window.sessionStorage.getItem(SESSION_KEY) === "1" ||
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );

export function IntroGate({ children }: { children: ReactNode }) {
  const shouldPlay = useSyncExternalStore(
    subscribe,
    playsInBrowser,
    playsOnServer,
  );
  const [finished, setFinished] = useState(false);

  const playing = shouldPlay && !finished;
  const ready = !shouldPlay || finished;

  useEffect(() => {
    if (!playing) return;

    const timer = setTimeout(() => {
      window.sessionStorage.setItem(SESSION_KEY, "1");
      setFinished(true);
    }, INTRO_MS);

    return () => clearTimeout(timer);
  }, [playing]);

  return (
    <IntroContext.Provider value={{ ready }}>
      <AnimatePresence>
        {playing && (
          <motion.div
            key="intro"
            aria-hidden
            className="fixed inset-0 z-[70] flex items-center justify-center bg-ink"
            exit={{ y: "-100%" }}
            transition={{ duration: 1.05, ease: EASE }}
          >
            <motion.div
              className="flex flex-col items-center"
              initial="hidden"
              animate="visible"
              exit={{ opacity: 0, y: -24, transition: { duration: 0.5 } }}
            >
              <MaskLine>
                <Wordmark className="text-[clamp(2.5rem,9vw,5rem)]" />
              </MaskLine>

              {/* Le filet se trace sous le nom, comme une signature. */}
              <motion.div
                className="rule-gold mt-6 h-px w-[min(60vw,17rem)] origin-center"
                variants={{
                  hidden: { scaleX: 0 },
                  visible: {
                    scaleX: 1,
                    transition: { duration: 0.9, delay: 0.45, ease: EASE },
                  },
                }}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {children}
    </IntroContext.Provider>
  );
}
