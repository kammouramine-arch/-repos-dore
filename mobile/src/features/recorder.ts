import { useCallback, useState } from 'react';
import { Alert, Platform } from 'react-native';
import {
  AudioModule,
  RecordingPresets,
  setAudioModeAsync,
  useAudioRecorder,
  useAudioRecorderState,
} from 'expo-audio';
import * as Haptics from 'expo-haptics';
import { api } from '@/lib/api';
import { DevisiaApiError } from '@devisia/shared';

/**
 * Dictée du chantier.
 *
 * L'audio est enregistré sur l'appareil puis transcrit par le backend. Chaque
 * refus de permission ou indisponibilité du service est annoncé clairement :
 * l'application ne prétend jamais avoir compris ce qu'elle n'a pas transcrit.
 */
export type RecorderStatus = 'inactif' | 'enregistrement' | 'transcription';

export function useVoiceCapture(onTranscript: (text: string) => void) {
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(recorder);
  const [status, setStatus] = useState<RecorderStatus>('inactif');
  const [error, setError] = useState<string | null>(null);

  const start = useCallback(async () => {
    setError(null);
    try {
      const permission = await AudioModule.requestRecordingPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          'Micro non autorisé',
          "Autorisez le micro dans les réglages pour dicter vos chantiers. Vous pouvez aussi écrire la description.",
        );
        return;
      }

      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await recorder.prepareToRecordAsync();
      recorder.record();
      setStatus('enregistrement');
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (cause) {
      console.warn('[dictée] démarrage impossible', cause);
      setError("Le micro n'a pas pu démarrer. Réessayez ou écrivez votre description.");
      setStatus('inactif');
    }
  }, [recorder]);

  const stop = useCallback(async () => {
    if (status !== 'enregistrement') return;
    setStatus('transcription');
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    try {
      await recorder.stop();
      const uri = recorder.uri;
      if (!uri) {
        setError('Enregistrement introuvable.');
        setStatus('inactif');
        return;
      }

      const result = await api.files.transcribe({
        uri,
        name: Platform.OS === 'ios' ? 'chantier.m4a' : 'chantier.m4a',
        type: 'audio/m4a',
      });

      if (result.text.trim()) {
        onTranscript(result.text.trim());
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        setError("Rien n'a été compris. Réessayez en parlant plus près du micro.");
      }
    } catch (cause) {
      setError(
        cause instanceof DevisiaApiError
          ? cause.message
          : "La transcription n'a pas abouti. Vous pouvez écrire votre description.",
      );
    } finally {
      setStatus('inactif');
    }
  }, [onTranscript, recorder, status]);

  const cancel = useCallback(async () => {
    if (status === 'enregistrement') {
      await recorder.stop().catch(() => undefined);
    }
    setStatus('inactif');
    setError(null);
  }, [recorder, status]);

  return {
    status,
    error,
    durationMs: recorderState.durationMillis ?? 0,
    metering: recorderState.metering,
    start,
    stop,
    cancel,
  };
}
