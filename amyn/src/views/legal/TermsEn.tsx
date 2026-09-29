import Link from "next/link";
import { LegalSection, LegalShell, ToComplete } from "@/components/legal/LegalShell";
import { href, routeAlternates } from "@/lib/i18n/routes";
import { TERMS_LABELS_EN, legalComplete, missingTerms, terms } from "@/lib/legal";
import { pageMetadata } from "@/lib/seo";
import { site } from "@/lib/site";

export const termsEnMetadata = () =>
  pageMetadata({
    title: "Terms of service",
    description:
      "How AMYN works with clients: quote first, no-obligation first look, content, third-party services and the limits of our commitments.",
    locale: "en",
    alternates: routeAlternates("terms"),
    noindex: !legalComplete() || missingTerms().length > 0,
  });

/**
 * English courtesy version. Contractual clauses stay as placeholders until
 * the publisher has set and approved them (in French first).
 */
export function TermsEn() {
  const clause = (key: keyof typeof terms) =>
    terms[key] ? <p>{terms[key]}</p> : <p><ToComplete locale="en" label={TERMS_LABELS_EN[key]} /></p>;

  return (
    <LegalShell
      locale="en"
      title="Terms of service"
      path={href("terms", "en")}
      intro="The framework within which AMYN delivers its services. Every project also has a quote, which prevails over these terms for what it specifies. This English version is provided for convenience; the French version prevails."
    >
      <LegalSection title="Scope">
        <p>
          These terms apply to the services AMYN offers to businesses: website design and redesign,
          tracking tools, mobile apps, online booking, business profile improvements, client
          onboarding journeys, portfolios and content.
        </p>
      </LegalSection>

      <LegalSection title="Quote first">
        <p>
          Every project is priced on quote. The quote sets out the scope, deliverables, timeline,
          price and what is expected from the client. No billable work starts before the quote has
          been accepted in writing.
        </p>
        <p>
          Any addition to or change of scope during a project requires prior agreement and, where
          needed, an additional quote.
        </p>
      </LegalSection>

      <LegalSection title="First look">
        <p>
          The <Link href={href("firstLook", "en")}>first look</Link> is offered with no obligation.
          It carries no commitment to buy. AMYN decides freely whether a project lends itself to it
          and chooses the most useful format (visual direction, short review, recommendation…). It is
          not a website, an app or a tool delivered for free.
        </p>
      </LegalSection>

      <LegalSection title="Content supplied by the client">
        <p>
          AMYN only uses text, photos, brands and documents the client declares they are authorised
          to use — including the consent of people or clients who can be identified in project
          photos.
        </p>
      </LegalSection>

      <LegalSection title="Third-party services">
        <p>
          Some services rely on third parties (hosting, domain names, booking tools, email delivery,
          App Store, Google Play, Google Business Profile). These remain subject to their own terms
          and decisions, which AMYN does not control.
        </p>
      </LegalSection>

      <LegalSection title="What we don't guarantee">
        <ul>
          <li>A position in search engine results.</li>
          <li>Any volume of traffic, calls, reviews or sales.</li>
          <li>Acceptance of an app on the App Store or Google Play.</li>
        </ul>
        <p>
          What we do commit to is what&apos;s written in the quote: the scope, the deliverables and
          the quality of the work.
        </p>
      </LegalSection>

      <LegalSection title="Price, deposit and payment">
        {clause("payment")}
        {clause("deposit")}
      </LegalSection>
      <LegalSection title="Timelines">{clause("deadlines")}</LegalSection>
      <LegalSection title="Client obligations">{clause("clientObligations")}</LegalSection>
      <LegalSection title="Revisions">{clause("revisions")}</LegalSection>
      <LegalSection title="Intellectual property">
        <p>Ownership and transfer of rights in the deliverables are set out in each quote.</p>
        {clause("intellectualProperty")}
      </LegalSection>
      <LegalSection title="Maintenance and support">{clause("maintenance")}</LegalSection>
      <LegalSection title="Liability">{clause("liability")}</LegalSection>
      <LegalSection title="Cancellation">{clause("cancellation")}</LegalSection>
      <LegalSection title="Suspension and termination">{clause("termination")}</LegalSection>
      <LegalSection title="Governing law">{clause("law")}</LegalSection>
      <LegalSection title="Disputes">{clause("disputes")}</LegalSection>

      <LegalSection title="Contact">
        <p>
          For any question about these terms: <a href={`mailto:${site.email}`}>{site.email}</a>.
        </p>
      </LegalSection>
    </LegalShell>
  );
}
