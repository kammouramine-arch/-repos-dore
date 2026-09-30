import Link from "next/link";
import { Fact, LegalSection, LegalShell } from "@/components/legal/LegalShell";
import { href, routeAlternates } from "@/lib/i18n/routes";
import { LEGAL_LABELS_EN, hosting, legal, legalComplete, registrationPending } from "@/lib/legal";
import { pageMetadata } from "@/lib/seo";
import { site } from "@/lib/site";

export const legalNoticeEnMetadata = () =>
  pageMetadata({
    title: "Legal notice",
    description: `Legal notice for ${site.domain}: publisher, hosting provider, intellectual property.`,
    locale: "en",
    alternates: routeAlternates("legalNotice"),
    noindex: !legalComplete(),
  });

/** English courtesy version. The French legal notice is the reference text. */
export function LegalNoticeEn() {
  const L = LEGAL_LABELS_EN;
  return (
    <LegalShell
      locale="en"
      title="Legal notice"
      path={href("legalNotice", "en")}
      intro={`Information about the publisher and hosting provider of ${site.domain}. This English version is provided for convenience; the French version prevails.`}
    >
      <LegalSection title="Publisher">
        <p>
          {site.domain} is published by <span className="text-fg">{legal.publisherName}</span>, a
          natural person, under the trading name {site.legalBrand}.
        </p>
        {!legal.siren && <p className="text-fg">{registrationPending.en}</p>}
        <Fact locale="en" label={L.legalForm} value={legal.legalForm} />
        {legal.shareCapital && <Fact locale="en" label={L.shareCapital} value={legal.shareCapital} />}
        <Fact locale="en" label={L.address} value={legal.address} />
        <Fact locale="en" label={L.siren} value={legal.siren} />
        <Fact locale="en" label={L.siret} value={legal.siret} />
        <Fact locale="en" label={L.registration} value={legal.registration} />
        {legal.vatMention ? <p>{legal.vatMention}</p> : <Fact locale="en" label={L.vatNumber} value={legal.vatNumber} />}
        <Fact locale="en" label={L.phone} value={legal.phone} />
        <p>
          <span className="text-fg">Email:</span> <a href={`mailto:${site.email}`}>{site.email}</a>
        </p>
        <Fact locale="en" label={L.publicationDirector} value={legal.publicationDirector} />
      </LegalSection>

      <LegalSection title="Hosting">
        <p>
          The website is hosted by <span className="text-fg">{hosting.name}</span>,{" "}
          {hosting.addressEn} — phone: {hosting.phone} —{" "}
          <a href={hosting.website} rel="noopener noreferrer" target="_blank">
            {hosting.website.replace("https://", "")}
          </a>
          .
        </p>
      </LegalSection>

      <LegalSection title="Intellectual property">
        <p>
          The text, layout, visual identity, interfaces and code of {site.domain} are protected
          by copyright. Unless stated otherwise, they belong to the publisher. Any reproduction or
          reuse, even partial, requires prior permission.
        </p>
        <p>
          The typefaces used (Geist, Geist Mono, Instrument Serif) are distributed under the SIL
          Open Font License.
        </p>
        <p>
          The photographs used in the concepts come from{" "}
          <a href="https://unsplash.com/license" rel="noopener noreferrer" target="_blank">
            Unsplash
          </a>{" "}
          and are used under its licence. They do not depict any AMYN client.
        </p>
      </LegalSection>

      <LegalSection title="Projects shown">
        <p>
          The projects on the <Link href={href("work", "en")}>Work</Link> page are concepts created
          by AMYN to illustrate how we work. The brands, names and content shown are fictional; they
          do not refer to any real client and present no results.
        </p>
      </LegalSection>

      <LegalSection title="Personal data and cookies">
        <p>
          How data sent through the forms and by email is handled is described in the{" "}
          <Link href={href("privacy", "en")}>privacy policy</Link>. The website sets no cookies:
          see the <Link href={href("cookies", "en")}>Cookies</Link> page.
        </p>
      </LegalSection>
    </LegalShell>
  );
}
