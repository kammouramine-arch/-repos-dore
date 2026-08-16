"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/", label: "Dashboard", hint: "Vue d'ensemble" },
  { href: "/prospects", label: "Prospects", hint: "Toutes les fiches" },
  { href: "/settings", label: "Système", hint: "Config & feuille de route" },
];

const LOCKED = [
  { label: "Campagnes", lot: "Lot 6" },
  { label: "Recherche", lot: "Lot 3" },
  { label: "Rédaction", lot: "Lot 4" },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden lg:flex w-60 shrink-0 flex-col border-r border-line bg-ink-900">
      <div className="px-6 py-7">
        <Link href="/" className="block">
          <div className="text-lg font-light tracking-[0.22em] text-zinc-50">AMYN</div>
          <div className="mt-1 label-xs text-gold-500">Outreach</div>
        </Link>
      </div>

      <div className="gold-rule mx-6 h-px opacity-40" />

      <nav className="flex-1 px-3 py-6">
        <div className="label-xs px-3 pb-3 text-zinc-600">Navigation</div>
        <ul className="space-y-0.5">
          {NAV.map((item) => {
            const active =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`group flex flex-col rounded-lg px-3 py-2.5 transition-colors ${
                    active
                      ? "bg-ink-800 text-zinc-50"
                      : "text-zinc-400 hover:bg-ink-850 hover:text-zinc-200"
                  }`}
                >
                  <span className="flex items-center gap-2 text-sm">
                    <span
                      className={`h-3.5 w-px transition-colors ${
                        active ? "bg-gold-400" : "bg-transparent group-hover:bg-zinc-700"
                      }`}
                    />
                    {item.label}
                  </span>
                  <span className="pl-3.5 text-[11px] text-zinc-600">{item.hint}</span>
                </Link>
              </li>
            );
          })}
        </ul>

        <div className="label-xs px-3 pt-8 pb-3 text-zinc-600">À venir</div>
        <ul className="space-y-0.5">
          {LOCKED.map((item) => (
            <li
              key={item.label}
              className="flex items-center justify-between rounded-lg px-3 py-2 text-sm text-zinc-700"
            >
              <span>{item.label}</span>
              <span className="rounded bg-ink-800 px-1.5 py-0.5 text-[10px] text-zinc-600">
                {item.lot}
              </span>
            </li>
          ))}
        </ul>
      </nav>

      <div className="border-t border-line px-6 py-4">
        <div className="text-[11px] leading-relaxed text-zinc-600">
          Outil interne AMYN
          <br />
          Web &amp; Growth · Lille
        </div>
      </div>
    </aside>
  );
}

/** Barre de navigation compacte pour mobile / tablette. */
export function MobileNav() {
  const pathname = usePathname();
  return (
    <div className="lg:hidden border-b border-line bg-ink-900">
      <div className="flex items-center justify-between px-5 py-4">
        <Link href="/" className="text-base font-light tracking-[0.22em] text-zinc-50">
          AMYN <span className="text-gold-500">Outreach</span>
        </Link>
      </div>
      <nav className="flex gap-1 px-3 pb-2">
        {NAV.map((item) => {
          const active =
            item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`rounded-lg px-3 py-1.5 text-sm ${
                active ? "bg-ink-800 text-zinc-50" : "text-zinc-400"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
