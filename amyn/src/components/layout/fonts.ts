import { Geist, Geist_Mono, Instrument_Serif } from "next/font/google";

/*
 * Polices sous licence libre (SIL Open Font License), téléchargées au
 * moment du build et servies par le site lui-même : aucune requête vers un
 * service tiers quand un visiteur ouvre une page.
 */
export const geist = Geist({
  variable: "--font-geist",
  subsets: ["latin"],
  display: "swap",
});

export const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export const instrument = Instrument_Serif({
  variable: "--font-instrument",
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  display: "swap",
});

export const fontVariables = `${geist.variable} ${geistMono.variable} ${instrument.variable}`;
