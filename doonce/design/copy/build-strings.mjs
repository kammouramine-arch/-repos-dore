#!/usr/bin/env node
// Generates prototype/assets/strings.js and ios/DoOnce/Resources/Localizable.xcstrings from strings.json.
//   node doonce/design/copy/build-strings.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..', '..');
const src = JSON.parse(fs.readFileSync(path.join(here, 'strings.json'), 'utf8'));
const langs = Object.keys(src).filter(k => !k.startsWith('$'));

// Prototype: a classic script exposing window.STRINGS
const js = `// Generated from design/copy/strings.json — do not edit by hand.\nwindow.STRINGS = ${JSON.stringify(Object.fromEntries(langs.map(l => [l, src[l]])), null, 2)};\n`;
fs.mkdirSync(path.join(root, 'prototype', 'assets'), { recursive: true });
fs.writeFileSync(path.join(root, 'prototype', 'assets', 'strings.js'), js);

// iOS: .xcstrings (String Catalog). Arrays become key.0, key.1…; plurals become variations.
const strings = {};
const add = (key, lang, value) => {
  strings[key] ??= { extractionState: 'manual', localizations: {} };
  if (typeof value === 'string') {
    strings[key].localizations[lang] = { stringUnit: { state: 'translated', value: value.replace(/\{(\w+)\}/g, '%@') } };
  } else if (Array.isArray(value)) {
    value.forEach((v, i) => add(`${key}.${i}`, lang, v));
    delete strings[key];
  } else if (value && typeof value === 'object') {
    const plural = {};
    for (const [form, v] of Object.entries(value)) plural[form] = { stringUnit: { state: 'translated', value: v.replace(/\{n\}/g, '%lld').replace(/\{(\w+)\}/g, '%@') } };
    strings[key].localizations[lang] = { variations: { plural } };
  }
};
for (const lang of langs) for (const [k, v] of Object.entries(src[lang])) if (!k.startsWith('$')) add(k, lang, v);
const xc = { sourceLanguage: 'en', version: '1.0', strings };
const out = path.join(root, 'ios', 'DoOnce', 'Resources');
fs.mkdirSync(out, { recursive: true });
fs.writeFileSync(path.join(out, 'Localizable.xcstrings'), JSON.stringify(xc, null, 2) + '\n');
console.log(`strings: ${Object.keys(strings).length} keys → prototype/assets/strings.js, ios/DoOnce/Resources/Localizable.xcstrings`);
