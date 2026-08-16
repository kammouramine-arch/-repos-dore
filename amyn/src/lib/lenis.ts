import type Lenis from "lenis";

/**
 * Accès partagé à l'instance de défilement lissé.
 *
 * Une seule chose en a besoin : le menu mobile, qui doit figer la page
 * pendant qu'il est ouvert. Sans ça, on scrolle « derrière » l'ouverture.
 */
let instance: Lenis | null = null;

export function setLenis(next: Lenis | null) {
  instance = next;
}

/** Fige ou relâche le défilement de la page. */
export function lockScroll(locked: boolean) {
  if (instance) {
    if (locked) instance.stop();
    else instance.start();
  }
  /* Repli quand Lenis est désactivé (animations réduites). */
  document.documentElement.style.overflow = locked ? "hidden" : "";
}
