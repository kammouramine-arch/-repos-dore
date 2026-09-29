import type { Metadata, Viewport } from "next";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { Ambient } from "@/components/ui/Ambient";
import { Interactions } from "@/components/ui/Interactions";
import { JsonLd } from "@/components/ui/JsonLd";
import { RevealObserver } from "@/components/ui/RevealObserver";
import { OG_LOCALE, type Locale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionary";
import { href } from "@/lib/i18n/routes";
import { organizationSchema, shareImage } from "@/lib/seo";
import { site } from "@/lib/site";
import { fontVariables } from "./fonts";
import "@/app/globals.css";

/**
 * Document commun aux deux langues. Chaque langue a sa propre racine
 * (`app/(fr)/layout.tsx`, `app/en/layout.tsx`) : l'attribut `lang` est donc
 * juste dès le HTML servi, et toutes les pages restent statiques.
 */
export function SiteShell({ locale, children }: { locale: Locale; children: React.ReactNode }) {
  const t = getDictionary(locale);
  return (
    <html lang={locale} className={fontVariables}>
      <body>
        <Ambient />
        <a
          href="#contenu"
          className="fixed left-4 top-3 z-[60] -translate-y-24 rounded-full bg-bone px-5 py-3 text-[0.9375rem] font-medium text-ink transition-transform focus:translate-y-0"
        >
          {t.common.skip}
        </a>
        <SiteHeader locale={locale} />
        <main id="contenu" tabIndex={-1} className="outline-none">
          {children}
        </main>
        <SiteFooter locale={locale} />
        <RevealObserver />
        <Interactions />
        <JsonLd data={organizationSchema(locale)} />
      </body>
    </html>
  );
}

/** Métadonnées par défaut d'une langue (chaque page précise les siennes). */
export function shellMetadata(locale: Locale): Metadata {
  const t = getDictionary(locale);
  const home = href("home", locale);
  return {
    metadataBase: new URL(site.url),
    title: { default: t.meta.title, template: "%s · AMYN" },
    description: t.meta.description,
    applicationName: site.name,
    alternates: {
      canonical: home,
      languages: { fr: href("home", "fr"), en: href("home", "en"), "x-default": href("home", "fr") },
    },
    openGraph: {
      type: "website",
      locale: OG_LOCALE[locale],
      alternateLocale: [OG_LOCALE[locale === "fr" ? "en" : "fr"]],
      siteName: site.name,
      url: home,
      title: t.meta.title,
      description: t.meta.shareDescription,
      images: [shareImage(locale)],
    },
    twitter: {
      card: "summary_large_image",
      title: t.meta.title,
      description: t.meta.shareDescription,
      images: [shareImage(locale).url],
    },
    formatDetection: { telephone: false, email: false, address: false },
  };
}

export const shellViewport: Viewport = {
  themeColor: "#0a0a0a",
  colorScheme: "dark",
};
