import { useCallback, useRef, useState } from 'react';
import * as ImagePicker from 'expo-image-picker';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as Haptics from 'expo-haptics';
import { DevisiaApiError } from '@devisia/shared';
import { api } from '@/lib/api';

/**
 * Photos de chantier.
 *
 * Le défaut le plus coûteux de la version précédente n'était pas l'envoi qui
 * échouait, mais la façon dont il échouait : la photo disparaissait de la
 * liste et le message « Une photo n'a pas pu être envoyée » ne disait ni
 * pourquoi ni quoi faire. L'artisan reprenait la photo, qui échouait à
 * nouveau, sans jamais apprendre que le problème venait du serveur.
 *
 * Une pièce jointe conserve donc son état, garde le motif réel de l'échec, et
 * peut être renvoyée sans retourner à l'appareil photo.
 */
export type AttachmentStatus = 'envoi' | 'pret' | 'echec';

export interface Attachment {
  /** Identifiant local, stable même après l'envoi. */
  localId: string;
  /** Identifiant serveur, disponible une fois l'envoi réussi. */
  fileId: string | null;
  uri: string;
  name: string;
  mimeType: string;
  width: number | null;
  height: number | null;
  prepared: boolean;
  status: AttachmentStatus;
  error: string | null;
}

const MAX_PHOTOS = 6;
/** Qualité d'export : au-delà, on transporte des mégaoctets sans gagner en lisibilité. */
const QUALITY = 0.6;

/**
 * Côté le plus long après réduction, en points.
 *
 * Une photo d'iPhone fait 4032 × 3024 et pèse de deux à cinq mégaoctets. La
 * plateforme d'hébergement refuse tout corps de requête au-delà de quatre
 * mégaoctets et demi : l'envoi échouait donc une fois sur deux, et le reste du
 * temps dépassait le délai en 4G. Aucun de ces mégaoctets ne sert : ni
 * l'artisan qui relit son devis, ni le modèle qui décrit le chantier n'ont
 * besoin de douze mégapixels. Mille six cents points suffisent, pour environ
 * trois cents kilooctets.
 */
const COTE_MAX = 1600;
/** Compression appliquée après réduction. */
const QUALITE_ENVOI = 0.7;

/**
 * Réduit et normalise une photo avant l'envoi.
 *
 * Deux effets, tous deux nécessaires sur iPhone : le poids retombe très en
 * dessous de la limite de la plateforme, et le format HEIC des photos iOS
 * devient un JPEG que tout le monde sait lire — serveur, PDF, modèle de
 * vision. Si la conversion échoue, la photo reste visible et renvoyable ;
 * aucun original potentiellement trop lourd n'est envoyé silencieusement.
 */
async function preparerPourEnvoi(photo: Attachment): Promise<{
  uri: string;
  name: string;
  mimeType: string;
}> {
  if (photo.prepared) {
    return { uri: photo.uri, name: photo.name, mimeType: photo.mimeType };
  }

  const contexte = ImageManipulator.manipulate(photo.uri);
  let rendu: Awaited<ReturnType<typeof contexte.renderAsync>> | undefined;
  try {
    const largeur = photo.width ?? 0;
    const hauteur = photo.height ?? 0;
    const coteLong = Math.max(largeur, hauteur);
    // Ne jamais agrandir une petite image. Pour une photo portrait, limiter
    // la largeur laisserait encore plus de 2 000 px en hauteur : c'était du
    // poids inutile sur le réseau mobile.
    if (coteLong > COTE_MAX) {
      contexte.resize(hauteur > largeur ? { height: COTE_MAX } : { width: COTE_MAX });
    }
    rendu = await contexte.renderAsync();
    const image = await rendu.saveAsync({ format: SaveFormat.JPEG, compress: QUALITE_ENVOI });
    return {
      uri: image.uri,
      name: `${photo.localId}.jpg`,
      mimeType: 'image/jpeg',
    };
  } catch {
    throw new DevisiaApiError({
      code: 'VALIDATION',
      message: 'La photo n’a pas pu être préparée. Ouvrez-la dans Photos puis sélectionnez-la à nouveau.',
    }, 0);
  } finally {
    rendu?.release();
    contexte.release();
  }
}

function labelFor(cause: unknown): string {
  if (cause instanceof DevisiaApiError) {
    switch (cause.code) {
      case 'VALIDATION':
        return cause.message;
      case 'UNAUTHENTICATED':
        return 'Votre session a expiré. Reconnectez-vous pour joindre la photo.';
      case 'RATE_LIMITED':
        return 'Trop d’envois d’affilée. Patientez quelques secondes.';
      case 'PLAN_LIMIT':
        return cause.message;
      case 'NETWORK':
      case 'TIMEOUT':
        return cause.message;
      default:
        return 'Le serveur n’a pas accepté cette photo. Réessayez dans un instant.';
    }
  }
  return 'Cette photo n’a pas pu être envoyée. Réessayez.';
}

export function usePhotoCapture() {
  const [photos, setPhotos] = useState<Attachment[]>([]);
  const [permissionNotice, setPermissionNotice] = useState<string | null>(null);
  const counter = useRef(0);
  const activeUploads = useRef(new Set<string>());

  const patch = useCallback((localId: string, next: Partial<Attachment>) => {
    setPhotos((current) =>
      current.map((photo) => (photo.localId === localId ? { ...photo, ...next } : photo)),
    );
  }, []);

  const send = useCallback(
    async (photo: Attachment) => {
      if (activeUploads.current.has(photo.localId) || photo.status === 'pret') return;
      activeUploads.current.add(photo.localId);
      patch(photo.localId, { status: 'envoi', error: null });
      try {
        const pret = await preparerPourEnvoi(photo);
        // La vignette bascule tout de suite sur le JPEG réduit. Une nouvelle
        // tentative réutilise ce fichier léger au lieu de reconvertir l'HEIC
        // de plusieurs mégaoctets.
        patch(photo.localId, {
          uri: pret.uri,
          name: pret.name,
          mimeType: pret.mimeType,
          prepared: true,
          status: 'envoi',
        });
        const uploaded = await api.files.upload(
          { uri: pret.uri, name: pret.name, type: pret.mimeType },
          'PHOTO_CHANTIER',
        );
        patch(photo.localId, { status: 'pret', fileId: uploaded.id, error: null });
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch (cause) {
        // La pièce jointe reste dans la liste : elle est renvoyable, et la
        // vignette prouve à l'artisan que sa photo n'est pas perdue.
        patch(photo.localId, { status: 'echec', error: labelFor(cause) });
      } finally {
        activeUploads.current.delete(photo.localId);
      }
    },
    [patch],
  );

  const attach = useCallback(
    async (assets: ImagePicker.ImagePickerAsset[]) => {
      const room = MAX_PHOTOS - photos.length;
      for (const asset of assets.slice(0, Math.max(0, room))) {
        counter.current += 1;
        const localId = `photo-${Date.now()}-${counter.current}`;
        const photo: Attachment = {
          localId,
          fileId: null,
          uri: asset.uri,
          name: asset.fileName ?? `chantier-${counter.current}.jpg`,
          mimeType: asset.mimeType ?? 'image/jpeg',
          width: asset.width ?? null,
          height: asset.height ?? null,
          prepared: false,
          status: 'envoi',
          error: null,
        };
        setPhotos((current) => [...current, photo]);
        await send(photo);
      }
    },
    [photos.length, send],
  );

  const takePhoto = useCallback(async () => {
    setPermissionNotice(null);
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      setPermissionNotice(
        'L’appareil photo n’est pas autorisé. Activez-le dans Réglages pour joindre des photos.',
      );
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ quality: QUALITY, mediaTypes: ['images'] });
    if (!result.canceled) await attach(result.assets);
  }, [attach]);

  const pickPhotos = useCallback(async () => {
    setPermissionNotice(null);
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setPermissionNotice('La photothèque n’est pas autorisée. Activez-la dans Réglages.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      quality: QUALITY,
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: MAX_PHOTOS - photos.length,
    });
    if (!result.canceled) await attach(result.assets);
  }, [attach, photos.length]);

  const retry = useCallback(
    (localId: string) => {
      const photo = photos.find((item) => item.localId === localId);
      if (photo) void send(photo);
    },
    [photos, send],
  );

  const remove = useCallback((localId: string) => {
    setPhotos((current) => current.filter((photo) => photo.localId !== localId));
  }, []);

  return {
    photos,
    permissionNotice,
    dismissNotice: () => setPermissionNotice(null),
    canAdd: photos.length < MAX_PHOTOS,
    remaining: MAX_PHOTOS - photos.length,
    takePhoto,
    pickPhotos,
    retry,
    remove,
    /** Envois encore en cours : la génération doit les attendre. */
    uploading: photos.some((photo) => photo.status === 'envoi'),
    failed: photos.filter((photo) => photo.status === 'echec'),
    fileIds: photos
      .filter((photo) => photo.status === 'pret' && photo.fileId)
      .map((photo) => photo.fileId as string),
  };
}
