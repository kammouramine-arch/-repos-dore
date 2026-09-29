"use client";

import { usePathname } from "next/navigation";
import { useState } from "react";
import { LANGUAGE_NAME, LOCALES, type Locale } from "@/lib/i18n/config";
import { translatePath } from "@/lib/i18n/routes";
import { getUi } from "@/lib/i18n/ui";

/**
 * Sélecteur de langue : une pastille FR | EN dont l'indicateur glisse vers
 * la langue choisie.
 *
 * - Chaque option mène à la MÊME page dans l'autre langue (table des
 *   adresses), en gardant les paramètres de la visite (`?source=…`).
 * - La langue suit ensuite la navigation d'elle-même : toutes les adresses
 *   anglaises commencent par `/en`. Aucun cookie, aucun stockage.
 * - Lecteurs d'écran : liste nommée « Langue », langue actuelle annoncée,
 *   nom de l'autre langue prononcé dans cette langue (`lang`).
 */
export function LanguageSwitcher({ locale, className = "" }: { locale: Locale; className?: string }) {
  const pathname = usePathname() ?? "/";
  const t = getUi(locale).language;
  const [shown, setShown] = useState<Locale>(locale);
  const index = LOCALES.indexOf(shown);

  return (
    <nav aria-label={t.label} className={className}>
      <ul className="relative flex h-11 items-center rounded-full border border-[rgb(242_238_230/0.12)] bg-[rgb(242_238_230/0.04)] p-1 backdrop-blur-md">
        {/* Indicateur : il glisse vers la langue choisie avant le changement de page. */}
        <li
          aria-hidden
          className="pointer-events-none absolute bottom-1 left-1 top-1 w-10 rounded-full bg-[rgb(242_238_230/0.12)] shadow-[inset_0_1px_0_rgb(255_255_255/0.08),0_6px_16px_-8px_rgb(0_0_0/0.8)] transition-transform duration-300 ease-[var(--ease-spring)] motion-reduce:transition-none"
          style={{ transform: `translateX(${index * 100}%)` }}
        />
        {LOCALES.map((code) => {
          const current = code === locale;
          const label = (
            <>
              {/* Nom accessible « EN — English » : il contient le texte visible
                  (commande vocale) et se prononce dans la bonne langue. */}
              <span className="font-mono text-[0.75rem] tracking-[0.12em]">{code.toUpperCase()}</span>
              <span className="sr-only">
                {" — "}
                <span lang={code}>{LANGUAGE_NAME[code]}</span>
                {current ? `, ${t.current}` : ""}
              </span>
            </>
          );
          const base =
            "relative z-10 flex h-9 w-10 items-center justify-center rounded-full transition-colors duration-300";
          return (
            <li key={code}>
              {current ? (
                <span aria-current="true" className={`${base} ${shown === code ? "text-gold-2" : "text-bone-3"}`}>
                  {label}
                </span>
              ) : (
                <a
                  href={translatePath(pathname, code)}
                  hrefLang={code}
                  title={`${t.switchTo} ${LANGUAGE_NAME[code]}`}
                  onPointerDown={() => setShown(code)}
                  onKeyDown={(e) => e.key === "Enter" && setShown(code)}
                  onClick={(e) => {
                    /* Même page, mêmes paramètres de visite. */
                    const extra = window.location.search + window.location.hash;
                    if (extra) e.currentTarget.href = translatePath(pathname, code) + extra;
                  }}
                  className={`${base} hit-area outline-none focus-visible:ring-2 focus-visible:ring-gold ${
                    shown === code ? "text-gold-2" : "text-bone-2 hover:text-bone"
                  }`}
                >
                  {label}
                </a>
              )}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
