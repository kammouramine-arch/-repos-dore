import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { Wordmark } from "@/components/ui/Wordmark";
import { contact, footer, site } from "@/lib/content";

/**
 * Pied de page.
 *
 * Aucun lien n'est inventé : les réseaux et l'adresse e-mail proviennent de
 * `contact` dans src/lib/content.ts, et un champ laissé vide n'affiche
 * simplement rien. Mieux vaut un pied de page court qu'un lien mort.
 */
export function Footer() {
  const links = [
    contact.email && { label: "Email", href: `mailto:${contact.email}` },
    contact.instagram && { label: "Instagram", href: contact.instagram },
    contact.linkedin && { label: "LinkedIn", href: contact.linkedin },
    contact.whatsapp && { label: "WhatsApp", href: contact.whatsapp },
  ].filter(Boolean) as { label: string; href: string }[];

  const external = (href: string) => href.startsWith("http");

  return (
    <footer className="relative border-t border-bone/10 pb-14 pt-16 sm:pb-16 sm:pt-20">
      <Container>
        <div className="flex flex-col gap-12 lg:flex-row lg:items-start lg:justify-between lg:gap-16">
          <div>
            <Wordmark className="text-lg" />
            <p className="eyebrow mt-4 text-bone-mute">{site.tagline}</p>
            <p className="mt-6 text-[0.875rem] leading-[1.6] text-bone-dim">
              {footer.line}
            </p>
          </div>

          <div className="flex flex-col gap-10 sm:flex-row sm:gap-16 lg:gap-20">
            {links.length > 0 && (
              <nav aria-label="Contact">
                <p className="eyebrow text-bone-mute">Contact</p>
                <ul className="mt-5 space-y-3">
                  {links.map((link) => (
                    <li key={link.label}>
                      <a
                        href={link.href}
                        {...(external(link.href)
                          ? { target: "_blank", rel: "noreferrer noopener" }
                          : {})}
                        className="text-[0.875rem] text-bone-dim transition-colors duration-400 hover:text-gold"
                      >
                        {link.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </nav>
            )}

            <nav aria-label="Informations légales">
              <p className="eyebrow text-bone-mute">Informations</p>
              <ul className="mt-5 space-y-3">
                {footer.legal.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-[0.875rem] text-bone-dim transition-colors duration-400 hover:text-gold"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          </div>
        </div>

        <div className="mt-16 flex flex-col gap-3 border-t border-bone/10 pt-8 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[0.75rem] text-bone-mute">
            © {new Date().getFullYear()} {site.name}
          </p>
          <p className="text-[0.75rem] text-bone-mute">{site.domain}</p>
        </div>
      </Container>
    </footer>
  );
}
