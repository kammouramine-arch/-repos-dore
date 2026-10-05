"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { isTrackEvent, track } from "@/lib/analytics";

/**
 * Relie le balisage aux événements de conversion, avec un seul écouteur :
 *   - tout lien ou bouton `[data-track="…"]` émet l'événement nommé au
 *     clic (`data-track-place` précise l'emplacement) ;
 *   - un lien `mailto:` émet `contact_initiated` ;
 *   - l'affichage de la page Revenue OS émet `revenue_os_viewed`.
 * Les composants serveur n'ont donc besoin que d'attributs.
 */
export function AnalyticsBridge() {
  const pathname = usePathname();

  useEffect(() => {
    if (pathname === "/revenue-os" || pathname === "/en/revenue-os") {
      track("revenue_os_viewed", { lang: pathname.startsWith("/en") ? "en" : "fr" });
    }
  }, [pathname]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const el = e.target instanceof Element ? e.target.closest<HTMLElement>("[data-track], a[href^='mailto:']") : null;
      if (!el) return;
      const name = el.dataset.track;
      if (isTrackEvent(name)) {
        track(name, { place: el.dataset.trackPlace, path: window.location.pathname });
      } else if (el.getAttribute("href")?.startsWith("mailto:")) {
        track("contact_initiated", { channel: "email", path: window.location.pathname });
      }
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  return null;
}
