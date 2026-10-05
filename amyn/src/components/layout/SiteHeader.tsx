"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { buttonClass } from "@/components/ui/Button";
import { ArrowRight } from "@/components/ui/Icons";
import { Container } from "@/components/ui/Layout";
import type { Locale } from "@/lib/i18n/config";
import { ctas, mainNav } from "@/lib/i18n/nav";
import { href } from "@/lib/i18n/routes";
import { getUi } from "@/lib/i18n/ui";
import { site } from "@/lib/site";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { AmynMark, Logo } from "./Logo";

/**
 * En-tête.
 *
 * Transparent en haut de page ; dès qu'on défile, il devient une barre de
 * verre (flou, filet, ombre douce). Une seule action : le Revenue Audit.
 *
 * Sur téléphone, le menu s'ouvre en cercle depuis le bouton, comme une
 * application : grands liens numérotés, arrivée en cascade, action en bas
 * à portée du pouce. Il se referme avec Échap, au changement de page, et
 * garde le focus clavier à l'intérieur tant qu'il est ouvert.
 *
 * Le sélecteur de langue reste visible à toutes les tailles, à côté du
 * bouton de menu sur téléphone.
 */
export function SiteHeader({ locale }: { locale: Locale }) {
  const pathname = usePathname();
  const t = getUi(locale).header;
  const nav = mainNav(locale);
  const cta = ctas(locale);
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

    /* Le panneau s'ouvre pendant sa transition : on attend avant de placer
       le focus sur le premier lien. */
    const focusTimer = window.setTimeout(
      () => panel.current?.querySelector<HTMLElement>("a")?.focus(),
      120,
    );

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") return close();
      if (event.key !== "Tab" || !panel.current) return;
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

  const isActive = (target: string) => pathname === target || pathname.startsWith(`${target}/`);
  const solid = scrolled && !open;

  return (
    <>
      <header
        className={`fixed inset-x-0 top-0 z-50 transition-[background-color,border-color,box-shadow,backdrop-filter] duration-500 ${
          solid
            ? "border-b border-[rgb(242_238_230/0.08)] bg-[rgb(10_10_10/0.62)] shadow-[0_10px_40px_-20px_rgb(0_0_0/0.9)] backdrop-blur-2xl backdrop-saturate-150"
            : "border-b border-transparent bg-transparent"
        }`}
      >
        <Container className="flex h-[var(--header-h)] items-center justify-between gap-6">
          <Link href={href("home", locale)} aria-label={t.homeAria} className="-m-2 p-2 text-bone">
            <Logo />
          </Link>

          <nav aria-label={t.mainNav} className="hidden lg:block">
            <ul className="flex items-center gap-0.5 rounded-full border border-[rgb(242_238_230/0.08)] bg-[rgb(242_238_230/0.03)] p-1 backdrop-blur-md">
              {nav.map((item) => {
                const active = isActive(item.href);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      aria-current={active ? "page" : undefined}
                      className={`relative flex items-center gap-2 whitespace-nowrap rounded-full px-2.5 py-2 text-[0.875rem] font-medium transition-[background-color,color] duration-300 active:scale-[0.97] xl:px-4 ${
                        active
                          ? `bg-[rgb(242_238_230/0.1)] ${item.accent ? "text-gold-2" : "text-bone"}`
                          : item.accent
                            ? "text-gold-2 hover:bg-[rgb(198_167_106/0.1)] hover:text-bone"
                            : "text-bone-2 hover:bg-[rgb(242_238_230/0.06)] hover:text-bone"
                      }`}
                    >
                      {/* ProofSprint : un point de laiton, rien de plus. */}
                      {item.accent && <span aria-hidden className="size-1.5 rounded-full bg-gold" />}
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          <div className="flex items-center gap-2">
            <LanguageSwitcher locale={locale} />
            <span className="hidden md:block">
              <Link
                href={cta.revenueAudit.href}
                data-magnetic=""
                data-track="revenue_audit_cta_clicked"
                data-track-place="header"
                className={buttonClass("primary", "", "sm")}
              >
                {cta.revenueAudit.short}
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
              aria-label={open ? t.closeMenu : t.openMenu}
              className="relative -mr-1 flex size-11 items-center justify-center rounded-full border border-[rgb(242_238_230/0.14)] bg-[rgb(242_238_230/0.05)] text-bone backdrop-blur-md transition-transform duration-150 active:scale-90 lg:hidden"
            >
              <span aria-hidden className="relative block h-3 w-[18px]">
                <span
                  className={`absolute left-0 top-0.5 h-[1.5px] w-full rounded bg-current transition-transform duration-500 ease-[var(--ease-spring)] ${
                    open ? "translate-y-[4px] rotate-45" : ""
                  }`}
                />
                <span
                  className={`absolute bottom-0.5 left-0 h-[1.5px] w-full rounded bg-current transition-transform duration-500 ease-[var(--ease-spring)] ${
                    open ? "-translate-y-[4px] -rotate-45" : ""
                  }`}
                />
              </span>
            </button>
          </div>
        </Container>
      </header>

      {/* Menu mobile : il s'ouvre en cercle depuis le bouton. */}
      <div
        id="menu-mobile"
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-label={t.menu}
        inert={!open}
        style={{
          clipPath: open
            ? "circle(150% at calc(100% - 2.4rem) 2.1rem)"
            : "circle(0% at calc(100% - 2.4rem) 2.1rem)",
        }}
        className={`fixed inset-0 z-40 flex flex-col overflow-y-auto bg-[#0b0b0b] pt-[var(--header-h)] transition-[clip-path,visibility] duration-[650ms] ease-[var(--ease-in-out)] motion-reduce:transition-none lg:hidden ${
          open ? "visible" : "invisible"
        }`}
      >
        <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -right-24 -top-24 size-[28rem] rounded-full bg-[radial-gradient(closest-side,rgb(198_167_106/0.18),transparent_70%)]" />
          <AmynMark className="absolute -bottom-10 -left-10 size-72 text-[rgb(242_238_230/0.035)]" accent="rgb(198 167 106 / 0.12)" />
        </div>

        <Container className="relative flex flex-1 flex-col justify-between gap-10 pb-8 pt-6">
          <nav aria-label={t.menuNav}>
            <ul>
              {nav.map((item, i) => (
                <li
                  key={item.href}
                  className={`transition-[opacity,transform] duration-700 ease-[var(--ease-out)] ${
                    open ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0"
                  }`}
                  style={{ transitionDelay: open ? `${120 + i * 55}ms` : "0ms" }}
                >
                  <Link
                    href={item.href}
                    onClick={() => close(false)}
                    aria-current={isActive(item.href) ? "page" : undefined}
                    className="group flex items-baseline gap-4 border-b border-[rgb(242_238_230/0.08)] py-4 active:opacity-70"
                  >
                    <span className="label w-7 text-gold">0{i + 1}</span>
                    <span
                      className={`display-md flex-1 group-aria-[current=page]:text-gold-2 ${
                        "accent" in item && item.accent ? "text-gold-2" : "text-bone"
                      }`}
                    >
                      {item.label}
                    </span>
                    <ArrowRight className="size-5 translate-y-0.5 text-bone-3" />
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div
            className={`flex flex-col gap-4 transition-[opacity,transform] duration-700 ease-[var(--ease-out)] ${
              open ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0"
            }`}
            style={{ transitionDelay: open ? "420ms" : "0ms" }}
          >
            <Link
              href={cta.revenueAudit.href}
              data-track="revenue_audit_cta_clicked"
              data-track-place="menu"
              onClick={() => close(false)}
              className={buttonClass("primary", "w-full !min-h-14 text-[1rem]")}
            >
              {cta.revenueAudit.label}
              <ArrowRight className="nudge size-4" />
            </Link>
            <a href={`mailto:${site.email}`} className="text-center text-[0.9375rem] text-bone-2">
              {site.email}
            </a>
          </div>
        </Container>
      </div>
    </>
  );
}
