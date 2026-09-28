import type { MetadataRoute } from "next";
import { legalComplete, missingTerms } from "@/lib/legal";
import { projects, projectPath } from "@/lib/projects";
import { services, servicePath } from "@/lib/services";
import { site } from "@/lib/site";

/**
 * Plan du site. Les pages légales n'y entrent qu'une fois complétées :
 * tant qu'elles portent des emplacements vides, elles sont en `noindex`.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const entry = (
    path: string,
    priority: number,
    changeFrequency: "monthly" | "yearly" = "monthly",
  ) => ({ url: `${site.url}${path}`, priority, changeFrequency });

  const legal = legalComplete()
    ? [
        "/mentions-legales",
        "/confidentialite",
        ...(missingTerms().length === 0 ? ["/conditions-services"] : []),
      ].map((p) => entry(p, 0.2, "yearly"))
    : [];

  return [
    entry("/", 1),
    entry("/services", 0.9),
    ...services.map((s) => entry(servicePath(s.slug), 0.8)),
    entry("/premier-apercu", 0.9),
    entry("/realisations", 0.7),
    ...projects.map((p) => entry(projectPath(p.slug), 0.5)),
    entry("/methode", 0.6),
    entry("/a-propos", 0.6),
    entry("/contact", 0.7),
    entry("/cookies", 0.2, "yearly"),
    ...legal,
  ];
}
