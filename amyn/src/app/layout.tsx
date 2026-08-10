import type { Metadata, Viewport } from "next";
import { Inter, Manrope } from "next/font/google";
import "./globals.css";

/* Manrope : les titres. Inter : tout le reste. Deux polices, pas plus. */
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

export const metadata: Metadata = {
  metadataBase: new URL("https://amyn.fr"),
  title: {
    default: "AMYN — Agence Web & Growth",
    template: "%s · AMYN",
  },
  description:
    "Des sites qui attirent. Des systèmes qui convertissent. AMYN crée des sites web modernes et des systèmes digitaux pour les entreprises locales en France.",
  keywords: [
    "agence web",
    "création site internet",
    "SEO local",
    "Google Business",
    "site vitrine",
    "réservation en ligne",
  ],
  openGraph: {
    type: "website",
    locale: "fr_FR",
    siteName: "AMYN",
    title: "AMYN — Agence Web & Growth",
    description:
      "Des sites qui attirent. Des systèmes qui convertissent.",
  },
};

export const viewport: Viewport = {
  themeColor: "#08080a",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="fr"
      className={`${manrope.variable} ${inter.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-ink text-bone">
        {children}
      </body>
    </html>
  );
}
