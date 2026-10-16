import { readFileSync } from 'node:fs';
import path from 'node:path';
import { displayWakePhrase, matchWakePhrase } from '@/core/conversation/wakePhrase';
import { APP_INFO, BRAND } from '@/config';

const root = path.resolve(__dirname, '../..');

describe('one brand, everywhere', () => {
  it('the app config uses it', () => {
    expect(APP_INFO.name).toBe(BRAND.appName);
    const expo = readFileSync(path.join(root, 'app.config.ts'), 'utf8');
    expect(expo).toMatch(new RegExp(`name:\\s*'${BRAND.appName}'`));
  });

  it('the bundled wake model listens for the same phrase', () => {
    const keywords = readFileSync(path.join(root, 'modules/avyro-wake/ios/models/keywords.txt'), 'utf8')
      .trim().split('\n').map((line) => line.split('@')[1]);
    expect(new Set(keywords)).toEqual(new Set([BRAND.wake.nativeKeywordId]));
  });

  it('shows the same phrase in English and French', () => {
    expect(displayWakePhrase('en-US')).toBe(BRAND.wake.display);
    expect(displayWakePhrase('fr-FR')).toBe(BRAND.wake.display);
  });

  it('wakes on every spoken form, in both languages', () => {
    for (const phrase of BRAND.wake.spoken) {
      expect(matchWakePhrase(`${phrase} take me home`, 'en-US')?.remainder).toBe('take me home');
      expect(matchWakePhrase(`${phrase} on rentre`, 'fr-FR')?.remainder).toBe('on rentre');
    }
  });
});
