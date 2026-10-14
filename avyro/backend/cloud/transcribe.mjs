export const TRANSCRIPTION_MODEL = '@cf/openai/whisper-large-v3-turbo';

/** Only bounded 16 kHz mono PCM commands, never continuous or ambient audio. */
export function validateCommandAudio(audio) {
  if (typeof audio !== 'string' || audio.length > 876000 || !/^[A-Za-z0-9+/]+={0,2}$/.test(audio)) throw Object.assign(Error('Invalid command audio.'), { status: 400 });
  const wav = Buffer.from(audio, 'base64');
  if (wav.length < 3244 || wav.length > 656044 || wav.toString('ascii', 0, 4) !== 'RIFF' || wav.toString('ascii', 8, 12) !== 'WAVE' || wav.toString('ascii', 12, 16) !== 'fmt ' || wav.readUInt32LE(16) !== 16 || wav.readUInt16LE(20) !== 1 || wav.readUInt16LE(22) !== 1 || wav.readUInt32LE(24) !== 16000 || wav.readUInt32LE(28) !== 32000 || wav.readUInt16LE(32) !== 2 || wav.readUInt16LE(34) !== 16 || wav.toString('ascii', 36, 40) !== 'data' || wav.readUInt32LE(40) !== wav.length - 44 || wav.readUInt32LE(4) !== wav.length - 8 || wav.length % 2 !== 0) throw Object.assign(Error('Use a short PCM command recording.'), { status: 400 });
  return wav;
}

export async function transcribeCommand(ai, audio, language) {
  validateCommandAudio(audio);
  const result = await ai.run(TRANSCRIPTION_MODEL, {
    audio, task: 'transcribe', vad_filter: true, condition_on_previous_text: false,
    ...(language === 'en' || language === 'fr' ? { language } : {}),
  });
  const text = result?.text ?? result?.transcription_info?.text;
  if (typeof text !== 'string' || !text.trim() || text.length > 500) return { text: null, source: 'whisper' };
  // Recognition can write the same spoken brand in French or English. Remove
  // only a leading wake address, preserving every command word and negation.
  const command = text.trim().replace(/^(?:hey|h[ée]|hi|salut|ok|dis)[,\s]+(?:avyro|aviro|avero)\b[,\s.!:;-]*/iu, '').trim();
  return { text: command || null, source: 'whisper' };
}
