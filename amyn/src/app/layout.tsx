import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Instrument_Serif } from "next/font/google";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { JsonLd } from "@/components/ui/JsonLd";
import { RevealObserver } from "@/components/ui/RevealObserver";
import { organizationSchema } from "@/lib/seo";
import { site } from "@/lib/site";
import "./globals.css";

/*
 * Polices sous licence libre (SIL Open Font License), téléchargées au
 * moment du build et servies par le site lui-même : aucune requête vers un
 * service tiers quand un visiteur ouvre une page.
 */
const geist = Geist({
  variable: "--font-geist",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

const instrument = Instrument_Serif({
  variable: "--font-instrument",
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: {
    default: "AMYN — Sites web, applications et outils digitaux sur mesure",
    template: "%s · AMYN",
  },
  description:
    "AMYN conçoit des sites web, des applications et des outils digitaux — réservation, suivi des demandes, accueil client — autour de la façon dont votre entreprise fonctionne réellement.",
  applicationName: site.name,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: site.locale,
    siteName: site.name,
    url: "/",
    title: "AMYN — Sites web, applications et outils digitaux sur mesure",
    description:
      "Montrez-nous votre entreprise. Nous vous montrerons d'abord ce que nous changerions.",
  },
  twitter: {
    card: "summary_large_image",
    title: "AMYN — Sites web, applications et outils digitaux sur mesure",
    description:
      "Montrez-nous votre entreprise. Nous vous montrerons d'abord ce que nous changerions.",
  },
  formatDetection: { telephone: false, email: false, address: false },
};

export const viewport: Viewport = {
  themeColor: "#0a0a0a",
  colorScheme: "dark",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="fr"
      className={`${geist.variable} ${geistMono.variable} ${instrument.variable}`}
    >
      <body>
        <a
          href="#contenu"
          className="fixed left-4 top-3 z-[60] -translate-y-24 rounded-full bg-bone px-5 py-3 text-[0.9375rem] font-medium text-ink transition-transform focus:translate-y-0"
        >
          Aller au contenu
        </a>
        <SiteHeader />
        <main id="contenu" tabIndex={-1} className="outline-none">
          {children}
        </main>
        <SiteFooter />
        <RevealObserver />
        <JsonLd data={organizationSchema()} />
      </body>
    </html>
  );
}
