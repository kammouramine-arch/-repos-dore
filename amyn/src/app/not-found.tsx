import type { Metadata } from "next";
import Link from "next/link";
import { ButtonLink } from "@/components/ui/Button";
import { Container } from "@/components/ui/Layout";
import { cta, mainNav } from "@/lib/site";

export const metadata: Metadata = {
  title: "Page introuvable",
  robots: { index: false, follow: true },
};

export default function NotFound() {
  return (
    <section className="tone-ink flex min-h-[85svh] items-center pb-20 pt-[calc(var(--header-h)+3rem)]">
      <Container>
        <p className="label rise text-fg-3">Erreur 404</p>
        <h1 className="display-xl rise mt-8 max-w-4xl" style={{ "--delay": 80 } as React.CSSProperties}>
          Cette page <em className="accent text-fg-2">n&apos;existe pas.</em>
        </h1>
        <p className="lead rise mt-8 max-w-xl text-fg-2" style={{ "--delay": 160 } as React.CSSProperties}>
          Le lien est peut-être ancien, ou l&apos;adresse contient une faute de frappe.
          Voici où reprendre.
        </p>
        <div className="rise mt-10 flex flex-col gap-3 sm:flex-row sm:items-center" style={{ "--delay": 240 } as React.CSSProperties}>
          <ButtonLink href="/">Retour à l&apos;accueil</ButtonLink>
          <ButtonLink href={cta.firstLook.href} variant="secondary">
            {cta.firstLook.label}
          </ButtonLink>
        </div>
        <ul className="mt-14 flex flex-wrap gap-x-8 gap-y-3 text-fg-2">
          {mainNav.map((item) => (
            <li key={item.href}>
              <Link href={item.href} className="link-line hover:text-fg">
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}
