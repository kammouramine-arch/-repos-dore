#!/usr/bin/env node
/**
 * Renders Avyro's launcher and splash artwork from the same geometry the app
 * draws on screen (see `src/ui/components/AvyroMark.tsx`).
 *
 * Keeping the assets generated rather than hand-exported means the icon can
 * never drift from the mark: change the polygon or the gradient here, run
 * `npm run assets`, and every size is regenerated consistently.
 *
 * Usage: node scripts/generate-brand-assets.mjs
 */
import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ASSETS_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'assets');

/** Brand tokens, mirrored from `src/ui/theme/colors.ts`. */
const BACKGROUND = [10, 12, 17, 255];
const GRADIENT_START = [61, 123, 255];
const GRADIENT_END = [138, 107, 255];
const HIGHLIGHT = [255, 255, 255, 0.22];

/** The mark, in normalised coordinates: a heading arrow. */
const ARROW = [
  [0.5, 0.16],
  [0.82, 0.78],
  [0.5, 0.62],
  [0.18, 0.78],
];
/** Right-hand facet, drawn lighter so the arrow reads as folded. */
const FACET = [ARROW[0], ARROW[1], ARROW[2]];

const SUPERSAMPLE = 4;

const isInside = (polygon, x, y) => {
  let inside = false;

  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i, i += 1) {
    const [xi, yi] = polygon[i];
    const [xj, yj] = polygon[j];

    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }

  return inside;
};

/** Coverage of a pixel by a polygon, estimated by supersampling. */
const coverage = (polygon, px, py, size, scale, offset) => {
  let hits = 0;

  for (let sy = 0; sy < SUPERSAMPLE; sy += 1) {
    for (let sx = 0; sx < SUPERSAMPLE; sx += 1) {
      const x = ((px + (sx + 0.5) / SUPERSAMPLE) / size - offset) / scale;
      const y = ((py + (sy + 0.5) / SUPERSAMPLE) / size - offset) / scale;
      if (isInside(polygon, x, y)) hits += 1;
    }
  }

  return hits / (SUPERSAMPLE * SUPERSAMPLE);
};

const mix = (from, to, t) => from + (to - from) * t;

const blend = (target, index, colour, alpha) => {
  for (let channel = 0; channel < 3; channel += 1) {
    target[index + channel] = Math.round(
      mix(target[index + channel], colour[channel], alpha),
    );
  }
  target[index + 3] = Math.round(mix(target[index + 3], 255, alpha));
};

/**
 * Draws the mark into an RGBA buffer.
 * `scale` is the fraction of the canvas the mark occupies.
 */
const renderMark = (size, { background, scale }) => {
  const pixels = new Uint8Array(size * size * 4);
  const offset = (1 - scale) / 2;

  if (background) {
    for (let i = 0; i < pixels.length; i += 4) {
      pixels.set(background, i);
    }
  }

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const index = (y * size + x) * 4;
      const arrow = coverage(ARROW, x, y, size, scale, offset);
      if (arrow === 0) continue;

      const t = (x / size + y / size) / 2;
      const colour = [
        mix(GRADIENT_START[0], GRADIENT_END[0], t),
        mix(GRADIENT_START[1], GRADIENT_END[1], t),
        mix(GRADIENT_START[2], GRADIENT_END[2], t),
      ];

      blend(pixels, index, colour, arrow);

      const facet = coverage(FACET, x, y, size, scale, offset);
      if (facet > 0) blend(pixels, index, HIGHLIGHT, facet * HIGHLIGHT[3]);
    }
  }

  return pixels;
};

const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

const crc32 = (buffer) => {
  let crc = 0xffffffff;
  for (const byte of buffer) crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
};

const chunk = (type, data) => {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([length, body, crc]);
};

/** Minimal RGBA PNG encoder — enough for flat artwork, no dependencies. */
const encodePng = (pixels, size) => {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0);
  header.writeUInt32BE(size, 4);
  header[8] = 8; // bit depth
  header[9] = 6; // colour type: RGBA

  const stride = size * 4;
  const raw = Buffer.alloc((stride + 1) * size);

  for (let y = 0; y < size; y += 1) {
    raw[y * (stride + 1)] = 0; // filter: none
    Buffer.from(pixels.buffer, y * stride, stride).copy(raw, y * (stride + 1) + 1);
  }

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
};

const write = (name, size, options) => {
  const png = encodePng(renderMark(size, options), size);
  writeFileSync(join(ASSETS_DIR, name), png);
  console.log(`${name} — ${size}×${size} (${(png.length / 1024).toFixed(1)} kB)`);
};

mkdirSync(ASSETS_DIR, { recursive: true });

// App icon: the mark on Avyro's background, filling the platform's safe area.
write('icon.png', 1024, { background: BACKGROUND, scale: 1 });
// Splash: transparent, sized against the splash background colour.
write('splash-icon.png', 512, { background: null, scale: 0.95 });
// Android adaptive icon: foreground must stay inside the central 66%.
write('android-icon-foreground.png', 432, { background: null, scale: 0.9 });
write('android-icon-monochrome.png', 432, { background: null, scale: 0.9 });
write('favicon.png', 64, { background: BACKGROUND, scale: 1 });
