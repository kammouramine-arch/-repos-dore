import type { MetadataRoute } from "next";
import { site } from "@/lib/content";

/** Le site tient en une page ; les pages légales n'ont pas à être indexées. */
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: `https://${site.domain}`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 1,
    },
  ];
}
