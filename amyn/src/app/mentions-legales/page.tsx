import Link from "next/link";
import { Fact, LegalSection, LegalShell } from "@/components/legal/LegalShell";
import { LEGAL_LABELS, hosting, legal, legalComplete } from "@/lib/legal";
import { pageMetadata } from "@/lib/seo";
import { site } from "@/lib/site";

/* Hors index tant que des informations obligatoires manquent. */
export const metadata = pageMetadata({
  title: "Mentions légales",
  description: `Mentions légales du site ${site.domain} : éditeur, hébergeur, propriété intellectuelle.`,
  path: "/mentions-legales",
  noindex: !legalComplete(),
});

export default function LegalNoticePage() {
  const L = LEGAL_LABELS;
  return (
    <LegalShell
      title="Mentions légales"
      path="/mentions-legales"
      intro={`Informations relatives à l'éditeur et à l'hébergeur du site ${site.domain}.`}
    >
      <LegalSection title="Éditeur du site">
        <Fact label={L.publisherName} value={legal.publisherName} />
        <Fact label={L.legalForm} value={legal.legalForm} />
        {legal.shareCapital && <Fact label={L.shareCapital} value={legal.shareCapital} />}
        <Fact label={L.address} value={legal.address} />
        <Fact label={L.siren} value={legal.siren} />
        <Fact label={L.siret} value={legal.siret} />
        <Fact label={L.registration} value={legal.registration} />
        {legal.vatMention ? (
          <p>{legal.vatMention}</p>
        ) : (
          <Fact label={L.vatNumber} value={legal.vatNumber} />
        )}
        <Fact label={L.publicationDirector} value={legal.publicationDirector} />
        <p>
          <span className="text-fg">E-mail :</span>{" "}
          <a href={`mailto:${site.email}`}>{site.email}</a>
        </p>
        {legal.phone && <Fact label={L.phone} value={legal.phone} />}
        <p>Nom commercial : {site.legalBrand}.</p>
      </LegalSection>

      <LegalSection title="Hébergement">
        <p>
          Le site est hébergé par <span className="text-fg">{hosting.name}</span>,{" "}
          {hosting.address} —{" "}
          <a href={hosting.website} rel="noopener noreferrer" target="_blank">
            {hosting.website.replace("https://", "")}
          </a>
          .
        </p>
      </LegalSection>

      <LegalSection title="Propriété intellectuelle">
        <p>
          Les textes, la mise en page, l&apos;identité visuelle, les interfaces et les
          développements du site {site.domain} sont protégés par le droit d&apos;auteur.
          Sauf mention contraire, ils appartiennent à l&apos;éditeur. Toute reproduction
          ou réutilisation, même partielle, nécessite une autorisation préalable.
        </p>
        <p>
          Les polices de caractères utilisées (Geist, Geist Mono, Instrument Serif)
          sont distribuées sous licence libre SIL Open Font License.
        </p>
      </LegalSection>

      <LegalSection title="Projets présentés">
        <p>
          Les projets de la page <Link href="/realisations">Réalisations</Link> sont des
          concepts créés par AMYN pour illustrer sa façon de travailler. Les marques,
          noms et contenus qui y figurent sont fictifs ; ils ne désignent aucun client
          réel et ne présentent aucun résultat.
        </p>
      </LegalSection>

      <LegalSection title="Données personnelles et cookies">
        <p>
          Le traitement des données transmises par les formulaires et par e-mail est
          décrit dans la <Link href="/confidentialite">politique de confidentialité</Link>.
          Le site ne dépose aucun cookie : voir la page <Link href="/cookies">Cookies</Link>.
        </p>
      </LegalSection>
    </LegalShell>
  );
}
