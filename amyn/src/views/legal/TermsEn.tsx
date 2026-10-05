import Link from "next/link";
import { LegalSection, LegalShell } from "@/components/legal/LegalShell";
import { href, routeAlternates } from "@/lib/i18n/routes";
import { legal, tradeName } from "@/lib/legal";
import { pageMetadata } from "@/lib/seo";
import { site } from "@/lib/site";

export const termsEnMetadata = () =>
  pageMetadata({
    title: "Terms of service",
    description:
      "How AMYN works with businesses: quote first, no-obligation first look, payment, intellectual property, liability and disputes.",
    locale: "en",
    alternates: routeAlternates("terms"),
  });

/**
 * English courtesy version of TermsFr: same clauses, nothing added. The
 * French version prevails.
 */
export function TermsEn() {
  return (
    <LegalShell
      locale="en"
      title="Terms of service"
      path={href("terms", "en")}
      intro="The framework in which AMYN delivers its services to businesses. Each project is covered by a quote, which prevails over these terms for anything it specifies. This English version is provided for convenience; the French version prevails."
    >
      <LegalSection title="Scope">
        <p>
          These terms apply to the services AMYN offers to professionals — businesses,
          self-employed people and organisations acting for the purposes of their activity:
          design and implementation of bespoke sales systems (
          <Link href={href("revenueOs", "en")}>AMYN Revenue OS</Link>), the Revenue Audit, website creation and redesign, request-tracking tools, mobile apps, online booking,
          business profile improvements, client onboarding, portfolio and content, as well as the{" "}
          <Link href={href("proofsprint", "en")}>ProofSprint</Link> service (an enterprise deal proof
          package whose price, standard scope and payment schedule are published on its page). They
          do not cover contracts with consumers.
        </p>
        <p>
          Where a contract is concluded off-premises with a professional who employs five people
          or fewer and whose main activity is not the subject of the service ordered, the
          protective provisions of Article L221-3 of the French Consumer Code, including the right
          of withdrawal, apply.
        </p>
        <p>
          The service provider is {legal.publisherName}, entrepreneur individuel (EI) — a sole trader
          under French law — trading as {tradeName}: SIREN {legal.siren}, SIRET {legal.siret},{" "}
          {legal.address}.
        </p>
      </LegalSection>

      <LegalSection title="Quotes and formation of the contract">
        <p>
          Every project is priced on a quote. The quote sets out the scope, deliverables,
          timeline, price and what is expected from the client. The contract is formed when the
          quote is accepted in writing; no billable work starts before that.
        </p>
        <p>
          Any change or addition to the scope during a project requires prior agreement and,
          where needed, an additional quote.
        </p>
      </LegalSection>

      <LegalSection title="First look">
        <p>
          The <Link href={href("firstLook", "en")}>first look</Link> is offered with no obligation
          and involves no commitment to buy. AMYN decides freely whether a project lends itself to
          one and chooses the most useful format (visual direction, short review,
          recommendation…). It is not a website, app or tool delivered for free.
        </p>
      </LegalSection>

      <LegalSection title="Prices, deposit and payment">
        <p>
          Prices are stated in the quote, in euros. AMYN is under the French VAT
          exemption scheme for small businesses (franchise en base): VAT not applicable, article 293 B
          of the French General Tax Code (CGI).
          The quote sets out the payment schedule and methods; it may provide for a deposit, with
          its amount and due date.
        </p>
        <p>
          If the quote sets no payment term, amounts due are payable within the period set by
          Article L441-10 of the French Commercial Code. Any late payment automatically incurs,
          without reminder, late-payment penalties at the rate set by that article, plus the fixed
          recovery fee of €40 (Article D441-5 of the French Commercial Code).
        </p>
      </LegalSection>

      <LegalSection title="Start and timelines">
        <p>
          The project starts once the quote is accepted and, if the quote provides for one, the
          deposit is paid. Timelines are those set out in the quote. They assume that the content,
          access and approvals expected from the client are provided on time; any delay on the
          client&apos;s side moves the schedule accordingly.
        </p>
      </LegalSection>

      <LegalSection title="Client obligations">
        <p>
          The client provides the information, content and access the project needs, and responds
          to approval requests. The client warrants that they are entitled to use the text,
          photos, trademarks and documents they send — in particular the consent of any
          identifiable people or customers in photos. AMYN only uses content provided in this way
          or content whose rights have been acquired for the project.
        </p>
      </LegalSection>

      <LegalSection title="Revisions and approval of deliverables">
        <p>
          The number of included revisions and how deliverables are approved are set out in the
          quote. Requests beyond that require prior agreement.
        </p>
      </LegalSection>

      <LegalSection title="Intellectual property">
        <p>
          The rights assigned or licensed to the client in the deliverables — scope, duration,
          territory and purpose — are set out in the quote, and are only transferred on the terms
          it provides (Article L131-3 of the French Intellectual Property Code).
        </p>
        <p>
          Third-party elements included in a deliverable (typefaces, software libraries,
          photographs, plugins, online services) remain subject to their own licences, which are
          shared with the client where relevant.
        </p>
      </LegalSection>

      <LegalSection title="Third-party services, hosting and maintenance">
        <p>
          Some services rely on third parties (hosting, domain names, booking tools, email
          delivery, the App Store, Google Play, Google Business Profile). These remain subject to
          their own terms and decisions, which AMYN does not control.
        </p>
        <p>
          Hosting, maintenance and support after delivery are only included if they appear in the
          quote or are covered by a separate agreement.
        </p>
      </LegalSection>

      <LegalSection title="What we don't guarantee">
        <ul>
          <li>A position in search engine results.</li>
          <li>A volume of traffic, calls, reviews or sales.</li>
          <li>Acceptance of an app on the App Store or Google Play.</li>
        </ul>
        <p>
          What we do commit to is what the quote says: the scope, the deliverables and the quality
          of the work.
        </p>
      </LegalSection>

      <LegalSection title="Liability and force majeure">
        <p>
          Each party is liable for performing its own obligations under ordinary law; the quote
          may set out terms suited to the project. Neither party is liable for a failure caused by
          force majeure within the meaning of Article 1218 of the French Civil Code.
        </p>
      </LegalSection>

      <LegalSection title="Cancellation, suspension and termination">
        <p>
          Cancellation and termination terms, and what happens to work already done and amounts
          already paid, are set out in the quote. Failing that, the rules of the French Civil Code
          on non-performance of contracts apply (Articles 1217 and 1224 et seq.).
        </p>
      </LegalSection>

      <LegalSection title="Governing law and disputes">
        <p>
          These terms and the contracts concluded with AMYN are governed by French law. In the
          event of a dispute, the parties first seek an amicable solution; failing that, the
          dispute is brought before the competent court under the ordinary rules.
        </p>
      </LegalSection>

      <LegalSection title="Contact">
        <p>
          For any question about these terms: <a href={`mailto:${site.email}`}>{site.email}</a>.
        </p>
      </LegalSection>
    </LegalShell>
  );
}
