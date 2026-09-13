import type { Metadata } from 'next';
import { LegalPage, LegalSection } from '@/components/marketing/legal';

export const metadata: Metadata = {
  title: 'Politique de confidentialité',
  description: 'Comment DEVISERA collecte, utilise et protège les données de votre entreprise.',
  alternates: { canonical: '/confidentialite' },
};

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Politique de confidentialité"
      updatedAt="13 septembre 2026"
      intro="Cette page décrit les données traitées par DEVISERA, leur finalité et les droits dont vous disposez. Elle constitue une information générale et ne remplace pas l'analyse d'un conseil juridique pour votre situation particulière."
    >
      <LegalSection title="Responsable de traitement">
        <p>
          Pour toute question relative à vos données ou pour exercer vos droits, contactez
          contact@devisera.fr. L’identité juridique complète de l’éditeur et ses coordonnées
          réglementaires doivent être finalisées avant la commercialisation publique.
        </p>
      </LegalSection>

      <LegalSection title="Données collectées">
        <ul>
          <li>Données de compte : nom, prénom, adresse email, téléphone, empreinte sécurisée du mot de passe.</li>
          <li>Photo de profil facultative : choisie ou prise avec votre autorisation, redimensionnée et associée à votre compte. Vous pouvez la remplacer ou la supprimer.</li>
          <li>Données d’abonnement : formule, état et échéance transmis par le prestataire de paiement, identifiants de transaction nécessaires à la vérification et à la prévention des réutilisations frauduleuses. Les identifiants Apple et mots de passe de paiement ne sont pas collectés par DEVISERA.</li>
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

      <LegalSection title="Traitements par intelligence artificielle et consentement">
        <p>
          Certaines fonctions de DEVISERA font appel à un fournisseur d’intelligence artificielle
          tiers : la préparation d’un projet de devis à partir de votre description (saisie ou dictée),
          l’analyse des photos de chantier que vous joignez, la rédaction d’un message de relance et
          l’assistant du tableau de bord. La dictée vocale dans l’application iOS s’exécute sur votre
          appareil : aucun enregistrement audio n’est transmis, seul le texte obtenu l’est.
        </p>
        <p>
          <strong>Fournisseur :</strong> Google LLC, via le service Gemini API
          (generativelanguage.googleapis.com). Les données sont traitées par Google conformément aux
          conditions d’utilisation de l’API Gemini applicables aux services payants ; elles ne sont
          pas utilisées par Google pour entraîner ses modèles. Si DEVISERA venait à utiliser un autre
          fournisseur (par exemple Anthropic, service Claude API, intégré mais non activé à ce jour),
          cette politique et le texte de consentement seraient mis à jour et votre autorisation vous
          serait demandée à nouveau avant tout envoi.
        </p>
        <p>
          <strong>Données transmises au fournisseur, uniquement lorsque vous déclenchez la fonction :</strong>
        </p>
        <ul>
          <li>La description du chantier que vous rédigez ou dictez, et les photos que vous joignez à la demande (au plus six).</li>
          <li>
            Le contexte de votre entreprise nécessaire pour adapter le devis : métier, taux horaire,
            taux de TVA, conditions habituelles, devise, pays, langue et un extrait de votre catalogue
            de prix (désignations, références, unités et prix).
          </li>
          <li>
            Pour une relance : le nom du client, la raison sociale de votre entreprise, le numéro,
            l’objet et le montant du devis, s’il a été consulté, et la réponse éventuelle du client.
          </li>
          <li>
            Pour l’assistant : votre question et des chiffres agrégés de votre activité (devis envoyés,
            montants, devis en attente) accompagnés des numéros, objets et noms de clients des devis
            concernés.
          </li>
        </ul>
        <p>
          Ne sont jamais transmis au fournisseur : vos identifiants, votre mot de passe, vos données de
          paiement, les coordonnées complètes de vos clients (adresse, email, téléphone), ni vos
          documents PDF.
        </p>
        <p>
          <strong>Finalité :</strong> traiter votre demande et produire le projet de devis, l’analyse,
          le message ou la réponse demandés. Les montants ne sont jamais calculés par le modèle : ils
          sont produits par le moteur de calcul de l’application. Les données d’une entreprise ne sont
          jamais utilisées pour une autre. DEVISERA n’utilise pas ces données pour entraîner des modèles.
        </p>
        <p>
          <strong>Consentement :</strong> aucune donnée n’est envoyée au fournisseur avant que vous
          ayez lu et accepté, dans l’application, un écran indiquant ce qui est transmis, à qui et
          pourquoi. Votre décision (autorisation ou refus), la version du texte accepté et sa date sont
          enregistrées pour votre compte dans votre entreprise. Sans autorisation, les fonctions
          assistées par IA restent inactives ; le reste de l’application fonctionne normalement.
        </p>
        <p>
          <strong>Retrait :</strong> vous pouvez retirer votre autorisation à tout moment dans
          l’application (Mon espace → Confidentialité et IA) ou sur le web (Paramètres → Intelligence
          artificielle). Dès le retrait, plus aucune donnée n’est transmise au fournisseur ; la
          prochaine utilisation d’une fonction assistée vous redemandera votre accord.
        </p>
        <p>
          <strong>Conservation et suppression :</strong> DEVISERA conserve la description, les photos et
          le projet de devis dans votre compte, comme les autres données commerciales, et un journal
          technique de chaque requête (fournisseur, modèle, durée, volume de jetons) sans son contenu.
          Google conserve les requêtes le temps de leur traitement et, pour la détection des abus,
          selon les durées prévues par ses conditions d’utilisation de l’API Gemini. Vous pouvez
          demander l’effacement de vos données transmises en écrivant à contact@devisera.fr ; DEVISERA
          relaie la demande au fournisseur lorsque celui-ci offre ce mécanisme.
        </p>
        <p>
          <strong>Protection équivalente :</strong> le fournisseur est soumis à des obligations
          contractuelles de confidentialité et de sécurité au moins équivalentes à celles que DEVISERA
          applique, et ne peut utiliser ces données que pour exécuter la demande.
        </p>
      </LegalSection>

      <LegalSection title="Sous-traitants">
        <p>
          DEVISERA s’appuie sur des prestataires techniques : Vercel (hébergement de l’application),
          Supabase (base de données et stockage des fichiers), Resend (envoi des emails), Apple
          (abonnements sur iOS) et Google LLC (intelligence artificielle, service Gemini API). Leur
          localisation et leurs garanties de transfert sont disponibles sur demande à
          contact@devisera.fr.
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
          et de portabilité. L’application propose un export des données du compte et une suppression
          du compte, avec vérification du mot de passe. La suppression révoque l’accès et retire la
          photo de profil ; elle ne résilie pas automatiquement un abonnement Apple. Les documents
          commerciaux de l’entreprise sont archivés, et non automatiquement effacés. Pour leur
          effacement ou une demande plus complète, contactez contact@devisera.fr. Une vérification d’identité et un examen des
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
