import type { Metadata } from "next";
import { LegalBlock, LegalShell, ToFill } from "@/components/layout/LegalShell";
import { contact, site } from "@/lib/content";

/* Tant que la page contient des emplacements vides, elle reste hors des
   moteurs de recherche. Retire `robots` une fois tout renseigné. */
export const metadata: Metadata = {
  title: "Mentions légales",
  robots: { index: false, follow: false },
};

export default function MentionsLegales() {
  return (
    <LegalShell title="Mentions légales">
      <LegalBlock heading="Éditeur du site">
        <ToFill>Dénomination sociale et forme juridique.</ToFill>
        <ToFill>Adresse du siège social.</ToFill>
        <ToFill>Numéro SIREN / SIRET.</ToFill>
        <ToFill>Numéro de TVA intracommunautaire, le cas échéant.</ToFill>
        <ToFill>Nom du directeur de la publication.</ToFill>
        <p>
          Contact : <a className="text-bone hover:text-gold" href={`mailto:${contact.email}`}>{contact.email}</a>
        </p>
      </LegalBlock>

      <LegalBlock heading="Hébergement">
        <ToFill>
          Nom, adresse et téléphone de l&apos;hébergeur du site.
        </ToFill>
      </LegalBlock>

      <LegalBlock heading="Propriété intellectuelle">
        <p>
          L&apos;ensemble des contenus de {site.domain} — textes, mises en page,
          identité visuelle et développements — est la propriété de {site.name},
          sauf mention contraire. Toute reproduction, même partielle, est
          soumise à autorisation préalable.
        </p>
        <p>
          Les projets présentés dans la section Démonstrations sont des concepts
          créés par {site.name}. Ils ne représentent aucun client réel.
        </p>
      </LegalBlock>
    </LegalShell>
  );
}
