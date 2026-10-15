import { LOCALES, setUiLanguage, t } from './index';
afterEach(() => setUiLanguage('en'));
test('French UI switches independently and unknown addresses are preserved', () => {
  setUiLanguage('fr');
  expect(t('Start navigation')).toBe('Démarrer');
  expect(t('18 Rue Blériau')).toBe('18 Rue Blériau');
  setUiLanguage('en');
  expect(t('Start navigation')).toBe('Start navigation');
});
test('untranslated languages are not advertised as available; Arabic declares RTL', () => {
  expect(LOCALES.ar).toEqual({direction:'rtl',available:false});
  expect(LOCALES.es.available).toBe(false);
});
