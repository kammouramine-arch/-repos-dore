import Link from "next/link";
import { LegalSection, LegalShell } from "@/components/legal/LegalShell";
import { href, routeAlternates } from "@/lib/i18n/routes";
import { hosting, legal, retentionEn, tradeName } from "@/lib/legal";
import { pageMetadata } from "@/lib/seo";
import { site } from "@/lib/site";

export const privacyEnMetadata = () =>
  pageMetadata({
    title: "Privacy policy",
    description:
      "What data AMYN processes, why, on what legal basis, for how long, with which providers, and how to exercise your rights.",
    locale: "en",
    alternates: routeAlternates("privacy"),
  });

/** English courtesy version of the privacy policy. The French text prevails. */
export function PrivacyEn() {
  const cell = "border-b border-line py-4 pr-4 align-top";
  return (
    <LegalShell
      locale="en"
      title="Privacy policy"
      path={href("privacy", "en")}
      intro="We only collect what we need to reply to you or to offer a service that's useful to your business. Here's exactly what, why, and how you stay in control. This English version is provided for convenience; the French version prevails."
    >
      <LegalSection title="Data controller">
        <p>
          <span className="text-fg">{legal.publisherName}, entrepreneur individuel (EI)</span> (a
          sole trader under French law), trading as {tradeName} — SIREN {legal.siren},{" "}
          {legal.address} (see the <Link href={href("legalNotice", "en")}>legal notice</Link>).
        </p>
        <p>
          <span className="text-fg">Contact for any question about your data:</span>{" "}
          <a href={`mailto:${site.email}`}>{site.email}</a>
        </p>
      </LegalSection>

      <LegalSection title="Data processed and purposes">
        <div className="-mx-1 overflow-x-auto">
          <table className="w-full min-w-[34rem] border-collapse text-left text-[0.9375rem]">
            <caption className="sr-only">Personal data processing</caption>
            <thead>
              <tr className="label text-fg-3">
                <th scope="col" className={`${cell} font-normal`}>Situation</th>
                <th scope="col" className={`${cell} font-normal`}>Data</th>
                <th scope="col" className={`${cell} font-normal`}>Purpose</th>
                <th scope="col" className={`${cell} font-normal`}>Legal basis</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <th scope="row" className={`${cell} font-medium text-fg`}>“Get a first look” form</th>
                <td className={cell}>Name, company, email, optional phone and online presence, services of interest, main need, timeframe, project description</td>
                <td className={cell}>Review your business, reply to you and, if you wish, prepare a quote</td>
                <td className={cell}>Pre-contractual steps taken at your request (Art. 6(1)(b) GDPR)</td>
              </tr>
              <tr>
                <th scope="row" className={`${cell} font-medium text-fg`}>ProofSprint form</th>
                <td className={cell}>Company, work email, optional name, buyer deadline, description of the opportunity (no documents are requested)</td>
                <td className={cell}>Review the opportunity, reply to you and, if ProofSprint is a fit, agree the scope</td>
                <td className={cell}>Pre-contractual steps taken at your request (Art. 6(1)(b) GDPR)</td>
              </tr>
              <tr>
                <th scope="row" className={`${cell} font-medium text-fg`}>Revenue Audit request</th>
                <td className={cell}>Company, website, sector, revenue, headcount, enquiry-volume and customer-value ranges, tracking tools, lead sources, issues observed, name, optional role, work email, optional phone</td>
                <td className={cell}>Review your sales journey, reply to you and, if the audit is a fit, agree its terms</td>
                <td className={cell}>Pre-contractual steps taken at your request (Art. 6(1)(b) GDPR)</td>
              </tr>
              <tr>
                <th scope="row" className={`${cell} font-medium text-fg`}>Emails exchanged</th>
                <td className={cell}>Email address and message content</td>
                <td className={cell}>Corresponding with you</td>
                <td className={cell}>Pre-contractual steps or performance of the contract (Art. 6(1)(b))</td>
              </tr>
              <tr>
                <th scope="row" className={`${cell} font-medium text-fg`}>
                  <a href="#prospection">B2B outreach</a>
                </th>
                <td className={cell}>Public business information (see below)</td>
                <td className={cell}>Offering services relevant to your business</td>
                <td className={cell}>Legitimate interest (Art. 6(1)(f))</td>
              </tr>
              <tr>
                <th scope="row" className={`${cell} font-medium text-fg`}>Visiting the website</th>
                <td className={cell}>Hosting provider&apos;s technical logs (IP address, date, page requested)</td>
                <td className={cell}>Security and proper operation of the website</td>
                <td className={cell}>Legitimate interest (Art. 6(1)(f))</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p>The forms don&apos;t ask for any sensitive data. Please don&apos;t include any in your messages.</p>
      </LegalSection>

      <LegalSection id="prospection" title="Outreach to businesses">
        <p>
          AMYN sometimes contacts businesses when public information suggests one of its services
          could be useful to them. This processing is based on AMYN&apos;s legitimate interest in
          making its services known to professionals, with an offer related to their activity.
        </p>
        <p>
          <span className="text-fg">Data used:</span> the business name, address, SIREN/SIRET
          numbers, website and phone number; a business email address and, where applicable, the
          name and role of a contact, only when published by the business itself; observations about
          its public online presence; and any exchanges following our message.
        </p>
        <p>
          <span className="text-fg">Sources:</span> public business registers (the Sirene
          database), open map data and public business listings, and pages published by the business
          (website, legal notice, contact page). No address is guessed or bought: the origin of every
          address is recorded.
        </p>
        <p>
          <span className="text-fg">Objection:</span> you can object at any time, without giving a
          reason, by replying “stop” to our message or by writing to{" "}
          <a href={`mailto:${site.email}`}>{site.email}</a>. Your address (or your domain, if you ask)
          is then added to an opt-out list and receives no further messages.
        </p>
        <p>
          When assisted writing is used to prepare a message, the writing service only receives the
          business name, its town, its industry and the findings of the review — never the
          recipient&apos;s email address.
        </p>
      </LegalSection>

      <LegalSection title="Recipients and service providers">
        <p>
          Your data is intended for AMYN only. It is never sold, rented or transferred. It passes
          through the following technical providers, acting on AMYN&apos;s behalf:
        </p>
        <ul>
          <li>
            <span className="text-fg">{hosting.name}</span> — website hosting (United States);
          </li>
          <li>
            <span className="text-fg">OVHcloud</span> — business email, including sending and
            receiving requests submitted through the form (France);
          </li>
          <li>
            <span className="text-fg">Resend</span> — email delivery service, used only as a
            fallback to pass a form request on to AMYN if sending through the OVHcloud mailbox is not
            configured (United States);
          </li>
          <li>
            <span className="text-fg">Anthropic</span> — where applicable, assisted drafting of
            outreach messages, within the limits described above (United States).
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="Transfers outside the European Union">
        <p>
          Some providers are based in the United States. These transfers are covered by the
          safeguards provided for by the GDPR (Articles 44 et seq.), in particular the European
          Commission&apos;s standard contractual clauses or the provider&apos;s certification under the
          EU–US Data Privacy Framework.
        </p>
      </LegalSection>

      <LegalSection title="Retention periods">
        <ul>
          <li>Requests received by form or email: {retentionEn.requests}.</li>
          <li>Outreach data: {retentionEn.prospects}.</li>
          <li>Opt-out list: {retentionEn.optOut}.</li>
          <li>Clients: {retentionEn.clients}.</li>
          <li>Hosting provider&apos;s technical logs: according to the provider&apos;s policy.</li>
        </ul>
      </LegalSection>

      <LegalSection title="Your rights">
        <p>
          You have the right to access, rectify, erase, restrict and object to the processing of your
          data, as well as a right to data portability where processing is based on a contract. You
          can also set out instructions on what happens to your data after your death.
        </p>
        <p>
          To exercise them, write to <a href={`mailto:${site.email}`}>{site.email}</a> or by post to{" "}
          {legal.publisherName} — {tradeName}, {legal.address}. We reply
          within one month. If you believe your rights haven&apos;t been respected, you can lodge a
          complaint with the CNIL, the French data protection authority (
          <a href="https://www.cnil.fr/fr/plaintes" rel="noopener noreferrer" target="_blank">
            cnil.fr
          </a>
          ).
        </p>
      </LegalSection>

      <LegalSection title="Security">
        <p>
          The website is served over HTTPS only. Forms are validated on the server and protected
          against automated submissions, and no access key is exposed in the browser. Access to the
          requests received is restricted to AMYN.
        </p>
      </LegalSection>

      <LegalSection title="Cookies">
        <p>
          The website sets no cookies and uses no analytics or advertising tools. Details are on the{" "}
          <Link href={href("cookies", "en")}>Cookies</Link> page.
        </p>
      </LegalSection>
    </LegalShell>
  );
}
