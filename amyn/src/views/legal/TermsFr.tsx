import Link from "next/link";
import { LegalSection, LegalShell } from "@/components/legal/LegalShell";
import { registrationPending } from "@/lib/legal";
import { href, routeAlternates } from "@/lib/i18n/routes";
import { pageMetadata } from "@/lib/seo";
import { site } from "@/lib/site";

export const termsFrMetadata = () =>
  pageMetadata({
    title: "Conditions des services",
    description:
      "Le cadre des prestations AMYN pour les professionnels : devis préalable, premier aperçu sans engagement, paiement, propriété intellectuelle, responsabilité et litiges.",
    locale: "fr",
    alternates: routeAlternates("terms"),
  });

/**
 * Conditions des services (relations entre professionnels).
 *
 * Rien n'y est inventé : chaque clause décrit le fonctionnement réel
 * d'AMYN, renvoie au devis pour ce qui dépend de chaque projet (acompte,
 * délais, révisions, cession des droits, maintenance…), ou rappelle une
 * règle légale en citant son article (Code de commerce L441-1 et L441-10,
 * D441-5 ; Code civil 1218 et 1224 ; Code de la propriété intellectuelle
 * L131-3 ; Code de la consommation L221-3). Aucune règle commerciale
 * arbitraire n'est fixée à la place de l'éditeur ; une relecture par un
 * professionnel du droit reste recommandée.
 */
export function TermsFr() {
  return (
    <LegalShell
      locale="fr"
      title="Conditions des services"
      path={href("terms", "fr")}
      intro="Le cadre dans lequel AMYN réalise ses prestations pour les professionnels. Chaque projet fait l'objet d'un devis, qui prévaut sur les présentes conditions pour ce qu'il précise."
    >
      <LegalSection title="Champ d'application">
        <p>
          Ces conditions s&apos;appliquent aux prestations proposées par AMYN aux
          professionnels — entreprises, indépendants et associations agissant pour les
          besoins de leur activité : création et refonte de sites, outils de suivi des
          demandes, applications mobiles, réservation en ligne, amélioration de fiches
          d&apos;établissement, parcours d&apos;accueil client, portfolio et contenus. Elles ne
          visent pas les contrats conclus avec des consommateurs.
        </p>
        <p>
          Lorsqu&apos;un contrat est conclu hors établissement avec un professionnel qui
          emploie cinq salariés au plus et dont l&apos;activité principale n&apos;a pas pour
          objet la prestation commandée, les dispositions protectrices prévues par
          l&apos;article L221-3 du Code de la consommation, dont le droit de rétractation,
          s&apos;appliquent.
        </p>
        <p>{registrationPending.fr}</p>
      </LegalSection>

      <LegalSection title="Devis et formation du contrat">
        <p>
          Chaque projet est chiffré sur devis. Le devis précise le périmètre, les
          livrables, le calendrier, le prix et ce qui est attendu du client. Le contrat
          est formé par l&apos;acceptation écrite du devis ; aucun travail facturable ne
          commence avant cette acceptation.
        </p>
        <p>
          Tout ajout ou modification de périmètre en cours de projet fait l&apos;objet
          d&apos;un accord préalable et, si nécessaire, d&apos;un devis complémentaire.
        </p>
      </LegalSection>

      <LegalSection title="Premier aperçu">
        <p>
          Le <Link href={href("firstLook", "fr")}>premier aperçu</Link> est proposé sans
          engagement et n&apos;entraîne aucune obligation d&apos;achat. AMYN apprécie
          librement si un projet s&apos;y prête et choisit le format le plus utile
          (direction visuelle, courte analyse, recommandation…). Il ne constitue ni un
          site, ni une application, ni un outil réalisé gratuitement.
        </p>
      </LegalSection>

      <LegalSection title="Prix, acompte et paiement">
        <p>
          Les prix sont indiqués dans le devis, en euros, avec la mention du régime de
          TVA applicable. Le devis précise l&apos;échéancier et les moyens de paiement ; un
          acompte peut y être prévu, avec son montant et son échéance.
        </p>
        <p>
          À défaut de délai fixé dans le devis, les sommes dues sont payables dans le
          délai prévu par l&apos;article L441-10 du Code de commerce. Tout retard de
          paiement entraîne de plein droit, sans rappel, des pénalités de retard au taux
          prévu par ce même article, ainsi que l&apos;indemnité forfaitaire pour frais de
          recouvrement de 40 € (article D441-5 du Code de commerce).
        </p>
      </LegalSection>

      <LegalSection title="Démarrage et délais">
        <p>
          Le projet démarre après l&apos;acceptation du devis et, s&apos;il en prévoit un,
          le versement de l&apos;acompte. Les délais sont ceux indiqués dans le devis. Ils
          supposent la remise, dans les temps convenus, des contenus, accès et
          validations attendus du client ; un retard de sa part décale le calendrier
          d&apos;autant.
        </p>
      </LegalSection>

      <LegalSection title="Engagements du client">
        <p>
          Le client fournit les informations, contenus et accès nécessaires au projet,
          et répond aux demandes de validation. Il garantit être autorisé à utiliser les
          textes, photos, marques et documents qu&apos;il transmet — notamment l&apos;accord
          des personnes ou des clients identifiables sur les photos. AMYN n&apos;utilise que
          les contenus ainsi fournis ou ceux dont les droits sont acquis pour le projet.
        </p>
      </LegalSection>

      <LegalSection title="Révisions et validation des livrables">
        <p>
          Le nombre de révisions incluses et les modalités de validation des livrables
          sont précisés dans le devis. Les demandes qui vont au-delà font l&apos;objet
          d&apos;un accord préalable.
        </p>
      </LegalSection>

      <LegalSection title="Propriété intellectuelle">
        <p>
          Les droits cédés ou concédés au client sur les livrables — étendue, durée,
          territoire et destination — sont précisés dans le devis, et ne sont transférés
          que dans les termes qu&apos;il prévoit (article L131-3 du Code de la propriété
          intellectuelle).
        </p>
        <p>
          Les éléments tiers intégrés à un livrable (polices de caractères,
          bibliothèques logicielles, photographies, extensions, services en ligne)
          restent soumis à leurs propres licences, communiquées au client lorsqu&apos;elles
          le concernent.
        </p>
      </LegalSection>

      <LegalSection title="Services tiers, hébergement et maintenance">
        <p>
          Certaines prestations reposent sur des services tiers (hébergement, noms de
          domaine, outils de réservation, envoi d&apos;e-mails, App Store, Google Play,
          Google Business Profile). Ces services restent soumis à leurs propres
          conditions et à leurs décisions, qu&apos;AMYN ne contrôle pas.
        </p>
        <p>
          L&apos;hébergement, la maintenance et le support après livraison ne sont inclus
          que s&apos;ils figurent dans le devis ou font l&apos;objet d&apos;un accord distinct.
        </p>
      </LegalSection>

      <LegalSection title="Ce que nous ne garantissons pas">
        <ul>
          <li>Une position dans les résultats d&apos;un moteur de recherche.</li>
          <li>Un volume de trafic, d&apos;appels, d&apos;avis ou de ventes.</li>
          <li>L&apos;acceptation d&apos;une application sur l&apos;App Store ou Google Play.</li>
        </ul>
        <p>
          Nous nous engageons en revanche sur ce qui est écrit dans le devis : le
          périmètre, les livrables et la qualité de réalisation.
        </p>
      </LegalSection>

      <LegalSection title="Responsabilité et force majeure">
        <p>
          Chaque partie répond de l&apos;exécution de ses propres obligations dans les
          conditions du droit commun ; le devis peut préciser des stipulations adaptées
          au projet. Aucune partie n&apos;est responsable d&apos;un manquement dû à un cas de
          force majeure au sens de l&apos;article 1218 du Code civil.
        </p>
      </LegalSection>

      <LegalSection title="Annulation, suspension et résiliation">
        <p>
          Les conditions d&apos;annulation et de résiliation, et le sort des travaux déjà
          réalisés et des sommes déjà versées, sont précisés dans le devis. À défaut, les
          règles du Code civil relatives à l&apos;inexécution du contrat s&apos;appliquent
          (articles 1217 et 1224 et suivants).
        </p>
      </LegalSection>

      <LegalSection title="Droit applicable et litiges">
        <p>
          Les présentes conditions et les contrats conclus avec AMYN sont soumis au droit
          français. En cas de différend, les parties recherchent d&apos;abord une solution
          amiable ; à défaut, le litige est porté devant la juridiction compétente selon
          les règles de droit commun.
        </p>
      </LegalSection>

      <LegalSection title="Contact">
        <p>
          Pour toute question sur ces conditions :{" "}
          <a href={`mailto:${site.email}`}>{site.email}</a>.
        </p>
      </LegalSection>
    </LegalShell>
  );
}
