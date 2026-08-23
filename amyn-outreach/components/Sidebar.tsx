"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_GROUPS: Array<{
  title: string;
  items: Array<{ href: string; label: string; hint: string }>;
}> = [
  {
    title: "Pilotage",
    items: [
      { href: "/", label: "Dashboard", hint: "Vue d'ensemble" },
      { href: "/agent", label: "Agent", hint: "Donner une instruction" },
      { href: "/operator", label: "Opérateur", hint: "Centre de contrôle" },
    ],
  },
  {
    title: "Prospection",
    items: [
      { href: "/prospects", label: "Prospects", hint: "Fiches et diagnostics" },
      { href: "/campaigns", label: "Campagnes", hint: "Emails et envois" },
      { href: "/replies", label: "Réponses", hint: "Centre de traitement" },
    ],
  },
  {
    title: "Après la signature",
    items: [
      { href: "/clients", label: "Clients", hint: "Projets et production" },
    ],
  },
  {
    title: "Système",
    items: [
      { href: "/activity", label: "Journal", hint: "Toutes les actions" },
      { href: "/settings", label: "Configuration", hint: "Sources, IA, envoi" },
    ],
  },
];

const NAV = NAV_GROUPS.flatMap((g) => g.items);

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

      <nav className="flex-1 overflow-y-auto px-3 py-6">
        {NAV_GROUPS.map((group, index) => (
          <div key={group.title} className={index === 0 ? "" : "pt-6"}>
            <div className="label-xs px-3 pb-2 text-zinc-600">{group.title}</div>
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const active =
                  item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
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
          </div>
        ))}
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
      <nav className="flex gap-1 overflow-x-auto px-3 pb-2">
        {NAV.map((item) => {
          const active =
            item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`shrink-0 whitespace-nowrap rounded-lg px-3 py-1.5 text-sm ${
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
