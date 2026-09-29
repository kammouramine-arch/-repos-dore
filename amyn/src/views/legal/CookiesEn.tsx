import Link from "next/link";
import { LegalSection, LegalShell } from "@/components/legal/LegalShell";
import { href, routeAlternates } from "@/lib/i18n/routes";
import { pageMetadata } from "@/lib/seo";
import { consentRequired, trackers } from "@/lib/trackers";

export const cookiesEnMetadata = () =>
  pageMetadata({
    title: "Cookies",
    description:
      "amyn.agency sets no cookies and uses no analytics or advertising trackers. Inventory and explanations.",
    locale: "en",
    alternates: routeAlternates("cookies"),
  });

export function CookiesEn() {
  return (
    <LegalShell
      locale="en"
      title="Cookies"
      path={href("cookies", "en")}
      intro="This website sets no cookies. That's why it shows no consent banner: there's nothing to accept."
    >
      <LegalSection title="Inventory">
        {trackers.length === 0 ? (
          <>
            <p>
              <span className="text-fg">No cookies, no trackers.</span> The website sets no
              cookies, stores nothing in your browser and loads no resources from third-party
              services.
            </p>
            <ul>
              <li>No analytics tool.</li>
              <li>No advertising or retargeting.</li>
              <li>No social media buttons or embedded content.</li>
              <li>Fonts are served by the website itself, with no call to an external service.</li>
            </ul>
            <p>
              Your language choice (French or English) isn&apos;t stored either: it is simply part
              of the page address (<span className="text-fg">/en</span>).
            </p>
          </>
        ) : (
          <ul>
            {trackers.map((t) => (
              <li key={t.name}>
                <span className="text-fg">{t.name}</span> ({t.provider}) — {t.purpose}. Duration:{" "}
                {t.duration}. {t.requiresConsent ? "Only set with your consent." : "Strictly necessary."}
              </li>
            ))}
          </ul>
        )}
      </LegalSection>

      <LegalSection title="Server logs">
        <p>
          Like any website, the hosting provider keeps technical logs (IP address, date, page
          requested) to keep the service secure and running. These aren&apos;t cookies; they are
          described in the <Link href={href("privacy", "en")}>privacy policy</Link>.
        </p>
      </LegalSection>

      <LegalSection title="If this changes">
        <p>
          If we ever add an analytics tool or external content that requires your consent, it will
          only load after you agree. You&apos;ll be able to accept all, refuse all or choose, just as
          easily, and change your mind at any time from a “Manage cookies” link on every page. This
          page will be updated accordingly.
        </p>
        {consentRequired && <p className="text-fg">Trackers requiring consent are currently declared.</p>}
      </LegalSection>

      <LegalSection title="Browser settings">
        <p>
          Independently of this website, you can set your browser to refuse cookies or delete those
          already stored at any time. The CNIL (the French data protection authority) explains how
          on{" "}
          <a
            href="https://www.cnil.fr/fr/cookies-et-autres-traceurs/comment-se-proteger/maitriser-votre-navigateur"
            rel="noopener noreferrer"
            target="_blank"
          >
            cnil.fr
          </a>
          .
        </p>
      </LegalSection>
    </LegalShell>
  );
}
