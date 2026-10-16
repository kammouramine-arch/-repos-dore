#!/usr/bin/env node
/**
 * Generates meepmeep's launch cue: two short, bright, original notes.
 *
 * Synthesised from scratch so its provenance is this file: no samples, no
 * recordings, nothing imitated. Deliberately *not* a cartoon "beep beep"
 * horn — two soft bell-like tones a perfect fourth apart (E6 → A6), each a
 * sine with a light 2:1 FM shimmer and a plucked envelope. Deterministic: the
 * same script always writes the same bytes.
 *
 *   node scripts/generate-launch-cue.mjs
 *
 * Output: modules/avyro-wake/ios/resources/meepmeep-launch.wav (22.05 kHz,
 * 16-bit mono PCM), played once per cold launch by AvyroWakeModule with the
 * ambient audio category, so it respects the silent switch.
 */
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const RATE = 22_050;
const notes = [
  { at: 0.0, hz: 1318.51, length: 0.11, gain: 0.42 }, // E6, "meep"
  { at: 0.15, hz: 1760.0, length: 0.17, gain: 0.46 }, // A6, "meep"
];
const total = Math.ceil(RATE * 0.42);
const samples = new Float64Array(total);

for (const note of notes) {
  const start = Math.round(note.at * RATE);
  const count = Math.round(note.length * RATE);
  for (let n = 0; n < count && start + n < total; n += 1) {
    const t = n / RATE;
    const attack = Math.min(1, t / 0.006);
    const decay = Math.exp(-t / (note.length * 0.45));
    const release = Math.min(1, (count - n) / (RATE * 0.012));
    const shimmer = 0.9 * Math.exp(-t / 0.04) * Math.sin(2 * Math.PI * note.hz * 2 * t);
    samples[start + n] += note.gain * attack * decay * release * Math.sin(2 * Math.PI * note.hz * t + shimmer);
  }
}

const data = Buffer.alloc(total * 2);
samples.forEach((value, i) => data.writeInt16LE(Math.round(Math.max(-1, Math.min(1, value)) * 32_000), i * 2));
const header = Buffer.alloc(44);
header.write('RIFF', 0); header.writeUInt32LE(36 + data.length, 4); header.write('WAVE', 8);
header.write('fmt ', 12); header.writeUInt32LE(16, 16); header.writeUInt16LE(1, 20); header.writeUInt16LE(1, 22);
header.writeUInt32LE(RATE, 24); header.writeUInt32LE(RATE * 2, 28); header.writeUInt16LE(2, 32); header.writeUInt16LE(16, 34);
header.write('data', 36); header.writeUInt32LE(data.length, 40);

const out = fileURLToPath(new URL('../modules/avyro-wake/ios/resources/meepmeep-launch.wav', import.meta.url));
writeFileSync(out, Buffer.concat([header, data]));
console.log(`wrote ${out} (${(total / RATE).toFixed(2)} s)`);
