#!/usr/bin/env node
// Generates platform token files from tokens.json.
//   node doonce/design/foundations/build-tokens.mjs
// Outputs:
//   doonce/prototype/assets/tokens.css
//   doonce/ios/DoOnce/Sources/DesignSystem/Generated/Tokens.swift
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..', '..');
const t = JSON.parse(fs.readFileSync(path.join(here, 'tokens.json'), 'utf8'));

const kebab = s => s.replace(/([A-Z])/g, '-$1').toLowerCase();

// ---------- CSS ----------
let css = `/* Generated from design/foundations/tokens.json — do not edit by hand. */\n`;
const colorVars = mode => Object.entries(t.color[mode]).map(([k, v]) => `  --${kebab(k)}: ${v};`).join('\n');
css += `:root {\n${colorVars('light')}\n`;
for (const [k, v] of Object.entries(t.spacing)) css += `  --space-${k}: ${v}px;\n`;
for (const [k, v] of Object.entries(t.radius)) css += `  --radius-${k}: ${v}px;\n`;
for (const [k, v] of Object.entries(t.blur)) css += `  --blur-${k}: ${v}px;\n`;
for (const [k, v] of Object.entries(t.motion.duration)) css += `  --dur-${k}: ${v}ms;\n`;
for (const [k, v] of Object.entries(t.motion.curve)) css += `  --ease-${k}: ${v.css};\n`;
for (const [k, v] of Object.entries(t.motion.spring)) css += `  --spring-${k}: ${v.css};\n`;
for (const [k, v] of Object.entries(t.elevation)) css += `  --elev-${k}: ${v.shadow};\n`;
for (const [k, v] of Object.entries(t.sizing)) css += `  --size-${kebab(k)}: ${v}px;\n`;
for (const [k, v] of Object.entries(t.typography.tracking)) css += `  --tracking-${k}: ${v};\n`;
css += `  --press-scale: ${t.motion.press.scale};\n  --press-card-scale: ${t.motion.press.cardScale};\n}\n`;
css += `:root[data-theme="dark"] {\n${colorVars('dark')}\n}\n`;
css += `@media (prefers-color-scheme: dark) {\n  :root:not([data-theme="light"]) {\n${colorVars('dark').replace(/^/gm, '  ')}\n  }\n}\n`;
for (const [name, s] of Object.entries(t.typography.styles)) {
  const tr = t.typography.tracking[s.tracking] ?? s.tracking;
  css += `.t-${name} { font-size: ${s.size}px; line-height: ${s.line}px; font-weight: ${s.weight}; letter-spacing: ${tr}; }\n`;
}
css += `.t-numeral, .tnum { font-variant-numeric: tabular-nums; }\n`;
fs.mkdirSync(path.join(root, 'prototype', 'assets'), { recursive: true });
fs.writeFileSync(path.join(root, 'prototype', 'assets', 'tokens.css'), css);

// ---------- Swift ----------
const hexToRGBA = v => {
  if (v.startsWith('#')) {
    const n = parseInt(v.slice(1), 16);
    return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255, 1];
  }
  const m = v.match(/rgba?\(([^)]+)\)/);
  const [r, g, b, a = 1] = m[1].split(',').map(Number);
  return [r / 255, g / 255, b / 255, a];
};
const f = n => Number(n.toFixed(4));
let sw = `// Generated from design/foundations/tokens.json — do not edit by hand.\n// Colors are exposed as light/dark pairs; DSColor resolves them against the environment.\n\nimport Foundation\n\npublic enum Tokens {\n`;
sw += `    public struct RGBA: Sendable, Hashable { public let r: Double, g: Double, b: Double, a: Double\n        public init(_ r: Double, _ g: Double, _ b: Double, _ a: Double) { self.r = r; self.g = g; self.b = b; self.a = a } }\n`;
sw += `    public struct ColorPair: Sendable, Hashable { public let light: RGBA; public let dark: RGBA }\n\n`;
sw += `    public enum Color {\n`;
for (const k of Object.keys(t.color.light)) {
  const l = hexToRGBA(t.color.light[k]).map(f), d = hexToRGBA(t.color.dark[k]).map(f);
  sw += `        public static let ${k} = ColorPair(light: RGBA(${l.join(', ')}), dark: RGBA(${d.join(', ')}))\n`;
}
sw += `    }\n\n    public enum Space {\n`;
for (const [k, v] of Object.entries(t.spacing)) sw += `        public static let ${/^\d/.test(k) ? 's' + k : k}: Double = ${v}\n`;
sw += `    }\n\n    public enum Radius {\n`;
for (const [k, v] of Object.entries(t.radius)) sw += `        public static let ${k}: Double = ${v}\n`;
sw += `    }\n\n    public enum Blur {\n`;
for (const [k, v] of Object.entries(t.blur)) sw += `        public static let ${k}: Double = ${v}\n`;
sw += `    }\n\n    public enum Duration {\n`;
for (const [k, v] of Object.entries(t.motion.duration)) sw += `        public static let ${k}: Double = ${v / 1000}\n`;
sw += `    }\n\n    public struct SpringSpec: Sendable, Hashable { public let response: Double; public let dampingFraction: Double }\n    public enum Spring {\n`;
for (const [k, v] of Object.entries(t.motion.spring)) sw += `        public static let ${k} = SpringSpec(response: ${v.response}, dampingFraction: ${v.damping})\n`;
sw += `    }\n\n    public enum Press {\n        public static let scale: Double = ${t.motion.press.scale}\n        public static let cardScale: Double = ${t.motion.press.cardScale}\n        public static let opacity: Double = ${t.motion.press.opacity}\n    }\n\n`;
sw += `    public struct TextStyleSpec: Sendable, Hashable { public let size: Double; public let line: Double; public let weight: Int; public let tracking: Double }\n    public enum Text {\n`;
for (const [k, s] of Object.entries(t.typography.styles)) {
  const tr = t.typography.tracking[s.tracking] ?? s.tracking;
  const em = parseFloat(tr) || 0; // em → points at this size
  sw += `        public static let ${k} = TextStyleSpec(size: ${s.size}, line: ${s.line}, weight: ${s.weight}, tracking: ${f(em * s.size)})\n`;
}
sw += `    }\n\n    public enum Sizing {\n`;
for (const [k, v] of Object.entries(t.sizing)) sw += `        public static let ${k}: Double = ${v}\n`;
sw += `    }\n}\n`;
const swiftOut = path.join(root, 'ios', 'DoOnce', 'Sources', 'DesignSystem', 'Generated');
fs.mkdirSync(swiftOut, { recursive: true });
fs.writeFileSync(path.join(swiftOut, 'Tokens.swift'), sw);
// ---------- SwiftUI colour accessors ----------
let ds = `// Generated from design/foundations/tokens.json — do not edit by hand.\n#if canImport(SwiftUI)\nimport SwiftUI\n\n/// Semantic colours resolved for the current appearance. Use these, never raw values.\npublic enum DSColor {\n`;
for (const k of Object.keys(t.color.light)) ds += `    public static let ${k} = Color(pair: Tokens.Color.${k})\n`;
ds += `}\n#endif\n`;
fs.writeFileSync(path.join(swiftOut, 'DSColors.swift'), ds);
console.log('tokens: wrote prototype/assets/tokens.css, ios/.../Generated/Tokens.swift and DSColors.swift');
