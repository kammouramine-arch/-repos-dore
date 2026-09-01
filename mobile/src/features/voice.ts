import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
  supportsOnDeviceRecognition,
} from '@jamsch/expo-speech-recognition';

/**
 * Dictée du chantier, transcrite par l'iPhone lui-même.
 *
 * La version précédente enregistrait un fichier audio puis l'envoyait à une API
 * de transcription. Sur le terrain, cela cumulait trois défauts : rien ne
 * s'affichait pendant que l'artisan parlait, l'envoi échouait dès que le réseau
 * faiblissait — et surtout le service n'était pas configuré, si bien que la
 * fonctionnalité centrale du produit répondait une erreur à chaque tentative.
 *
 * La reconnaissance native supprime l'aller-retour : le texte apparaît pendant
 * qu'on parle, sans réseau sur les appareils récents, et sans coût par minute.
 */
export type DictationStatus = 'inactif' | 'demande' | 'ecoute' | 'traitement';

export interface Dictation {
  status: DictationStatus;
  /** Texte reconnu jusqu'ici, encore susceptible d'être corrigé. */
  partial: string;
  error: string | null;
  elapsedMs: number;
  /** Faux sur les plateformes sans reconnaissance vocale (web de développement). */
  supported: boolean;
  /** Vrai quand la transcription se fait sans réseau. */
  onDevice: boolean;
  start: () => Promise<void>;
  stop: () => void;
  cancel: () => void;
  dismissError: () => void;
}

const LOCALE = 'fr-FR';

/** Traduit les codes du moteur en phrases utiles à un artisan. */
function describe(code: string): string {
  switch (code) {
    case 'not-allowed':
    case 'service-not-allowed':
      return 'Le micro n’est pas autorisé. Activez-le dans Réglages, ou écrivez la description.';
    case 'no-speech':
      return 'Je n’ai rien entendu. Rapprochez le téléphone et réessayez.';
    case 'audio-capture':
      return 'Le micro est occupé par une autre application.';
    case 'network':
      return 'La reconnaissance vocale a besoin du réseau sur cet appareil.';
    case 'language-not-supported':
      return 'Le français n’est pas installé pour la dictée sur cet appareil.';
    default:
      return 'La dictée s’est interrompue. Réessayez, ou écrivez la description.';
  }
}

export function useDictation(onTranscript: (text: string) => void): Dictation {
  const [status, setStatus] = useState<DictationStatus>('inactif');
  const [partial, setPartial] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [elapsedMs, setElapsedMs] = useState(0);

  // La reconnaissance n'existe pas sur le web de développement : l'écran doit
  // alors proposer la saisie sans laisser croire à un bouton mort.
  const supported = Platform.OS === 'ios' || Platform.OS === 'android';
  const onDevice = supported && supportsOnDeviceRecognition();

  // Le dernier texte reconnu est conservé hors du rendu : l'événement `end`
  // arrive après le démontage possible du composant, et doit rester fiable.
  const latest = useRef('');
  const startedAt = useRef(0);
  const cancelled = useRef(false);

  useSpeechRecognitionEvent('result', (event) => {
    const text = event.results?.[0]?.transcript ?? '';
    latest.current = text;
    setPartial(text);
  });

  useSpeechRecognitionEvent('error', (event) => {
    // `no-speech` après un arrêt volontaire n'est pas une erreur à montrer.
    if (cancelled.current || (event.error === 'no-speech' && latest.current.trim())) return;
    setError(describe(String(event.error)));
    setStatus('inactif');
  });

  useSpeechRecognitionEvent('end', () => {
    const text = latest.current.trim();
    latest.current = '';
    setPartial('');
    setStatus('inactif');
    if (cancelled.current) {
      cancelled.current = false;
      return;
    }
    if (text) {
      onTranscript(text);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  });

  // Compteur de durée : sans repère visible, on ne sait pas si l'application écoute.
  useEffect(() => {
    if (status !== 'ecoute') return undefined;
    const timer = setInterval(() => setElapsedMs(Date.now() - startedAt.current), 200);
    return () => clearInterval(timer);
  }, [status]);

  const start = useCallback(async () => {
    if (!supported) {
      setError('La dictée n’est pas disponible ici. Écrivez la description.');
      return;
    }
    setError(null);
    setStatus('demande');

    try {
      const permission = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
      if (!permission.granted) {
        setStatus('inactif');
        setError('Le micro n’est pas autorisé. Activez-le dans Réglages, ou écrivez la description.');
        return;
      }

      latest.current = '';
      cancelled.current = false;
      startedAt.current = Date.now();
      setElapsedMs(0);
      setPartial('');

      ExpoSpeechRecognitionModule.start({
        lang: LOCALE,
        // Le texte s'affiche pendant que l'artisan parle : c'est ce qui donne
        // la certitude d'être entendu.
        interimResults: true,
        // Une description de chantier comporte des silences ; sans cela le
        // moteur coupe à la première pause.
        continuous: true,
        requiresOnDeviceRecognition: false,
        addsPunctuation: true,
      });

      setStatus('ecoute');
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {
      setStatus('inactif');
      setError('La dictée n’a pas pu démarrer. Réessayez, ou écrivez la description.');
    }
  }, [supported]);

  const stop = useCallback(() => {
    if (status !== 'ecoute') return;
    setStatus('traitement');
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    ExpoSpeechRecognitionModule.stop();
  }, [status]);

  const cancel = useCallback(() => {
    if (status === 'inactif') return;
    cancelled.current = true;
    setStatus('inactif');
    setPartial('');
    ExpoSpeechRecognitionModule.abort();
  }, [status]);

  // Quitter l'écran en pleine dictée ne doit pas laisser le micro ouvert.
  useEffect(
    () => () => {
      cancelled.current = true;
      ExpoSpeechRecognitionModule.abort();
    },
    [],
  );

  return {
    status,
    partial,
    error,
    elapsedMs,
    supported,
    onDevice,
    start,
    stop,
    cancel,
    dismissError: () => setError(null),
  };
}
