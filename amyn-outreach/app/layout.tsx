import type { Metadata } from "next";
import { Sidebar, MobileNav } from "@/components/Sidebar";
import { DryRunBanner } from "@/components/DryRunBanner";
import "./globals.css";

export const metadata: Metadata = {
  title: "AMYN Outreach — outil interne",
  description:
    "Agent de prospection AMYN. Recherche, diagnostic, rédaction et envoi contrôlé.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr">
      <body className="min-h-screen bg-ink-950 antialiased">
        <div className="flex min-h-screen">
          <Sidebar />
          <div className="flex min-w-0 flex-1 flex-col">
            <MobileNav />
            <DryRunBanner />
            <main className="flex-1 px-5 py-8 lg:px-10 lg:py-10">
              <div className="mx-auto max-w-[1400px]">{children}</div>
            </main>
            <footer className="border-t border-line px-5 py-5 lg:px-10">
              <p className="text-[11px] text-zinc-700">
                AMYN Outreach · outil interne AMYN · les données marquées DEMO sont
                fictives et ne peuvent déclencher aucun envoi
              </p>
            </footer>
          </div>
        </div>
      </body>
    </html>
  );
}
