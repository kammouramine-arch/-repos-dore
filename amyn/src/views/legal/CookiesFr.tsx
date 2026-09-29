import Link from "next/link";
import { LegalSection, LegalShell } from "@/components/legal/LegalShell";
import { href, routeAlternates } from "@/lib/i18n/routes";
import { pageMetadata } from "@/lib/seo";
import { consentRequired, trackers } from "@/lib/trackers";

export const cookiesFrMetadata = () =>
  pageMetadata({
    title: "Cookies",
    description:
      "Le site amyn.agency ne dépose aucun cookie et n'utilise aucun traceur de mesure d'audience ni de publicité. Inventaire et explications.",
    locale: "fr",
    alternates: routeAlternates("cookies"),
  });

export function CookiesFr() {
  return (
    <LegalShell
      locale="fr"
      title="Cookies"
      path={href("cookies", "fr")}
      intro="Ce site ne dépose aucun cookie. C'est pour cette raison qu'il n'affiche pas de bandeau de consentement : il n'y a rien à accepter."
    >
      <LegalSection title="Inventaire">
        {trackers.length === 0 ? (
          <>
            <p>
              <span className="text-fg">Aucun cookie, aucun traceur.</span> Le site ne
              dépose aucun cookie, n&apos;enregistre rien dans le stockage de votre
              navigateur et ne charge aucune ressource d&apos;un service tiers.
            </p>
            <ul>
              <li>Pas d&apos;outil de mesure d&apos;audience.</li>
              <li>Pas de publicité ni de reciblage.</li>
              <li>Pas de bouton ni de contenu embarqué de réseau social.</li>
              <li>
                Les polices de caractères sont servies par le site lui-même, sans appel
                à un service externe.
              </li>
            </ul>
            <p>
              Votre choix de langue (français ou anglais) n&apos;est pas enregistré non plus : il
              fait simplement partie de l&apos;adresse de la page (<span className="text-fg">/en</span>).
            </p>
          </>
        ) : (
          <ul>
            {trackers.map((t) => (
              <li key={t.name}>
                <span className="text-fg">{t.name}</span> ({t.provider}) — {t.purpose}.
                Durée : {t.duration}.{" "}
                {t.requiresConsent ? "Déposé uniquement avec votre accord." : "Strictement nécessaire."}
              </li>
            ))}
          </ul>
        )}
      </LegalSection>

      <LegalSection title="Journaux techniques">
        <p>
          Comme tout site, l&apos;hébergeur enregistre des journaux techniques (adresse
          IP, date, page demandée) pour assurer la sécurité et le bon fonctionnement
          du service. Ce ne sont pas des cookies ; ils sont décrits dans la{" "}
          <Link href={href("privacy", "fr")}>politique de confidentialité</Link>.
        </p>
      </LegalSection>

      <LegalSection title="Si cela change">
        <p>
          Si nous ajoutons un jour un outil de mesure d&apos;audience ou un contenu
          externe qui nécessite votre accord, il ne sera chargé qu&apos;après votre
          consentement. Vous pourrez alors tout accepter, tout refuser ou choisir, avec
          la même facilité, et revenir sur votre choix à tout moment depuis un lien
          « Gérer mes cookies » présent sur chaque page. Cette page sera mise à jour en
          conséquence.
        </p>
        {consentRequired && (
          <p className="text-fg">Des traceurs soumis à consentement sont actuellement déclarés.</p>
        )}
      </LegalSection>

      <LegalSection title="Paramétrer votre navigateur">
        <p>
          Indépendamment de ce site, vous pouvez à tout moment configurer votre
          navigateur pour refuser les cookies ou supprimer ceux déjà enregistrés. La
          CNIL explique comment faire sur{" "}
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
