import type { Metadata, Viewport } from "next";
import { CursorGlow } from "@/components/ui/CursorGlow";
import { SmoothScroll } from "@/components/layout/SmoothScroll";
import { Frame } from "@/components/ui/Frame";
import { Grain } from "@/components/ui/Grain";
import { Inter, Instrument_Serif, Manrope } from "next/font/google";
import { site } from "@/lib/content";
import "./globals.css";

/* Manrope : les titres. Inter : le texte courant. */
const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
  display: "swap",
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

/* Instrument Serif : uniquement les mots d'accent en italique. Rien d'autre. */
const instrument = Instrument_Serif({
  variable: "--font-instrument",
  subsets: ["latin"],
  weight: "400",
  style: "italic",
  display: "swap",
});

export const metadata: Metadata = {
  /* Base de toutes les URL absolues (Open Graph, canonique, sitemap). */
  metadataBase: new URL(`https://${site.domain}`),
  alternates: { canonical: "/" },
  title: {
    default: "AMYN — Création de sites web sur mesure",
    template: "%s · AMYN",
  },
  description:
    "AMYN est un studio web : nous créons des sites professionnels, modernes et sur mesure, conçus autour de votre activité.",
  applicationName: "AMYN",
  authors: [{ name: "AMYN" }],
  creator: "AMYN",
  publisher: "AMYN",
  keywords: [
    "création de site web",
    "studio web",
    "site internet sur mesure",
    "site vitrine professionnel",
    "refonte de site",
    "site web entreprise",
  ],
  openGraph: {
    type: "website",
    locale: "fr_FR",
    url: "/",
    siteName: "AMYN",
    title: "AMYN — Création de sites web sur mesure",
    description:
      "Des sites web professionnels, conçus sur mesure pour votre entreprise.",
  },
  twitter: {
    card: "summary_large_image",
    title: "AMYN — Création de sites web sur mesure",
    description:
      "Des sites web professionnels, conçus sur mesure pour votre entreprise.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large" },
  },
};

export const viewport: Viewport = {
  themeColor: "#08080a",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="fr"
      className={`${manrope.variable} ${inter.variable} ${instrument.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-ink text-bone">
        <SmoothScroll />
        <Frame />
        <Grain />
        <CursorGlow />
        {children}
      </body>
    </html>
  );
}
