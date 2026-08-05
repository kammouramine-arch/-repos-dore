export interface SpeechOptions {
  /** BCP-47 tag, e.g. `en-US`. Defaults to the device language. */
  language?: string;
  /** 1 is the platform's normal rate; guidance reads slightly slower. */
  rate?: number;
  pitch?: number;
}

/** Text-to-speech, used for spoken turn-by-turn guidance. */
export interface SpeechEngine {
  speak(text: string, options?: SpeechOptions): Promise<void>;
  stop(): Promise<void>;
}
