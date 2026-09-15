import { describe, expect, it } from 'vitest';
import { BRAND_BOTTOM, BRAND_GRADIENT, BRAND_TOP, GRADIENT_SPAN, hexToRgb, luminance } from '../../mobile/src/theme/gradient';

/**
 * Le dégradé de marque doit se dissoudre, pas se couper.
 *
 * Comparé à la référence fournie (Fitness Park) : bleu saturé tenu sur le haut,
 * puis un fondu long et progressif jusqu'au blanc, sans ligne « le bleu
 * s'arrête ici ». Ces cas mesurent ce que l'œil reproche : trop peu d'arrêts,
 * un saut de luminance entre deux arrêts, ou une zone de fondu trop courte.
 */
describe('dégradé de marque', () => {
  it('tient le bleu saturé sur le haut, et finit blanc', () => {
    const first = BRAND_GRADIENT[0]!;
    const { r, g, b } = hexToRgb(first.color);
    expect(b).toBeGreaterThan(200);
    expect(r).toBeLessThan(80);
    expect(g).toBeLessThan(110);
    expect(BRAND_GRADIENT.find((stop) => stop.offset === 0.3)?.color).toBe(BRAND_TOP);
    expect(BRAND_GRADIENT.at(-1)?.color).toBe(BRAND_BOTTOM);
    expect(BRAND_BOTTOM).toBe('#FFFFFF');
  });

  it('compte assez d’arrêts, dans l’ordre, de 0 à 1', () => {
    expect(BRAND_GRADIENT.length).toBeGreaterThanOrEqual(8);
    expect(BRAND_GRADIENT[0]!.offset).toBe(0);
    expect(BRAND_GRADIENT.at(-1)!.offset).toBe(1);
    for (let index = 1; index < BRAND_GRADIENT.length; index += 1) {
      expect(BRAND_GRADIENT[index]!.offset).toBeGreaterThan(BRAND_GRADIENT[index - 1]!.offset);
    }
  });

  it('s’éclaircit sans jamais sauter : aucune frontière visible', () => {
    for (let index = 1; index < BRAND_GRADIENT.length; index += 1) {
      const previous = luminance(BRAND_GRADIENT[index - 1]!.color);
      const current = luminance(BRAND_GRADIENT[index]!.color);
      expect(current).toBeGreaterThanOrEqual(previous);
      // Pente maximale : un écart de luminance ramené à la hauteur qu'il occupe.
      const span = BRAND_GRADIENT[index]!.offset - BRAND_GRADIENT[index - 1]!.offset;
      expect((current - previous) / span).toBeLessThan(2.2);
    }
  });

  it('étale le fondu sur plus de la moitié de sa hauteur', () => {
    const lum = BRAND_GRADIENT.map((stop) => luminance(stop.color));
    const start = BRAND_GRADIENT[lum.findIndex((value) => value > luminance(BRAND_TOP) + 0.02)]!.offset;
    const end = BRAND_GRADIENT[lum.findIndex((value) => value > 0.9)]!.offset;
    expect(end - start).toBeGreaterThanOrEqual(0.5);
  });

  it('occupe une part substantielle de l’écran, pas une bande sous un en-tête', () => {
    expect(GRADIENT_SPAN.home).toBeGreaterThanOrEqual(0.55);
    expect(GRADIENT_SPAN.auth).toBeGreaterThanOrEqual(0.55);
    expect(GRADIENT_SPAN.home).toBeLessThanOrEqual(0.75);
  });
});
