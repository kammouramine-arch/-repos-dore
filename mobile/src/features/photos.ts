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
 * vision. En cas d'échec de la conversion, on envoie l'original plutôt que de
 * perdre la photo : le serveur tranchera.
 */
async function preparerPourEnvoi(photo: Attachment): Promise<{
  uri: string;
  name: string;
  mimeType: string;
}> {
  try {
    const contexte = ImageManipulator.manipulate(photo.uri);
    contexte.resize({ width: COTE_MAX });
    const rendu = await contexte.renderAsync();
    const image = await rendu.saveAsync({ format: SaveFormat.JPEG, compress: QUALITE_ENVOI });
    return {
      uri: image.uri,
      name: photo.name.replace(/\.(heic|heif|png|webp)$/i, '.jpg'),
      mimeType: 'image/jpeg',
    };
  } catch (cause) {
    console.warn('[photo] réduction impossible, envoi de l’original :', cause);
    return { uri: photo.uri, name: photo.name, mimeType: photo.mimeType };
  }
}

function labelFor(cause: unknown): string {
  if (cause instanceof DevisiaApiError) {
    switch (cause.code) {
      case 'VALIDATION':
        return 'Cette image est trop lourde ou dans un format non pris en charge.';
      case 'UNAUTHENTICATED':
        return 'Votre session a expiré. Reconnectez-vous pour joindre la photo.';
      case 'RATE_LIMITED':
        return 'Trop d’envois d’affilée. Patientez quelques secondes.';
      case 'PLAN_LIMIT':
        return cause.message;
      case 'NETWORK':
      case 'TIMEOUT':
        return 'L’envoi n’a pas abouti. Vérifiez votre connexion, puis renvoyez la photo.';
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

  const patch = useCallback((localId: string, next: Partial<Attachment>) => {
    setPhotos((current) =>
      current.map((photo) => (photo.localId === localId ? { ...photo, ...next } : photo)),
    );
  }, []);

  const send = useCallback(
    async (photo: Attachment) => {
      patch(photo.localId, { status: 'envoi', error: null });
      try {
        const pret = await preparerPourEnvoi(photo);
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
