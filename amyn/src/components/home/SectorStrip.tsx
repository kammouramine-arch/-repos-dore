import Image from "next/image";
import type { Locale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionary";
import { photo } from "@/lib/photos";

/**
 * Bande des métiers : on ne lit pas « restaurants, artisans, salons », on
 * les voit défiler. Défilement infini en CSS, en pause au survol, figé si
 * le visiteur a demandé moins d'animations (on peut alors la faire défiler
 * à la main).
 */
const images = [
  "restaurant-salle",
  "menuiserie-cuisine",
  "institut-salon",
  "barbier-salon",
  "cabinet-bureaux",
  "plomberie-reseau",
  "restaurant-plat",
  "artisan-plans",
];

export function SectorStrip({ locale }: { locale: Locale }) {
  const t = getDictionary(locale).sectors;
  const sectors = images.map((img, i) => ({ img, label: t.items[i] }));
  const loop = [...sectors, ...sectors];
  return (
    <section aria-label={t.aria} className="marquee-host relative overflow-x-auto py-10 [scrollbar-width:none] motion-safe:overflow-hidden sm:py-14">
      <div aria-hidden className="pointer-events-none absolute inset-y-0 left-0 z-10 w-16 bg-gradient-to-r from-ink to-transparent sm:w-40" />
      <div aria-hidden className="pointer-events-none absolute inset-y-0 right-0 z-10 w-16 bg-gradient-to-l from-ink to-transparent sm:w-40" />
      <ul className="marquee flex w-max gap-4 sm:gap-5">
        {loop.map((s, i) => (
          <li
            key={`${s.label}-${i}`}
            aria-hidden={i >= sectors.length}
            className="group relative h-44 w-64 shrink-0 overflow-hidden rounded-[var(--radius-md)] border border-[rgb(242_238_230/0.1)] sm:h-56 sm:w-80"
          >
            <Image
              src={photo(s.img)}
              alt=""
              fill
              sizes="320px"
              quality={70}
              className="object-cover transition-transform duration-[1.2s] ease-[var(--ease-out)] group-hover:scale-110"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent" />
            <span className="absolute bottom-4 left-5 text-[1.35rem] font-semibold tracking-[-0.03em] text-bone">
              {s.label}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
