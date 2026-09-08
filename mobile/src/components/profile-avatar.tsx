import * as React from 'react';
import { ActivityIndicator, Alert, Image, Linking, Modal, Pressable, Text, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { api } from '@/lib/api';
import { readToken } from '@/lib/storage';
import { Button } from './ui';
import { colors } from '@/theme';

export function ProfileAvatar({ initial, en }: { initial: string; en: boolean }) {
  const [image, setImage] = React.useState<string | null>(null);
  const [preview, setPreview] = React.useState<{ uri: string; base64: string } | null>(null);
  const [busy, setBusy] = React.useState(false);
  const alive = React.useRef(true);
  const acting = React.useRef(false);
  const identity = React.useRef<string | null>(null);
  React.useEffect(() => {
    alive.current = true;
    void (async () => {
      identity.current = await readToken();
      const result = await api.request<{ image: string | null }>('/api/auth/avatar');
      if (alive.current) setImage(result.image);
    })().catch(() => { /* Initials remain usable; photo actions can retry. */ });
    return () => { alive.current = false; identity.current = null; };
  }, []);
  const current = async () => alive.current && identity.current !== null && identity.current === await readToken();
  const failure = () => Alert.alert(en ? 'Photo not saved' : 'Photo non enregistrée', en ? 'Please try again. Your previous photo is unchanged.' : 'Réessayez. Votre photo précédente est conservée.');
  async function choose(camera: boolean) {
    if (acting.current) return;
    acting.current = true;
    setBusy(true);
    try {
      const permission = camera ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(en ? 'Photo access' : 'Accès aux photos', en ? 'Allow access in Settings to select a profile photo.' : 'Autorisez l’accès dans Réglages pour choisir votre photo.', [{ text: en ? 'Cancel' : 'Annuler', style: 'cancel' }, { text: en ? 'Settings' : 'Réglages', onPress: () => void Linking.openSettings() }]);
        return;
      }
      const options: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.8, exif: false };
      const picked = camera ? await ImagePicker.launchCameraAsync(options) : await ImagePicker.launchImageLibraryAsync(options);
      if (picked.canceled || !await current()) return;
      const photo = await ImageManipulator.manipulateAsync(picked.assets[0].uri, [{ resize: { width: 512, height: 512 } }], { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG, base64: true });
      if (await current() && photo.base64) setPreview({ uri: photo.uri, base64: photo.base64 });
    } catch { if (alive.current) failure(); }
    finally { acting.current = false; if (alive.current) setBusy(false); }
  }
  async function save(remove = false) {
    if (acting.current || (!remove && !preview)) return;
    acting.current = true;
    setBusy(true);
    try {
      if (!await current()) return;
      const result = await api.request<{ image: string | null }>('/api/auth/avatar', remove ? { method: 'DELETE' } : { method: 'POST', json: { image: preview!.base64 } });
      if (await current()) { setImage(result.image); setPreview(null); }
    } catch { if (alive.current) failure(); }
    finally { acting.current = false; if (alive.current) setBusy(false); }
  }
  function menu() {
    Alert.alert(en ? 'Profile photo' : 'Photo de profil', undefined, [
      { text: en ? 'Choose a photo' : 'Choisir une photo', onPress: () => void choose(false) },
      { text: en ? 'Take a photo' : 'Prendre une photo', onPress: () => void choose(true) },
      ...(image ? [{ text: en ? 'Remove photo' : 'Supprimer la photo', style: 'destructive' as const, onPress: () => void save(true) }] : []),
      { text: en ? 'Cancel' : 'Annuler', style: 'cancel' },
    ]);
  }
  return <>
    <Pressable accessibilityRole="button" accessibilityLabel={en ? 'Change profile photo' : 'Modifier la photo de profil'} disabled={busy} onPress={menu} style={{ width: 60, height: 60, borderRadius: 20, overflow: 'hidden', backgroundColor: 'rgba(255,255,255,0.18)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.32)', alignItems: 'center', justifyContent: 'center' }}>
      {image ? <Image source={{ uri: image }} style={{ width: 60, height: 60 }} onError={() => setImage(null)} /> : <Text style={{ color: colors.white, fontSize: 24, fontWeight: '700', letterSpacing: -0.5 }}>{initial}</Text>}
      {busy ? <ActivityIndicator color={colors.white} style={{ position: 'absolute' }} /> : null}
    </Pressable>
    <Modal visible={!!preview} transparent animationType="fade" onRequestClose={() => { if (!busy) setPreview(null); }}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 24 }}>
        <View style={{ backgroundColor: colors.canvas, borderRadius: 24, padding: 24, gap: 16 }}>
          {preview ? <Image source={{ uri: preview.uri }} style={{ width: 180, height: 180, borderRadius: 90, alignSelf: 'center' }} /> : null}
          <Button title={en ? 'Save photo' : 'Enregistrer la photo'} loading={busy} disabled={busy} onPress={() => void save()} />
          <Button title={en ? 'Cancel' : 'Annuler'} variant="ghost" disabled={busy} onPress={() => setPreview(null)} />
        </View>
      </View>
    </Modal>
  </>;
}
