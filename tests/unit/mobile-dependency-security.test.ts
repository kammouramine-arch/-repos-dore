import { createRequire } from 'node:module';
import { expect, it } from 'vitest';

const mobileRequire = createRequire(new URL('../../mobile/package.json', import.meta.url));
const decode = mobileRequire('decode-uri-component') as (value: string) => string;

it('preserves valid localized URL decoding', () => {
  expect(decode('Fran%C3%A7ais+English')).toBe('Français English');
  expect(decode('%F0%9F%87%AB')).toBe('🇫');
});

it('handles long malformed URL input without recursive decoding', () => {
  const malformed = '%FF%C2'.repeat(10_000);
  expect(decode(malformed)).toBe(malformed);
});

it('keeps Xcode project UUID generation compatible with the patched dependency', () => {
  const project = mobileRequire('xcode').project('not-read.pbxproj');
  project.hash = { project: { objects: {} } };
  expect(project.generateUuid()).toMatch(/^[A-F0-9]{24}$/);
});
