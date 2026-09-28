"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { buttonClass } from "@/components/ui/Button";
import { ArrowRight } from "@/components/ui/Icons";
import { Container } from "@/components/ui/Layout";
import { cta, mainNav, site } from "@/lib/site";
import { Logo } from "./Logo";

/**
 * En-tête du site.
 *
 * Transparent en haut de page ; dès qu'on défile, un voile flou et un filet
 * le détachent du contenu. Une seule action forte : le premier aperçu.
 *
 * Sur téléphone, le menu occupe l'écran. Il se referme avec Échap, au
 * changement de page, et garde le focus clavier à l'intérieur tant qu'il
 * est ouvert.
 */
export function SiteHeader() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [openedAt, setOpenedAt] = useState(pathname);
  const toggle = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);

  /* Changer de page referme le menu, sans effet ni cascade de rendus. */
  if (open && openedAt !== pathname) setOpen(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const close = useCallback((restoreFocus = true) => {
    setOpen(false);
    if (restoreFocus) toggle.current?.focus();
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("menu-open", open);
    if (!open) return;

    /* Le panneau devient visible pendant sa transition : on attend une
       image avant de placer le focus sur le premier lien. */
    const focusTimer = window.setTimeout(
      () => panel.current?.querySelector<HTMLElement>("a")?.focus(),
      60,
    );

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") return close();
      if (event.key !== "Tab" || !panel.current) return;

      /* Le focus tourne entre le bouton de fermeture et les liens du menu. */
      const focusables = [
        toggle.current,
        ...panel.current.querySelectorAll<HTMLElement>("a"),
      ].filter(Boolean) as HTMLElement[];
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    window.addEventListener("keydown", onKey);
    return () => {
      window.clearTimeout(focusTimer);
      window.removeEventListener("keydown", onKey);
      document.documentElement.classList.remove("menu-open");
    };
  }, [open, close]);

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`);

  const solid = scrolled || open;

  return (
    <>
      <header
        className={`tone-ink fixed inset-x-0 top-0 z-50 border-b transition-[background-color,border-color,backdrop-filter] duration-500 ${
          solid
            ? "border-line bg-[rgb(10_10_10/0.82)] backdrop-blur-xl"
            : "border-transparent bg-transparent"
        }`}
      >
        <Container className="flex h-[var(--header-h)] items-center justify-between gap-6">
          <Link href="/" aria-label={`${site.name} — accueil`} className="-m-2 p-2">
            <Logo />
          </Link>

          <nav aria-label="Navigation principale" className="hidden lg:block">
            <ul className="flex items-center gap-9">
              {mainNav.map((item) => {
                const active = isActive(item.href);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      aria-current={active ? "page" : undefined}
                      className={`relative py-2 text-[0.9375rem] transition-colors duration-300 ${
                        active ? "text-fg" : "text-fg-2 hover:text-fg"
                      }`}
                    >
                      {item.label}
                      <span
                        aria-hidden
                        className={`absolute inset-x-0 -bottom-0.5 h-px origin-left bg-accent transition-transform duration-500 ease-[var(--ease-out)] ${
                          active ? "scale-x-100" : "scale-x-0"
                        }`}
                      />
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          <div className="flex items-center gap-2 sm:gap-6">
            <Link
              href={cta.project.href}
              className="link-line hidden text-[0.9375rem] text-fg-2 transition-colors hover:text-fg xl:inline"
            >
              {cta.project.label}
            </Link>
            <span className="hidden md:block">
              <Link
                href={cta.firstLook.href}
                className={buttonClass("primary", "!min-h-10 !px-5 text-[0.875rem]")}
              >
                {cta.firstLook.label}
                <ArrowRight className="nudge size-4" />
              </Link>
            </span>

            <button
              ref={toggle}
              type="button"
              onClick={() => {
                setOpenedAt(pathname);
                setOpen((v) => !v);
              }}
              aria-expanded={open}
              aria-controls="menu-mobile"
              className="-mr-2 flex min-h-11 items-center gap-3 px-2 text-[0.9375rem] text-fg lg:hidden"
            >
              <span>{open ? "Fermer" : "Menu"}</span>
              <span aria-hidden className="relative block h-3 w-5">
                <span
                  className={`absolute left-0 top-0.5 h-px w-5 bg-current transition-transform duration-500 ease-[var(--ease-out)] ${
                    open ? "translate-y-[4px] rotate-45" : ""
                  }`}
                />
                <span
                  className={`absolute bottom-0.5 left-0 h-px w-5 bg-current transition-transform duration-500 ease-[var(--ease-out)] ${
                    open ? "-translate-y-[4px] -rotate-45" : ""
                  }`}
                />
              </span>
            </button>
          </div>
        </Container>
      </header>

      {/* Menu mobile. Toujours présent dans le DOM pour animer son entrée,
          mais retiré du parcours clavier et des lecteurs d'écran quand il
          est fermé. */}
      <div
        id="menu-mobile"
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-label="Menu"
        inert={!open}
        className={`tone-ink fixed inset-0 z-40 flex flex-col overflow-y-auto pt-[var(--header-h)] transition-[opacity,visibility] duration-500 ease-[var(--ease-out)] lg:hidden ${
          open ? "visible opacity-100" : "invisible opacity-0"
        }`}
      >
        <Container className="flex flex-1 flex-col justify-between gap-12 pb-10 pt-8">
          <nav aria-label="Menu principal">
            <ul className="divide-y divide-line border-y border-line">
              {[...mainNav, { label: "Contact", href: cta.project.href }].map((item, i) => (
                <li
                  key={item.href}
                  className={`transition-[opacity,transform] duration-700 ease-[var(--ease-out)] ${
                    open ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0"
                  }`}
                  style={{ transitionDelay: open ? `${80 + i * 50}ms` : "0ms" }}
                >
                  <Link
                    href={item.href}
                    onClick={() => close(false)}
                    aria-current={isActive(item.href) ? "page" : undefined}
                    className="flex items-center justify-between py-4 font-serif text-[2rem] leading-tight text-fg"
                  >
                    {item.label}
                    <ArrowRight className="size-5 text-fg-3" />
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div className="flex flex-col gap-3">
            <Link
              href={cta.firstLook.href}
              onClick={() => close(false)}
              className={buttonClass("primary", "w-full")}
            >
              {cta.firstLook.label}
              <ArrowRight className="nudge size-4" />
            </Link>
            <p className="mt-3 text-center text-[0.875rem] text-fg-3">
              Ou écrivez-nous :{" "}
              <a href={`mailto:${site.email}`} className="text-fg-2 underline underline-offset-4">
                {site.email}
              </a>
            </p>
          </div>
        </Container>
      </div>
    </>
  );
}
