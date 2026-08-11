"use client";

import { MaskLine } from "@/components/ui/MaskLine";

export type DisplayLine = {
  readonly text: string;
  readonly accent?: string;
};

/**
 * Un grand titre du site : une ligne = un masque, et au plus un mot d'accent
 * en serif italique.
 *
 * `accentClassName` porte la couleur de cet accent. C'est volontairement un
 * réglage : l'or est la règle sur tout le site, mais la section PROBLÈME
 * l'utilise en blanc cassé — l'absence d'or y est le propos.
 */
export function DisplayLines({
  lines,
  accentClassName = "text-metal",
}: {
  lines: readonly DisplayLine[];
  accentClassName?: string;
}) {
  return (
    <>
      {lines.map((line) => (
        <MaskLine key={line.text}>
          {line.text}
          {line.accent ? (
            <>
              {" "}
              <span className={`accent text-[1.08em] ${accentClassName}`}>
                {line.accent}
              </span>
            </>
          ) : null}
        </MaskLine>
      ))}
    </>
  );
}
