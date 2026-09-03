import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { DevisiaApiError } from '@devisia/shared';
import { API_URL } from '@/lib/api';
import { readToken } from '@/lib/storage';

/**
 * Ouverture du PDF d'un devis.
 *
 * L'écran ouvrait jusqu'ici la page web publique du devis dans un navigateur,
 * sous un bouton nommé « PDF ». Deux conséquences : ce n'était pas un PDF, et
 * la page refuse les brouillons — un devis non encore envoyé menait donc à une
 * page « 404 », constaté sur iPhone.
 *
 * Le vrai document vient de `/api/quotes/<id>/pdf`, route authentifiée qui rend
 * des octets `application/pdf`. On l'écrit dans le cache puis on le confie à
 * iOS : la feuille de partage native offre l'aperçu Quick Look, l'envoi et
 * l'enregistrement dans Fichiers.
 */
export interface PdfOuvert {
  uri: string;
  nomFichier: string;
}

/** Nom de fichier lisible par un humain, sûr pour un système de fichiers. */
export function nomFichierDevis(numero: string): string {
  const propre = numero.replace(/[^A-Za-z0-9._-]+/g, '-').replace(/^-+|-+$/g, '');
  return `Devis-${propre || 'DEVISIA'}.pdf`;
}

export async function telechargerPdf(quoteId: string, numero: string): Promise<PdfOuvert> {
  const token = await readToken();
  if (!token) {
    throw new DevisiaApiError(
      { code: 'UNAUTHENTICATED', message: 'Votre session a expiré. Reconnectez-vous.' },
      401,
    );
  }

  const nomFichier = nomFichierDevis(numero);
  // Le cache, pas le dossier de documents : un PDF régénéré à chaque ouverture
  // n'a pas à survivre à une purge système.
  const destination = new File(Paths.cache, nomFichier);
  if (destination.exists) destination.delete();

  const fichier = await File.downloadFileAsync(
    `${API_URL}/api/quotes/${quoteId}/pdf`,
    destination,
    { headers: { Authorization: `Bearer ${token}` } },
  );

  return { uri: fichier.uri, nomFichier };
}

/**
 * Présente le PDF avec les gestes du système.
 *
 * `Sharing` ouvre la feuille iOS : aperçu, envoi par mail ou message,
 * enregistrement dans Fichiers, impression. C'est le comportement qu'un
 * artisan attend d'un document sur iPhone — et rien n'imite un lecteur PDF.
 */
export async function ouvrirPdfDevis(quoteId: string, numero: string): Promise<void> {
  const { uri, nomFichier } = await telechargerPdf(quoteId, numero);

  if (!(await Sharing.isAvailableAsync())) {
    throw new DevisiaApiError(
      { code: 'INTERNAL', message: 'Le partage de documents n’est pas disponible sur cet appareil.' },
      500,
    );
  }

  await Sharing.shareAsync(uri, {
    mimeType: 'application/pdf',
    // L'identifiant de type uniforme dit à iOS d'ouvrir l'aperçu Quick Look
    // plutôt que de traiter le fichier comme un binaire quelconque.
    UTI: 'com.adobe.pdf',
    dialogTitle: nomFichier,
  });
}
