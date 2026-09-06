import type { Metadata } from 'next';
import { LegalPage, LegalSection } from '@/components/marketing/legal';

export const metadata: Metadata = {
  title: 'Politique de confidentialité',
  description: 'Comment DEVISIA collecte, utilise et protège les données de votre entreprise.',
  alternates: { canonical: '/confidentialite' },
};

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Politique de confidentialité"
      updatedAt="18 août 2026"
      intro="Cette page décrit les données traitées par DEVISIA, leur finalité et les droits dont vous disposez. Elle constitue une information générale et ne remplace pas l'analyse d'un conseil juridique pour votre situation particulière."
    >
      <LegalSection title="Responsable de traitement">
        <p>
          Pour toute question relative à vos données ou pour exercer vos droits, contactez
          contact@amyn.agency. L’identité juridique complète de l’éditeur et ses coordonnées
          réglementaires doivent être finalisées avant la commercialisation publique.
        </p>
      </LegalSection>

      <LegalSection title="Données collectées">
        <ul>
          <li>Données de compte : nom, prénom, adresse email, téléphone, empreinte sécurisée du mot de passe.</li>
          <li>
            Données d’entreprise : raison sociale, adresse, SIRET, numéro de TVA, logo, catalogue de
            prix, conditions commerciales.
          </li>
          <li>
            Données commerciales saisies par vous : clients, prospects, chantiers, devis, factures,
            messages et photos de chantier.
          </li>
          <li>
            Données techniques : journaux de connexion, empreinte de l’adresse IP, type de navigateur.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="Finalités et bases légales">
        <ul>
          <li>Fourniture du service (exécution du contrat) : création et envoi de devis, suivi client.</li>
          <li>Sécurité et prévention de la fraude (intérêt légitime) : journalisation, limitation de débit.</li>
          <li>Facturation et obligations comptables (obligation légale).</li>
          <li>Amélioration du produit (intérêt légitime), sur des données d’usage agrégées.</li>
        </ul>
      </LegalSection>

      <LegalSection title="Traitements par intelligence artificielle">
        <p>
          Lorsque vous demandez la préparation d’un devis, la description que vous fournissez, les
          photos associées et un extrait de votre catalogue de prix sont transmis au fournisseur d’IA
          configuré. Les conditions de conservation et de traitement dépendent du fournisseur et
          de l’offre utilisés ; elles doivent être vérifiées avant d’y transmettre des données sensibles.
        </p>
        <ul>
          <li>Les données d’une entreprise ne sont jamais utilisées pour une autre entreprise.</li>
          <li>
            Les règles d’utilisation des données par le fournisseur doivent être documentées pour
            l’offre activée. N’incluez pas de données personnelles inutiles dans vos demandes.
          </li>
          <li>
            Les montants ne sont jamais calculés par le modèle : ils sont produits par le moteur de
            calcul de l’application.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="Sous-traitants">
        <p>
          DEVISIA s’appuie sur des prestataires techniques pour l’hébergement, la base de données,
          l’envoi d’emails, le paiement et l’intelligence artificielle. La liste à jour de ces
          prestataires et de leur localisation est disponible sur demande.
        </p>
      </LegalSection>

      <LegalSection title="Durées de conservation">
        <ul>
          <li>Données de compte : durée liée à la fourniture du service et aux obligations applicables ; calendrier détaillé à finaliser par l’éditeur.</li>
          <li>Documents commerciaux et comptables : conservés conformément aux durées légales applicables.</li>
          <li>Journaux techniques et sauvegardes : règles de conservation et de purge à confirmer auprès des prestataires.</li>
        </ul>
      </LegalSection>

      <LegalSection title="Vos droits">
        <p>
          Vous disposez d’un droit d’accès, de rectification, d’effacement, de limitation, d’opposition
          et de portabilité. Le catalogue dispose d’un export ; pour une demande plus complète ou
          un effacement, contactez contact@amyn.agency. Une vérification d’identité et un examen des
          obligations de conservation sont nécessaires. Vous pouvez introduire une réclamation auprès de la CNIL.
        </p>
      </LegalSection>

      <LegalSection title="Sécurité">
        <ul>
          <li>Mots de passe stockés sous forme de condensats salés.</li>
          <li>Sessions serveur révocables, jetons publics de devis non devinables.</li>
          <li>Isolation stricte des données par organisation, vérifiée côté serveur.</li>
          <li>Fichiers stockés dans un espace privé, accessibles uniquement via des liens contrôlés.</li>
        </ul>
      </LegalSection>
    </LegalPage>
  );
}
