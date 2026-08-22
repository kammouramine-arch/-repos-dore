"use client";

import { motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { COMPACT, ConceptSite, WIDE } from "@/components/work/ConceptSite";
import type { Concept } from "@/lib/concepts";
import { EASE } from "@/lib/motion";

/**
 * Fenêtre de navigateur.
 *
 * Le concept est écrit aux dimensions réelles d'un site puis réduit par une
 * transformation CSS : le texte reste vectoriel, donc net, et les
 * proportions sont exactement celles d'un site en production. C'est ce qui
 * sépare un aperçu crédible d'une vignette approximative.
 *
 * Sous 560 px de large, on bascule sur la composition étroite du même
 * concept : réduire une page de 1440 px sur un téléphone la rendrait
 * illisible, alors que le site, lui, est responsive.
 */
export function BrowserFrame({ concept }: { concept: Concept }) {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new ResizeObserver(() =>
      setWidth(el.getBoundingClientRect().width),
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const compact = width > 0 && width < 560;
  const dims = compact ? COMPACT : WIDE;
  const scale = width > 0 ? width / dims.width : 0;

  return (
    <div className="relative">
      {/* Le badge ne disparaît jamais : ces sites sont des concepts. */}
      <span className="eyebrow absolute -top-3 right-6 z-10 rounded-full border border-gold/40 bg-ink px-3 py-1 text-[0.5rem] text-gold">
        Concept AMYN
      </span>

      <div className="overflow-hidden rounded-xl border border-bone/12 bg-ink-soft shadow-[0_40px_120px_-40px_rgba(0,0,0,0.9)] sm:rounded-2xl">
        {/* Barre du navigateur. */}
        <div className="flex items-center gap-3 border-b border-bone/10 px-4 py-3 sm:px-5">
          <span aria-hidden className="flex shrink-0 gap-[6px]">
            <span className="block h-[9px] w-[9px] rounded-full bg-bone/15" />
            <span className="block h-[9px] w-[9px] rounded-full bg-bone/15" />
            <span className="block h-[9px] w-[9px] rounded-full bg-bone/15" />
          </span>

          <span className="flex min-w-0 flex-1 items-center justify-center">
            <motion.span
              key={concept.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4, ease: EASE }}
              className="max-w-full truncate rounded-full bg-bone/[0.06] px-4 py-1.5 text-[0.7rem] tracking-wide text-bone-mute"
            >
              {concept.domain}
            </motion.span>
          </span>

          {/* Contrepoids des pastilles, pour que l'adresse reste centrée. */}
          <span aria-hidden className="hidden w-[39px] shrink-0 sm:block" />
        </div>

        {/* La page, mise à l'échelle. */}
        <div ref={ref} className="relative w-full overflow-hidden">
          <div style={{ height: scale ? dims.height * scale : undefined }}>
            {scale > 0 && (
              /* La fenêtre ne bouge pas ; c'est la page qui change. Le
                 changement de clé remonte le site et le fait apparaître. */
              <motion.div
                key={concept.id}
                initial={{ opacity: 0, scale: 1.015 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.55, ease: EASE }}
                style={{ transformOrigin: "top left" }}
              >
                <div
                  style={{
                    transform: `scale(${scale})`,
                    transformOrigin: "top left",
                    width: dims.width,
                    height: dims.height,
                  }}
                >
                  <ConceptSite concept={concept} compact={compact} />
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
