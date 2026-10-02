import type { Metadata } from "next";
import { OG_LOCALE, type Locale } from "./i18n/config.ts";
import type { Alternates } from "./i18n/routes.ts";
import { href, servicePath } from "./i18n/routes.ts";
import { PROOFSPRINT_PRICE_EUR, getProofSprint } from "./proofsprint.ts";
import type { Service } from "./services.ts";
import { legal } from "./legal.ts";
import { site } from "./site.ts";

/* Image de partage de chaque langue (`public/og/`), à une adresse stable.
   Une page qui définit son propre `openGraph` remplace celui du layout :
   l'image doit donc être redonnée. */
export function shareImage(locale: Locale) {
  return {
    url: locale === "en" ? "/og/amyn-en.png" : "/og/amyn-fr.png",
    width: 1200,
    height: 630,
    alt:
      locale === "en"
        ? "AMYN — bespoke websites, apps and digital tools"
        : "AMYN — sites web, applications et outils digitaux sur mesure",
  };
}

/**
 * Métadonnées d'une page : titre, description, URL canonique, versions
 * dans l'autre langue (hreflang), Open Graph et carte sociale — toujours
 * cohérents entre eux.
 *
 * Chaque langue est canonique pour elle-même ; `x-default` désigne la
 * version française, marché principal.
 */
export function pageMetadata({
  title,
  description,
  locale,
  alternates,
  noindex = false,
}: {
  title: string;
  description: string;
  locale: Locale;
  alternates: Alternates;
  noindex?: boolean;
}): Metadata {
  const path = alternates[locale];
  const image = shareImage(locale);
  return {
    title,
    description,
    alternates: {
      canonical: path,
      languages: { fr: alternates.fr, en: alternates.en, "x-default": alternates.fr },
    },
    openGraph: {
      type: "website",
      locale: OG_LOCALE[locale],
      alternateLocale: [OG_LOCALE[locale === "fr" ? "en" : "fr"]],
      siteName: site.name,
      url: path,
      title: `${title} · ${site.name}`,
      description,
      images: [image],
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} · ${site.name}`,
      description,
      images: [image.url],
    },
    ...(noindex ? { robots: { index: false, follow: true } } : {}),
  };
}

/* ---------------------------------------------------------------------------
   Données structurées (schema.org)

   Uniquement des faits vérifiables : identité et adresse officielles de
   l'entreprise individuelle (legal.ts) ; pas d'avis, pas de note.
   --------------------------------------------------------------------------- */

const ORG_ID = `${site.url}/#organisation`;

const TAGLINE: Record<Locale, string> = {
  fr: site.tagline,
  en: "Websites, apps and digital tools designed around the way your business actually works.",
};

export function organizationSchema(locale: Locale = "fr") {
  return {
    "@context": "https://schema.org",
    "@type": "ProfessionalService",
    "@id": ORG_ID,
    name: site.legalBrand,
    legalName: `${legal.publisherName} (EI)`,
    url: site.url,
    email: site.email,
    description: TAGLINE[locale],
    areaServed: { "@type": "Country", name: "France" },
    knowsLanguage: ["fr", "en"],
    address: {
      "@type": "PostalAddress",
      streetAddress: "18 rue Blériot",
      postalCode: "59139",
      addressLocality: "Wattignies",
      addressCountry: "FR",
    },
    ...(legal.siret
      ? { identifier: { "@type": "PropertyValue", propertyID: "SIRET", value: legal.siret.replace(/\s/g, "") } }
      : {}),
  };
}

export function serviceSchema(service: Service, locale: Locale = "fr") {
  return {
    "@context": "https://schema.org",
    "@type": "Service",
    name: service.name,
    description: service.seo.description,
    url: `${site.url}${servicePath(service.slug, locale)}`,
    inLanguage: locale,
    provider: { "@id": ORG_ID },
    areaServed: { "@type": "Country", name: "France" },
  };
}

/**
 * ProofSprint : un service à prix public. Uniquement des faits publiés sur
 * la page (nom, description, prix ; franchise en base, pas de TVA) — ni
 * avis, ni note.
 */
export function proofSprintSchema(locale: Locale = "fr") {
  const t = getProofSprint(locale);
  return {
    "@context": "https://schema.org",
    "@type": "Service",
    name: "ProofSprint",
    description: t.meta.description,
    url: `${site.url}${href("proofsprint", locale)}`,
    inLanguage: locale,
    provider: { "@id": ORG_ID },
    audience: { "@type": "BusinessAudience" },
    offers: {
      "@type": "Offer",
      price: PROOFSPRINT_PRICE_EUR,
      priceCurrency: "EUR",
    },
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
