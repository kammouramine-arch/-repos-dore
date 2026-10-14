import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateCommandAudio, transcribeCommand, TRANSCRIPTION_MODEL } from './transcribe.mjs';
function audio(seconds = 1) {
  const b = Buffer.alloc(44 + seconds * 32000);
  b.write('RIFF'); b.writeUInt32LE(b.length - 8, 4); b.write('WAVEfmt ', 8); b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22); b.writeUInt32LE(16000, 24); b.writeUInt32LE(32000, 28); b.writeUInt16LE(2, 32); b.writeUInt16LE(16, 34); b.write('data', 36); b.writeUInt32LE(b.length - 44, 40);
  return b.toString('base64');
}
test('rejects long, malformed, or inconsistent audio before provider use', () => {
  assert.equal(validateCommandAudio(audio()).length, 32044);
  for (const value of ['', 'bad', audio(21), Buffer.alloc(5000).toString('base64')]) assert.throws(() => validateCommandAudio(value));
  const bad = Buffer.from(audio(), 'base64'); bad.writeUInt32LE(48000, 24); assert.throws(() => validateCommandAudio(bad.toString('base64')));
});
test('uses multilingual Whisper transcription without a phrase prompt or forced answer', async () => {
  const ai = { async run(model, input) { assert.equal(model, TRANSCRIPTION_MODEL); assert.equal(input.vad_filter, true); assert.equal(input.condition_on_previous_text, false); assert.equal(input.language, undefined); assert.equal(input.initial_prompt, undefined); return { text: 'Quelle est la limitation de vitesse ici ?' }; } };
  assert.equal((await transcribeCommand(ai, audio(), 'auto')).text, 'Quelle est la limitation de vitesse ici ?');
});
test('silence or oversized transcripts cannot become actions', async () => {
  for (const text of ['', ' '.repeat(10), 'x'.repeat(501)]) assert.equal((await transcribeCommand({ run: async () => ({ text }) }, audio(), 'en')).text, null);
});
test('French wake-address cleanup preserves the actual command and negation', async () => {
  for (const [text, expected] of [
    ['Hé Aviro, signale un accident ici.', 'signale un accident ici.'],
    ['Hey Avyro, do not report an accident here.', 'do not report an accident here.'],
    ['Do not say hey Avyro, report an accident here.', 'Do not say hey Avyro, report an accident here.'],
  ]) assert.equal((await transcribeCommand({ run: async () => ({ text }) }, audio(), 'auto')).text, expected);
});
