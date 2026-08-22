import { useCallback, useState } from 'react';
import { Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { api } from '@/lib/api';

/**
 * Photos de chantier.
 * Compression avant envoi : sur un chantier, le réseau est souvent médiocre.
 */
export interface AttachedPhoto {
  id: string;
  uri: string;
  url: string;
  uploading: boolean;
}

const MAX_PHOTOS = 6;

export function usePhotoCapture() {
  const [photos, setPhotos] = useState<AttachedPhoto[]>([]);
  const [error, setError] = useState<string | null>(null);

  const upload = useCallback(async (assets: ImagePicker.ImagePickerAsset[]) => {
    const room = MAX_PHOTOS - photos.length;
    const selection = assets.slice(0, Math.max(0, room));

    for (const asset of selection) {
      const localId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      setPhotos((current) => [
        ...current,
        { id: localId, uri: asset.uri, url: '', uploading: true },
      ]);

      try {
        const uploaded = await api.files.upload({
          uri: asset.uri,
          name: asset.fileName ?? `chantier-${localId}.jpg`,
          type: asset.mimeType ?? 'image/jpeg',
        });
        setPhotos((current) =>
          current.map((photo) =>
            photo.id === localId
              ? { id: uploaded.id, uri: asset.uri, url: uploaded.url, uploading: false }
              : photo,
          ),
        );
      } catch {
        setPhotos((current) => current.filter((photo) => photo.id !== localId));
        setError("Une photo n'a pas pu être envoyée.");
      }
    }
  }, [photos.length]);

  const takePhoto = useCallback(async () => {
    setError(null);
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(
        'Appareil photo non autorisé',
        "Autorisez l'appareil photo dans les réglages pour joindre des photos de chantier.",
      );
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      quality: 0.7,
      mediaTypes: ['images'],
    });
    if (!result.canceled) await upload(result.assets);
  }, [upload]);

  const pickPhotos = useCallback(async () => {
    setError(null);
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Photos non autorisées', 'Autorisez la photothèque pour joindre vos images.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      quality: 0.7,
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: MAX_PHOTOS - photos.length,
    });
    if (!result.canceled) await upload(result.assets);
  }, [photos.length, upload]);

  const remove = useCallback((id: string) => {
    setPhotos((current) => current.filter((photo) => photo.id !== id));
  }, []);

  return {
    photos,
    error,
    canAdd: photos.length < MAX_PHOTOS,
    takePhoto,
    pickPhotos,
    remove,
    fileIds: photos.filter((photo) => !photo.uploading).map((photo) => photo.id),
  };
}
