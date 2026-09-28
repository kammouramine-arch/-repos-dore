import Link from "next/link";
import { Fact, LegalSection, LegalShell } from "@/components/legal/LegalShell";
import { LEGAL_LABELS, hosting, legal, legalComplete, retention } from "@/lib/legal";
import { pageMetadata } from "@/lib/seo";
import { site } from "@/lib/site";

export const metadata = pageMetadata({
  title: "Politique de confidentialité",
  description:
    "Quelles données AMYN traite, pourquoi, sur quelle base, combien de temps, avec quels prestataires, et comment exercer vos droits.",
  path: "/confidentialite",
  noindex: !legalComplete(),
});

/**
 * Politique de confidentialité — décrit les traitements RÉELS :
 *   - les deux formulaires du site, remis à la boîte contact@amyn.agency
 *     par le serveur d'envoi d'OVHcloud (aucun service d'envoi tiers) ;
 *   - les échanges par e-mail (boîte hébergée chez OVH, constatée par les
 *     enregistrements MX du domaine) ;
 *   - la prospection B2B menée avec l'outil interne AMYN Outreach, qui ne
 *     collecte que des informations publiques et gère une liste
 *     d'opposition ;
 *   - l'hébergement (Vercel) et ses journaux techniques.
 * Le site ne dépose aucun cookie et ne charge aucun traceur.
 */
export default function PrivacyPage() {
  const cell = "border-b border-line py-4 pr-4 align-top";
  return (
    <LegalShell
      title="Politique de confidentialité"
      path="/confidentialite"
      intro="Nous ne collectons que ce qui sert à vous répondre ou à vous proposer un service utile à votre activité. Voici précisément quoi, pourquoi, et comment garder la main."
    >
      <LegalSection title="Responsable du traitement">
        <Fact label={LEGAL_LABELS.publisherName} value={legal.publisherName} />
        <Fact label={LEGAL_LABELS.address} value={legal.address} />
        <p>
          <span className="text-fg">Contact pour toute question sur vos données :</span>{" "}
          <a href={`mailto:${site.email}`}>{site.email}</a>
        </p>
      </LegalSection>

      <LegalSection title="Données traitées et finalités">
        <div className="-mx-1 overflow-x-auto">
          <table className="w-full min-w-[34rem] border-collapse text-left text-[0.9375rem]">
            <caption className="sr-only">Traitements de données personnelles</caption>
            <thead>
              <tr className="label text-fg-3">
                <th scope="col" className={`${cell} font-normal`}>Situation</th>
                <th scope="col" className={`${cell} font-normal`}>Données</th>
                <th scope="col" className={`${cell} font-normal`}>Finalité</th>
                <th scope="col" className={`${cell} font-normal`}>Base légale</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <th scope="row" className={`${cell} font-medium text-fg`}>Formulaire « Recevoir un premier aperçu »</th>
                <td className={cell}>Nom, entreprise, e-mail, téléphone et présence en ligne facultatifs, services souhaités, besoin principal, échéance, description du projet</td>
                <td className={cell}>Étudier votre activité, vous répondre et, si vous le souhaitez, préparer un devis</td>
                <td className={cell}>Mesures précontractuelles prises à votre demande (art. 6.1.b RGPD)</td>
              </tr>
              <tr>
                <th scope="row" className={`${cell} font-medium text-fg`}>E-mails échangés</th>
                <td className={cell}>Adresse e-mail et contenu des messages</td>
                <td className={cell}>Correspondre avec vous</td>
                <td className={cell}>Mesures précontractuelles ou exécution du contrat (art. 6.1.b)</td>
              </tr>
              <tr>
                <th scope="row" className={`${cell} font-medium text-fg`}>
                  <a href="#prospection">Prospection B2B</a>
                </th>
                <td className={cell}>Informations professionnelles publiques (voir ci-dessous)</td>
                <td className={cell}>Proposer nos services en rapport avec votre activité</td>
                <td className={cell}>Intérêt légitime (art. 6.1.f)</td>
              </tr>
              <tr>
                <th scope="row" className={`${cell} font-medium text-fg`}>Consultation du site</th>
                <td className={cell}>Journaux techniques de l&apos;hébergeur (adresse IP, date, page demandée)</td>
                <td className={cell}>Sécurité et bon fonctionnement du site</td>
                <td className={cell}>Intérêt légitime (art. 6.1.f)</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p>
          Les formulaires ne demandent aucune donnée sensible. Merci de ne pas en
          inclure dans vos messages.
        </p>
      </LegalSection>

      <LegalSection id="prospection" title="Prospection auprès des entreprises">
        <p>
          AMYN contacte parfois des entreprises lorsque des informations publiques
          laissent penser qu&apos;un de ses services pourrait leur être utile. Ce
          traitement repose sur l&apos;intérêt légitime d&apos;AMYN à faire connaître ses
          services auprès de professionnels, pour une offre en rapport avec leur
          activité.
        </p>
        <p>
          <span className="text-fg">Données utilisées :</span> dénomination, adresse,
          numéros SIREN/SIRET, site web et téléphone de l&apos;entreprise ; adresse
          e-mail professionnelle et, le cas échéant, nom et fonction d&apos;un
          interlocuteur, uniquement lorsqu&apos;ils sont publiés par l&apos;entreprise
          elle-même ; constats sur sa présence en ligne publique ; échanges qui
          suivent notre message.
        </p>
        <p>
          <span className="text-fg">Sources :</span> annuaires publics des entreprises
          (base Sirene), données cartographiques ouvertes et fiches d&apos;établissement
          publiques, et pages publiées par l&apos;entreprise (site, mentions légales,
          page de contact). Aucune adresse n&apos;est devinée ni achetée : l&apos;origine
          de chaque adresse est conservée.
        </p>
        <p>
          <span className="text-fg">Opposition :</span> vous pouvez vous opposer à tout
          moment, sans motif, en répondant « stop » à notre message ou en écrivant à{" "}
          <a href={`mailto:${site.email}`}>{site.email}</a>. Votre adresse (ou votre
          domaine, si vous le demandez) est alors inscrite sur une liste
          d&apos;opposition et ne reçoit plus aucun message.
        </p>
        <p>
          Lorsque la rédaction assistée est utilisée pour préparer un message, le
          service de rédaction ne reçoit que le nom de l&apos;entreprise, sa ville, son
          secteur et les constats de l&apos;analyse — jamais l&apos;adresse e-mail du
          destinataire.
        </p>
      </LegalSection>

      <LegalSection title="Destinataires et prestataires">
        <p>
          Vos données sont destinées à AMYN uniquement. Elles ne sont ni vendues, ni
          louées, ni cédées. Elles transitent par les prestataires techniques
          suivants, qui agissent pour le compte d&apos;AMYN :
        </p>
        <ul>
          <li>
            <span className="text-fg">{hosting.name}</span> — hébergement du site
            (États-Unis) ;
          </li>
          <li>
            <span className="text-fg">OVHcloud</span> — messagerie professionnelle,
            y compris la réception des demandes envoyées par les formulaires
            (France) ;
          </li>
          <li>
            le cas échéant, un service de rédaction assistée pour la prospection, dans
            les limites décrites ci-dessus.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="Transferts hors de l'Union européenne">
        <p>
          Certains prestataires sont établis aux États-Unis. Ces transferts sont
          encadrés par les garanties prévues par le RGPD (articles 44 et suivants),
          notamment les clauses contractuelles types de la Commission européenne ou
          l&apos;adhésion du prestataire au cadre de protection des données UE–États-Unis.
        </p>
      </LegalSection>

      <LegalSection title="Durées de conservation">
        <ul>
          <li>Demandes reçues par formulaire ou par e-mail : {retention.requests}.</li>
          <li>Données de prospection : {retention.prospects}.</li>
          <li>Liste d&apos;opposition : {retention.optOut}.</li>
          <li>Clients : {retention.clients}.</li>
          <li>Journaux techniques de l&apos;hébergeur : selon la politique de l&apos;hébergeur.</li>
        </ul>
      </LegalSection>

      <LegalSection title="Vos droits">
        <p>
          Vous disposez d&apos;un droit d&apos;accès, de rectification, d&apos;effacement, de
          limitation et d&apos;opposition, ainsi que d&apos;un droit à la portabilité
          lorsque le traitement repose sur le contrat. Vous pouvez aussi définir des
          directives sur le sort de vos données après votre décès.
        </p>
        <p>
          Pour les exercer, écrivez à <a href={`mailto:${site.email}`}>{site.email}</a>.
          Nous répondons dans un délai d&apos;un mois. Si vous estimez que vos droits ne
          sont pas respectés, vous pouvez adresser une réclamation à la CNIL (
          <a href="https://www.cnil.fr/fr/plaintes" rel="noopener noreferrer" target="_blank">
            cnil.fr
          </a>
          ).
        </p>
      </LegalSection>

      <LegalSection title="Sécurité">
        <p>
          Le site est servi exclusivement en HTTPS. Les formulaires sont vérifiés côté
          serveur, protégés contre les envois automatisés, et aucune clé d&apos;accès
          n&apos;est exposée dans le navigateur. L&apos;accès aux demandes reçues est limité à
          AMYN.
        </p>
      </LegalSection>

      <LegalSection title="Cookies">
        <p>
          Le site ne dépose aucun cookie et n&apos;utilise aucun outil de mesure
          d&apos;audience ni de publicité. Le détail est sur la page{" "}
          <Link href="/cookies">Cookies</Link>.
        </p>
      </LegalSection>
    </LegalShell>
  );
}
