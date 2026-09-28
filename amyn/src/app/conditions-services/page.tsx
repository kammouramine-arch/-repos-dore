import Link from "next/link";
import { LegalSection, LegalShell, ToComplete } from "@/components/legal/LegalShell";
import { TERMS_LABELS, legalComplete, missingTerms, terms } from "@/lib/legal";
import { pageMetadata } from "@/lib/seo";
import { site } from "@/lib/site";

export const metadata = pageMetadata({
  title: "Conditions des services",
  description:
    "Le cadre des prestations AMYN : devis préalable, premier aperçu sans engagement, contenus, services tiers et limites de nos engagements.",
  path: "/conditions-services",
  noindex: !legalComplete() || missingTerms().length > 0,
});

/**
 * Conditions des services.
 *
 * Seul ce qui décrit le fonctionnement réel d'AMYN est rédigé ici. Tout ce
 * qui relève d'un choix contractuel (paiement, cession des droits,
 * responsabilité, résiliation, droit applicable) reste en emplacement tant
 * que l'éditeur ne l'a pas fixé — idéalement avec un conseil juridique.
 */
export default function TermsPage() {
  const clause = (key: keyof typeof terms) =>
    terms[key] ? <p>{terms[key]}</p> : <p><ToComplete label={TERMS_LABELS[key]} /></p>;

  return (
    <LegalShell
      title="Conditions des services"
      path="/conditions-services"
      intro="Le cadre dans lequel AMYN réalise ses prestations. Chaque projet fait en outre l'objet d'un devis, qui prévaut sur les présentes conditions pour ce qu'il précise."
    >
      <LegalSection title="Champ d'application">
        <p>
          Ces conditions s&apos;appliquent aux prestations proposées par AMYN aux
          professionnels : création et refonte de sites, outils de suivi, applications
          mobiles, réservation en ligne, amélioration de fiches d&apos;établissement,
          parcours d&apos;accueil client, portfolio et contenus.
        </p>
      </LegalSection>

      <LegalSection title="Devis préalable">
        <p>
          Chaque projet est chiffré sur devis. Le devis précise le périmètre, les
          livrables, le calendrier, le prix et ce qui est attendu du client. Aucun
          travail facturable ne commence avant l&apos;acceptation écrite du devis.
        </p>
        <p>
          Tout ajout ou modification de périmètre en cours de projet fait l&apos;objet
          d&apos;un accord préalable, et si nécessaire d&apos;un devis complémentaire.
        </p>
      </LegalSection>

      <LegalSection title="Premier aperçu">
        <p>
          Le <Link href="/premier-apercu">premier aperçu</Link> est proposé sans
          engagement. Il n&apos;entraîne aucune obligation d&apos;achat. AMYN apprécie
          librement si un projet s&apos;y prête et choisit le format le plus utile
          (direction visuelle, courte analyse, recommandation…). Il ne constitue ni un
          site, ni une application, ni un outil réalisé gratuitement.
        </p>
      </LegalSection>

      <LegalSection title="Contenus fournis par le client">
        <p>
          AMYN n&apos;utilise que les textes, photos, marques et documents que le client
          déclare être autorisé à utiliser — notamment l&apos;accord des personnes ou
          des clients identifiables sur les photos de réalisations.
        </p>
      </LegalSection>

      <LegalSection title="Services tiers">
        <p>
          Certaines prestations reposent sur des services tiers (hébergement, noms de
          domaine, outils de réservation, envoi d&apos;e-mails, App Store, Google Play,
          Google Business Profile). Ces services restent soumis à leurs propres
          conditions et à leurs décisions, que AMYN ne contrôle pas.
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

      <LegalSection title="Paiement">{clause("payment")}</LegalSection>
      <LegalSection title="Propriété intellectuelle">
        <p>
          Les conditions de propriété et de cession des droits sur les livrables sont
          précisées dans chaque devis.
        </p>
        {clause("intellectualProperty")}
      </LegalSection>
      <LegalSection title="Responsabilité">{clause("liability")}</LegalSection>
      <LegalSection title="Suspension et résiliation">{clause("termination")}</LegalSection>
      <LegalSection title="Droit applicable">{clause("law")}</LegalSection>

      <LegalSection title="Contact">
        <p>
          Pour toute question sur ces conditions :{" "}
          <a href={`mailto:${site.email}`}>{site.email}</a>.
        </p>
      </LegalSection>
    </LegalShell>
  );
}
