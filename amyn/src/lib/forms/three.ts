import { cleanLine, cleanText, EMAIL } from "./shared.ts";
export type ThreeValues = { name: string; company: string; email: string; description: string; privacy: boolean; lang: "fr" | "en" };
export function sanitizeThree(raw: Record<string, unknown>): ThreeValues {
  return { name: cleanLine(raw.name,100), company: cleanLine(raw.company,160), email: cleanLine(raw.email,254).toLowerCase(), description: cleanText(raw.description,1500), privacy: raw.privacy === true, lang: raw.lang === "en" ? "en" : "fr" };
}
export function validateThree(v: ThreeValues): Record<string,string> {
  const e: Record<string,string> = {};
  if(v.name.length<2)e.name="Name / nom";
  if(v.company.length<2)e.company="Company / entreprise";
  if(!EMAIL.test(v.email))e.email="E-mail invalide / invalid email";
  if(v.description.length<15)e.description="15 caractères minimum / 15 characters minimum";
  if(!v.privacy)e.privacy="Confidentialité / privacy";
  return e;
}
