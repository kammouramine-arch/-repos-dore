import type { Metadata } from "next";
import { Logo } from "@/components/layout/Logo";
import { fontVariables } from "@/components/layout/fonts";
import { Ambient } from "@/components/ui/Ambient";
import { buttonClass } from "@/components/ui/Button";
import { href } from "@/lib/i18n/routes";
import "./globals.css";

export const metadata: Metadata = {
  title: "Page introuvable · Page not found · AMYN",
  description: "Cette page n'existe pas sur amyn.agency. This page doesn't exist on amyn.agency.",
  robots: { index: false, follow: true },
};

/**
 * Adresse inconnue. Le site a deux racines (une par langue) ; une adresse
 * qui ne correspond à rien ne dit pas quelle langue attendait le visiteur :
 * la page parle donc les deux, sans rien deviner.
 */
export default function GlobalNotFound() {
  return (
    <html lang="fr" className={fontVariables}>
      <body>
        <Ambient />
        <main className="flex min-h-svh flex-col">
          <div className="mx-auto flex w-full max-w-[88rem] items-center px-5 pt-6 sm:px-8 lg:px-12">
            <a href={href("home", "fr")} aria-label="AMYN — accueil" className="-m-2 p-2 text-bone">
              <Logo />
            </a>
          </div>
          <div className="mx-auto grid w-full max-w-[88rem] flex-1 content-center gap-16 px-5 py-20 sm:px-8 lg:grid-cols-2 lg:gap-10 lg:px-12">
            <section>
              <p className="label text-fg-3">Erreur 404</p>
              <h1 className="display-lg mt-6">
                Cette page <em className="accent text-fg-2">n’existe pas.</em>
              </h1>
              <p className="lead mt-6 max-w-md text-fg-2">
                Le lien est peut-être ancien, ou l’adresse contient une faute de frappe.
              </p>
              <a href={href("home", "fr")} className={buttonClass("primary", "mt-8")}>
                Retour à l’accueil
              </a>
            </section>
            <section lang="en" className="lg:border-l lg:border-line lg:pl-10">
              <p className="label text-fg-3">Error 404</p>
              <p className="display-lg mt-6" role="heading" aria-level={2}>
                This page <em className="accent text-fg-2">doesn’t exist.</em>
              </p>
              <p className="lead mt-6 max-w-md text-fg-2">
                The link may be out of date, or the address may contain a typo.
              </p>
              <a href={href("home", "en")} className={buttonClass("secondary", "mt-8")}>
                Back to home
              </a>
            </section>
          </div>
        </main>
      </body>
    </html>
  );
}
