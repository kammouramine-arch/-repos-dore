import type { Metadata } from "next";
import type { Service } from "./services";
import { site } from "./site";

/* Image de partage commune (src/app/opengraph-image.png). Une page qui
   définit son propre `openGraph` remplace celui du layout : l'image doit
   donc être redonnée ici, sinon les pages intérieures n'en ont aucune. */
const SHARE_IMAGE = {
  url: "/opengraph-image.png",
  width: 1200,
  height: 630,
  alt: "AMYN — sites web, applications et outils digitaux sur mesure",
};

/**
 * Métadonnées d'une page : titre, description, URL canonique, Open Graph
 * et carte sociale — toujours cohérents entre eux.
 */
export function pageMetadata({
  title,
  description,
  path,
  noindex = false,
}: {
  title: string;
  description: string;
  path: string;
  noindex?: boolean;
}): Metadata {
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      type: "website",
      locale: site.locale,
      siteName: site.name,
      url: path,
      title: `${title} · ${site.name}`,
      description,
      images: [SHARE_IMAGE],
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} · ${site.name}`,
      description,
      images: [SHARE_IMAGE.url],
    },
    ...(noindex ? { robots: { index: false, follow: true } } : {}),
  };
}

/* ---------------------------------------------------------------------------
   Données structurées (schema.org)

   Uniquement des faits vérifiables : pas d'adresse tant qu'elle n'est pas
   renseignée, pas d'avis, pas de note, pas de prix.
   --------------------------------------------------------------------------- */

const ORG_ID = `${site.url}/#organisation`;

export function organizationSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "ProfessionalService",
    "@id": ORG_ID,
    name: site.legalBrand,
    alternateName: site.name,
    url: site.url,
    email: site.email,
    description: site.tagline,
    areaServed: { "@type": "Country", name: "France" },
    knowsLanguage: "fr",
  };
}

export function serviceSchema(service: Service) {
  return {
    "@context": "https://schema.org",
    "@type": "Service",
    name: service.name,
    description: service.seo.description,
    url: `${site.url}/services/${service.slug}`,
    provider: { "@id": ORG_ID },
    areaServed: { "@type": "Country", name: "France" },
  };
}

export function breadcrumbSchema(items: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: `${site.url}${item.path}`,
    })),
  };
}
