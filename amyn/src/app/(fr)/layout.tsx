import { SiteShell, shellMetadata, shellViewport } from "@/components/layout/SiteShell";

/* Racine française : toutes les adresses sans préfixe. */
export const metadata = shellMetadata("fr");
export const viewport = shellViewport;

export default function FrenchLayout({ children }: { children: React.ReactNode }) {
  return <SiteShell locale="fr">{children}</SiteShell>;
}
