import type { MetadataRoute } from "next";
import {
  SERVICE_SLUGS,
  projectAlternates,
  routeAlternates,
  serviceAlternates,
  type Alternates,
  type RouteKey,
} from "@/lib/i18n/routes";
import { legalComplete } from "@/lib/legal";
import { projects } from "@/lib/projects";
import { site } from "@/lib/site";

/**
 * Plan du site, dans les deux langues : chaque page y figure une fois par
 * langue, avec ses versions alternatives (hreflang) déclarées.
 *
 * Les pages légales n'y entrent qu'une fois complétées : tant qu'elles
 * portent des emplacements vides, elles sont en `noindex`.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const url = (path: string) => `${site.url}${path}`;

  const entries = (
    alternates: Alternates,
    priority: number,
    changeFrequency: "monthly" | "yearly" = "monthly",
  ): MetadataRoute.Sitemap =>
    (["fr", "en"] as const).map((locale) => ({
      url: url(alternates[locale]),
      priority: locale === "fr" ? priority : Math.round(priority * 0.9 * 10) / 10,
      changeFrequency,
      alternates: {
        languages: { fr: url(alternates.fr), en: url(alternates.en), "x-default": url(alternates.fr) },
      },
    }));

  const route = (key: RouteKey, priority: number, freq?: "monthly" | "yearly") =>
    entries(routeAlternates(key), priority, freq);

  /* Confidentialité et conditions sont complètes : indexées. Les mentions
     légales restent hors index tant qu'une information obligatoire
     manque (téléphone de l'éditeur) (voir legal.ts). */
  const legal: MetadataRoute.Sitemap = [
    ...route("privacy", 0.2, "yearly"),
    ...route("terms", 0.2, "yearly"),
    ...(legalComplete() ? route("legalNotice", 0.2, "yearly") : []),
  ];

  return [
    ...route("home", 1),
    ...route("services", 0.9),
    ...Object.keys(SERVICE_SLUGS).flatMap((id) => entries(serviceAlternates(id), 0.8)),
    ...route("firstLook", 0.9),
    ...route("proofsprint", 0.8),
    ...route("proofsprintDemo", 0.6),
    ...route("work", 0.7),
    ...projects.flatMap((p) => entries(projectAlternates(p.slug), 0.5)),
    ...route("method", 0.6),
    ...route("about", 0.6),
    ...route("cookies", 0.2, "yearly"),
    ...legal,
  ];
}
