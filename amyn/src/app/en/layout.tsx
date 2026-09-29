import { SiteShell, shellMetadata, shellViewport } from "@/components/layout/SiteShell";

/* English root: every address under /en. */
export const metadata = shellMetadata("en");
export const viewport = shellViewport;

export default function EnglishLayout({ children }: { children: React.ReactNode }) {
  return <SiteShell locale="en">{children}</SiteShell>;
}
