import { useCallback, useState } from 'react';
import {
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioRecorder,
} from 'expo-audio';
import { LimitError, transcribe } from '@/services/ai';
import { AppError } from '@/lib/errors';

export type VoiceState = 'idle' | 'recording' | 'transcribing' | 'unavailable';

/**
 * Hold-to-talk capture. Recording happens on device; the audio is sent to our own
 * endpoint for transcription. If the server has no transcription provider configured,
 * the hook reports it plainly and the button is disabled — nothing is faked.
 */
export function useVoice() {
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const [state, setState] = useState<VoiceState>('idle');
  const [error, setError] = useState<string | null>(null);
  const [startedAt, setStartedAt] = useState<number | null>(null);

  const start = useCallback(async () => {
    setError(null);
    try {
      const permission = await requestRecordingPermissionsAsync();
      if (!permission.granted) {
        setError('Microphone access is off. You can turn it on in system settings.');
        return false;
      }
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await recorder.prepareToRecordAsync();
      recorder.record();
      setStartedAt(Date.now());
      setState('recording');
      return true;
    } catch {
      setError('Could not start recording.');
      setState('idle');
      return false;
    }
  }, [recorder]);

  /** Stops recording and returns the transcript, or null if it could not be produced. */
  const stop = useCallback(async (): Promise<string | null> => {
    if (state !== 'recording') return null;
    setState('transcribing');
    try {
      await recorder.stop();
      const uri = recorder.uri;
      const seconds = startedAt ? (Date.now() - startedAt) / 1000 : 0;
      setStartedAt(null);
      if (!uri) {
        setError('The recording was empty.');
        setState('idle');
        return null;
      }
      const text = await transcribe(uri, seconds);
      if (text === null) {
        setError('Voice input is not configured on this server yet.');
        setState('unavailable');
        return null;
      }
      setState('idle');
      return text;
    } catch (e) {
      // A spent voice allowance is a plan message, not a failure of the microphone.
      if (e instanceof LimitError) setError(e.message);
      else setError(e instanceof AppError ? e.message : 'Could not transcribe that.');
      setState('idle');
      return null;
    }
  }, [recorder, startedAt, state]);

  const cancel = useCallback(async () => {
    if (state === 'recording') {
      try {
        await recorder.stop();
      } catch {
        /* already stopped */
      }
    }
    setState('idle');
  }, [recorder, state]);

  return { state, error, start, stop, cancel, clearError: () => setError(null) };
}
