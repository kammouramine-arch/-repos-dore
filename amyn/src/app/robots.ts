import type { MetadataRoute } from "next";
import { site } from "@/lib/content";

/**
 * Les pages légales portent déjà leur propre `noindex` tant qu'elles ne sont
 * pas complétées ; inutile de les bloquer une seconde fois ici.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/" },
    sitemap: `https://${site.domain}/sitemap.xml`,
    host: `https://${site.domain}`,
  };
}
