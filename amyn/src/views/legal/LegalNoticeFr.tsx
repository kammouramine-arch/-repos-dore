import Link from "next/link";
import { Fact, LegalSection, LegalShell } from "@/components/legal/LegalShell";
import { LEGAL_LABELS, hosting, legal, legalComplete, registrationPending } from "@/lib/legal";
import { href, routeAlternates } from "@/lib/i18n/routes";
import { pageMetadata } from "@/lib/seo";
import { site } from "@/lib/site";

/* Hors index tant que des informations obligatoires manquent (SIREN,
   adresse, téléphone : voir legal.ts). */
export const legalNoticeFrMetadata = () =>
  pageMetadata({
    title: "Mentions légales",
    description: `Mentions légales du site ${site.domain} : éditeur, hébergeur, propriété intellectuelle.`,
    locale: "fr",
    alternates: routeAlternates("legalNotice"),
    noindex: !legalComplete(),
  });

export function LegalNoticeFr() {
  const L = LEGAL_LABELS;
  return (
    <LegalShell
      locale="fr"
      title="Mentions légales"
      path={href("legalNotice", "fr")}
      intro={`Informations relatives à l'éditeur et à l'hébergeur du site ${site.domain}.`}
    >
      <LegalSection title="Éditeur du site">
        <p>
          Le site {site.domain} est édité par{" "}
          <span className="text-fg">{legal.publisherName}</span>, personne physique,
          sous le nom commercial {site.legalBrand}.
        </p>
        {!legal.siren && <p className="text-fg">{registrationPending.fr}</p>}
        <Fact label={L.legalForm} value={legal.legalForm} />
        {legal.shareCapital && <Fact label={L.shareCapital} value={legal.shareCapital} />}
        <Fact label={L.address} value={legal.address} />
        <Fact label={L.siren} value={legal.siren} />
        <Fact label={L.siret} value={legal.siret} />
        <Fact label={L.registration} value={legal.registration} />
        {legal.vatMention ? <p>{legal.vatMention}</p> : <Fact label={L.vatNumber} value={legal.vatNumber} />}
        <Fact label={L.phone} value={legal.phone} />
        <p>
          <span className="text-fg">E-mail :</span>{" "}
          <a href={`mailto:${site.email}`}>{site.email}</a>
        </p>
        <Fact label={L.publicationDirector} value={legal.publicationDirector} />
      </LegalSection>

      <LegalSection title="Hébergement">
        <p>
          Le site est hébergé par <span className="text-fg">{hosting.name}</span>,{" "}
          {hosting.address} — téléphone&nbsp;: {hosting.phone} —{" "}
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
        <p>
          Les photographies qui illustrent les concepts proviennent de la banque{" "}
          <a href="https://unsplash.com/license" rel="noopener noreferrer" target="_blank">
            Unsplash
          </a>{" "}
          et sont utilisées selon sa licence. Elles ne représentent aucun client
          d&apos;AMYN.
        </p>
      </LegalSection>

      <LegalSection title="Projets présentés">
        <p>
          Les projets de la page <Link href={href("work", "fr")}>Réalisations</Link> sont des
          concepts créés par AMYN pour illustrer sa façon de travailler. Les marques,
          noms et contenus qui y figurent sont fictifs ; ils ne désignent aucun client
          réel et ne présentent aucun résultat.
        </p>
      </LegalSection>

      <LegalSection title="Données personnelles et cookies">
        <p>
          Le traitement des données transmises par les formulaires et par e-mail est
          décrit dans la <Link href={href("privacy", "fr")}>politique de confidentialité</Link>.
          Le site ne dépose aucun cookie : voir la page <Link href={href("cookies", "fr")}>Cookies</Link>.
        </p>
      </LegalSection>
    </LegalShell>
  );
}
