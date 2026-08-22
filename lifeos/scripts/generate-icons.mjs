#!/usr/bin/env node
/**
 * Generates the LifeOS app icons.
 *
 *   npm run icons
 *
 * Draws them here rather than shipping the Expo starter art, with no image
 * dependency: a tiny PNG writer (zlib is in Node) plus a few primitives is enough for
 * a flat, geometric mark.
 *
 * The mark is a ring with a rising arc inside it — an operating system around a life
 * that is going somewhere. Calm, geometric, legible at 40px, no gradients to muddy it.
 *
 * Replace these with designed artwork before release if you have it; they are real
 * assets, not placeholders, and the app ships coherently without that step.
 */
import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const assets = resolve(here, '../assets');

// The brand palette, matching src/theme/tokens.ts.
const INK = [14, 16, 20];
const ACCENT = [123, 132, 240];
const ACCENT_DEEP = [91, 99, 232];
const PAPER = [250, 249, 247];

/** A straight RGBA canvas. */
function canvas(size, background) {
  const pixels = new Uint8Array(size * size * 4);
  for (let i = 0; i < size * size; i += 1) {
    pixels[i * 4] = background[0];
    pixels[i * 4 + 1] = background[1];
    pixels[i * 4 + 2] = background[2];
    pixels[i * 4 + 3] = background === null ? 0 : 255;
  }
  return { size, pixels };
}

function transparent(size) {
  return { size, pixels: new Uint8Array(size * size * 4) };
}

/** Alpha-blends a colour into one pixel. */
function blend({ size, pixels }, x, y, colour, alpha) {
  if (alpha <= 0 || x < 0 || y < 0 || x >= size || y >= size) return;
  const i = (y * size + x) * 4;
  const a = Math.min(1, alpha);
  const existing = pixels[i + 3] / 255;
  const out = a + existing * (1 - a);

  for (let c = 0; c < 3; c += 1) {
    pixels[i + c] = Math.round((colour[c] * a + pixels[i + c] * existing * (1 - a)) / (out || 1));
  }
  pixels[i + 3] = Math.round(out * 255);
}

/** Antialiased ring by sampling distance from the centre. */
function ring(image, cx, cy, radius, thickness, colour) {
  const outer = radius + thickness / 2;
  const inner = radius - thickness / 2;

  for (let y = Math.floor(cy - outer - 2); y <= Math.ceil(cy + outer + 2); y += 1) {
    for (let x = Math.floor(cx - outer - 2); x <= Math.ceil(cx + outer + 2); x += 1) {
      const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy);
      // Coverage falls off over one pixel at each edge.
      const alpha = Math.min(1, Math.max(0, outer - d), Math.max(0, d - inner));
      if (d >= inner - 1 && d <= outer + 1) blend(image, x, y, colour, alpha);
    }
  }
}

/** A rounded stroke between two points. */
function stroke(image, x1, y1, x2, y2, width, colour) {
  const steps = Math.ceil(Math.hypot(x2 - x1, y2 - y1) * 2);
  for (let i = 0; i <= steps; i += 1) {
    const t = i / steps;
    dot(image, x1 + (x2 - x1) * t, y1 + (y2 - y1) * t, width / 2, colour);
  }
}

function dot(image, cx, cy, radius, colour) {
  for (let y = Math.floor(cy - radius - 1); y <= Math.ceil(cy + radius + 1); y += 1) {
    for (let x = Math.floor(cx - radius - 1); x <= Math.ceil(cx + radius + 1); x += 1) {
      const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy);
      blend(image, x, y, colour, Math.min(1, Math.max(0, radius - d)));
    }
  }
}

/** The LifeOS mark: a ring, and a line rising through it. */
function drawMark(image, colour, accent) {
  const s = image.size;
  const cx = s / 2;
  const cy = s / 2;

  ring(image, cx, cy, s * 0.3, s * 0.052, colour);

  // The rising path: three segments climbing left to right.
  const w = s * 0.05;
  const points = [
    [cx - s * 0.155, cy + s * 0.105],
    [cx - s * 0.045, cy + s * 0.015],
    [cx + s * 0.055, cy + s * 0.06],
    [cx + s * 0.155, cy - s * 0.115],
  ];
  for (let i = 0; i < points.length - 1; i += 1) {
    stroke(image, points[i][0], points[i][1], points[i + 1][0], points[i + 1][1], w, accent);
  }
  // The point it is heading for.
  dot(image, points[points.length - 1][0], points[points.length - 1][1], w * 0.85, accent);
}

// ─────────────────────────────────────────────────────────────── PNG writing ──

function crc32(buffer) {
  let crc = ~0;
  for (const byte of buffer) {
    crc ^= byte;
    for (let i = 0; i < 8; i += 1) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  }
  return ~crc >>> 0;
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([length, body, crc]);
}

function toPng({ size, pixels }) {
  // Each scanline is prefixed with a filter byte (0 = none).
  const raw = Buffer.alloc(size * (size * 4 + 1));
  for (let y = 0; y < size; y += 1) {
    raw[y * (size * 4 + 1)] = 0;
    Buffer.from(pixels.buffer, y * size * 4, size * 4).copy(raw, y * (size * 4 + 1) + 1);
  }

  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0);
  header.writeUInt32BE(size, 4);
  header[8] = 8; // bit depth
  header[9] = 6; // RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

function write(name, image) {
  mkdirSync(assets, { recursive: true });
  const file = resolve(assets, name);
  writeFileSync(file, toPng(image));
  return `${name} (${image.size}×${image.size})`;
}

// ────────────────────────────────────────────────────────────────── the set ──

const written = [];

// iOS / general icon: the mark on the brand's ink.
const icon = canvas(1024, INK);
drawMark(icon, PAPER, ACCENT);
written.push(write('icon.png', icon));

// Splash: the same mark, transparent so the configured background shows through.
const splash = transparent(1024);
drawMark(splash, PAPER, ACCENT);
written.push(write('splash-icon.png', splash));

// Android adaptive icon: foreground art must sit inside the safe circle, so the mark
// is drawn at two thirds scale on a transparent canvas.
const foreground = transparent(1024);
const inner = transparent(680);
drawMark(inner, PAPER, ACCENT);
for (let y = 0; y < 680; y += 1) {
  for (let x = 0; x < 680; x += 1) {
    const from = (y * 680 + x) * 4;
    const to = ((y + 172) * 1024 + (x + 172)) * 4;
    foreground.pixels.set(inner.pixels.subarray(from, from + 4), to);
  }
}
written.push(write('android-icon-foreground.png', foreground));

const background = canvas(1024, INK);
written.push(write('android-icon-background.png', background));

// Monochrome (themed icons): the silhouette only.
const mono = transparent(1024);
drawMark(mono, PAPER, PAPER);
written.push(write('android-icon-monochrome.png', mono));

// Favicon for the web build.
const favicon = canvas(48, INK);
drawMark(favicon, PAPER, ACCENT_DEEP);
written.push(write('favicon.png', favicon));

console.log(`Wrote ${written.length} assets to assets/:\n  ${written.join('\n  ')}`);
