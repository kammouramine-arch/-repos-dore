'use client';

import * as React from 'react';
import { Camera, Loader2, Mic, Square, Sparkles, Type, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/field';
import { Alert } from '@/components/ui/feedback';
import { useToast } from '@/components/ui/toast';
import { cn } from '@/lib/utils';

/**
 * Écran de capture : voix, photos ou texte.
 *
 * La dictée utilise la reconnaissance vocale du navigateur quand elle est
 * disponible (instantanée, sans envoi de fichier). Sinon l'audio est enregistré
 * puis transcrit côté serveur si un fournisseur est configuré.
 */

interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
}

const STEPS = [
  'Analyse du chantier',
  'Lecture des photos',
  'Recherche dans votre catalogue',
  'Préparation du devis',
  'Calcul des montants',
];

export interface UploadedPhoto {
  id: string;
  url: string;
  fileName: string;
}

export function QuoteCapture({
  onGenerated,
  transcriptionAvailable,
  visionAvailable,
}: {
  onGenerated: (payload: { description: string; fileIds: string[] }) => Promise<void>;
  transcriptionAvailable: boolean;
  visionAvailable: boolean;
}) {
  const { toast } = useToast();
  const [description, setDescription] = React.useState('');
  const [photos, setPhotos] = React.useState<UploadedPhoto[]>([]);
  const [listening, setListening] = React.useState(false);
  const [recording, setRecording] = React.useState(false);
  const [uploading, setUploading] = React.useState(false);
  const [generating, setGenerating] = React.useState(false);
  const [step, setStep] = React.useState(0);
  const [error, setError] = React.useState<string | null>(null);

  const recognitionRef = React.useRef<SpeechRecognitionLike | null>(null);
  const recorderRef = React.useRef<MediaRecorder | null>(null);
  const chunksRef = React.useRef<Blob[]>([]);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const baseTextRef = React.useRef('');

  const speechSupported = React.useMemo(() => {
    if (typeof window === 'undefined') return false;
    return 'SpeechRecognition' in window || 'webkitSpeechRecognition' in window;
  }, []);

  React.useEffect(() => {
    if (!generating) return;
    const timer = setInterval(() => {
      setStep((current) => Math.min(current + 1, STEPS.length - 1));
    }, 1100);
    return () => clearInterval(timer);
  }, [generating]);

  function startSpeech() {
    const Recognition =
      (window as unknown as { SpeechRecognition?: new () => SpeechRecognitionLike })
        .SpeechRecognition ??
      (window as unknown as { webkitSpeechRecognition?: new () => SpeechRecognitionLike })
        .webkitSpeechRecognition;
    if (!Recognition) return;

    const recognition = new Recognition();
    recognition.lang = 'fr-FR';
    recognition.continuous = true;
    recognition.interimResults = true;
    baseTextRef.current = description ? `${description.trim()} ` : '';

    recognition.onresult = (event) => {
      let transcript = '';
      for (let i = 0; i < event.results.length; i += 1) {
        transcript += event.results[i]?.[0]?.transcript ?? '';
      }
      setDescription(`${baseTextRef.current}${transcript}`.slice(0, 8000));
    };
    recognition.onerror = () => {
      setListening(false);
      setError("La dictée s'est interrompue. Vous pouvez continuer en écrivant.");
    };
    recognition.onend = () => setListening(false);

    recognitionRef.current = recognition;
    recognition.start();
    setListening(true);
    setError(null);
  }

  function stopSpeech() {
    recognitionRef.current?.stop();
    setListening(false);
  }

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };
      recorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' });
        await transcribe(blob);
      };
      recorder.start();
      recorderRef.current = recorder;
      setRecording(true);
      setError(null);
    } catch {
      setError("Micro indisponible. Autorisez l'accès au micro ou saisissez votre description.");
    }
  }

  function stopRecording() {
    recorderRef.current?.stop();
    setRecording(false);
  }

  async function transcribe(blob: Blob) {
    const form = new FormData();
    form.append('audio', blob, 'chantier.webm');
    try {
      const response = await fetch('/api/ai/transcribe', { method: 'POST', body: form });
      const payload = (await response.json()) as
        | { data: { text: string } }
        | { error: { message: string } };
      if (!response.ok || 'error' in payload) {
        setError('error' in payload ? payload.error.message : 'Transcription impossible.');
        return;
      }
      setDescription((current) => `${current ? `${current.trim()} ` : ''}${payload.data.text}`.slice(0, 8000));
    } catch {
      setError('Transcription impossible pour le moment.');
    }
  }

  async function uploadPhotos(files: FileList) {
    setUploading(true);
    setError(null);
    const uploaded: UploadedPhoto[] = [];

    for (const file of Array.from(files).slice(0, 6 - photos.length)) {
      const form = new FormData();
      form.append('file', file);
      form.append('kind', 'PHOTO_CHANTIER');
      try {
        const response = await fetch('/api/files', { method: 'POST', body: form });
        const payload = (await response.json()) as
          | { data: { id: string; url: string; fileName: string } }
          | { error: { message: string } };
        if (!response.ok || 'error' in payload) {
          setError('error' in payload ? payload.error.message : 'Envoi de la photo impossible.');
          continue;
        }
        uploaded.push(payload.data);
      } catch {
        setError('Envoi de la photo impossible.');
      }
    }

    setPhotos((current) => [...current, ...uploaded]);
    setUploading(false);
  }

  async function generate() {
    if (description.trim().length < 10) {
      setError('Décrivez le chantier en quelques mots avant de continuer.');
      return;
    }
    setStep(0);
    setGenerating(true);
    setError(null);
    try {
      await onGenerated({ description: description.trim(), fileIds: photos.map((photo) => photo.id) });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Préparation impossible.');
      toast({ title: 'Préparation impossible', tone: 'error' });
    } finally {
      setGenerating(false);
    }
  }

  if (generating) {
    return (
      <div className="mx-auto max-w-lg rounded-[16px] border border-line bg-canvas p-8 text-center shadow-sm">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-accent-soft">
          <Sparkles className="h-6 w-6 text-accent animate-pulse-soft" aria-hidden />
        </div>
        <p className="mt-5 text-[16px] font-semibold text-ink">DEVISIA prépare votre devis</p>

        <ul className="mx-auto mt-6 max-w-xs space-y-2.5 text-left" aria-live="polite">
          {STEPS.map((label, index) => (
            <li
              key={label}
              className={cn(
                'flex items-center gap-2.5 text-[13.5px] transition-colors',
                index < step ? 'text-ink' : index === step ? 'text-ink' : 'text-subtle',
              )}
            >
              {index < step ? (
                <span className="flex h-4 w-4 items-center justify-center rounded-full bg-success text-white" aria-hidden>
                  <svg viewBox="0 0 12 12" className="h-2.5 w-2.5" fill="none">
                    <path d="m2.5 6 2.5 2.5L9.5 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
              ) : index === step ? (
                <Loader2 className="h-4 w-4 animate-spin text-accent" aria-hidden />
              ) : (
                <span className="h-4 w-4 rounded-full border border-line" aria-hidden />
              )}
              {label}
            </li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      {error ? <Alert tone="warning">{error}</Alert> : null}

      <div className="rounded-[18px] border border-line bg-canvas p-5 shadow-sm sm:p-7">
        <label htmlFor="description" className="text-[17px] font-semibold tracking-[-0.02em] text-ink">
          Décrivez votre chantier
        </label>
        <p className="mt-1 text-[13.5px] text-muted">
          Parlez comme vous le feriez à votre apprenti. DEVISIA s’occupe de la mise en forme.
        </p>

        <Textarea
          id="description"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          rows={7}
          maxLength={8000}
          placeholder="Le client a une fuite sous l'évier. Il faut remplacer le siphon, vérifier les raccordements et prévoir environ une heure de main-d'œuvre."
          className="mt-4 text-[15px] leading-relaxed"
        />

        <div className="mt-3 flex items-center justify-between">
          <span className="text-[12px] text-subtle tabular">{description.length} / 8000</span>
          {listening || recording ? (
            <span className="flex items-center gap-1.5 text-[12.5px] font-medium text-accent">
              <span className="h-2 w-2 animate-pulse-soft rounded-full bg-accent" aria-hidden />
              Je vous écoute…
            </span>
          ) : null}
        </div>

        {/* Action principale : la voix, très visible. */}
        <div className="mt-6 flex flex-col items-center gap-3">
          {speechSupported || transcriptionAvailable ? (
            <>
              <button
                type="button"
                onClick={
                  speechSupported
                    ? listening
                      ? stopSpeech
                      : startSpeech
                    : recording
                      ? stopRecording
                      : () => void startRecording()
                }
                className={cn(
                  'flex h-[72px] w-[72px] items-center justify-center rounded-full text-white shadow-md transition-all duration-200 active:scale-95',
                  listening || recording
                    ? 'bg-danger ring-8 ring-danger/15'
                    : 'bg-accent hover:bg-accent-hover hover:ring-8 hover:ring-accent/10',
                )}
                aria-pressed={listening || recording}
                aria-label={
                  listening || recording ? 'Arrêter la dictée' : 'Décrire le chantier à la voix'
                }
              >
                {listening || recording ? (
                  <Square className="h-6 w-6" aria-hidden />
                ) : (
                  <Mic className="h-7 w-7" aria-hidden />
                )}
              </button>
              <p className="text-[13px] font-medium text-ink-soft">
                {listening || recording ? 'Appuyez pour arrêter' : 'Appuyez et décrivez le chantier'}
              </p>
            </>
          ) : (
            <span className="inline-flex items-center gap-2 rounded-[10px] border border-line bg-surface px-3 py-2 text-[12.5px] text-muted">
              <Type className="h-3.5 w-3.5" aria-hidden />
              Dictée indisponible sur cet appareil : saisissez votre description ci-dessus.
            </span>
          )}

          <Button
            type="button"
            size="md"
            variant="secondary"
            onClick={() => fileInputRef.current?.click()}
            loading={uploading}
            disabled={photos.length >= 6}
            className="mt-1"
          >
            <Camera className="h-4 w-4" aria-hidden />
            Ajouter des photos
          </Button>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            multiple
            className="sr-only"
            onChange={(event) => {
              if (event.target.files?.length) void uploadPhotos(event.target.files);
              event.target.value = '';
            }}
          />
        </div>

        {!visionAvailable && photos.length > 0 ? (
          <p className="mt-3 text-[12.5px] text-subtle">
            Les photos sont jointes au devis. Leur analyse automatique nécessite un fournisseur d’IA
            configuré.
          </p>
        ) : null}

        {photos.length > 0 ? (
          <ul className="mt-4 grid grid-cols-3 gap-2.5 sm:grid-cols-4">
            {photos.map((photo) => (
              <li key={photo.id} className="group relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photo.url}
                  alt={photo.fileName}
                  className="aspect-square w-full rounded-[10px] border border-line object-cover"
                />
                <button
                  type="button"
                  onClick={() => setPhotos((current) => current.filter((item) => item.id !== photo.id))}
                  className="absolute right-1.5 top-1.5 rounded-full bg-ink/70 p-1 text-white opacity-0 transition-opacity group-hover:opacity-100 focus:opacity-100"
                  aria-label={`Retirer ${photo.fileName}`}
                >
                  <X className="h-3 w-3" aria-hidden />
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      <Button size="lg" className="w-full" onClick={() => void generate()}>
        <Sparkles className="h-4 w-4" aria-hidden />
        Préparer le devis
      </Button>

      <p className="text-center text-[12.5px] text-subtle">
        Vous vérifierez et modifierez le devis avant tout envoi.
      </p>
    </div>
  );
}
