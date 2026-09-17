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

  /*
   * L'accueil ne mesure plus son bandeau en fraction d'écran.
   *
   * C'était la cause du défaut signalé sur l'appareil : la blancheur du fondu
   * dépend de la position à l'écran, donc n'importe quel texte blanc passant
   * sous la moitié du bandeau devenait invisible — « Décrivez simplement le
   * chantier » et « VOS DEVIS » l'étaient. Le bandeau est désormais mesuré sur
   * l'en-tête, et la fraction ne sert plus que de valeur de départ, le temps
   * d'une mesure.
   */
  it('pose l’atmosphère dans le contenu, et non dans un calque séparé', async () => {
    const { readFileSync } = await import('node:fs');
    const home = readFileSync('mobile/app/(app)/index.tsx', 'utf8');
    const account = readFileSync('mobile/app/(app)/plus.tsx', 'utf8');
    /*
     * Le bandeau était en position absolue et le contenu défilait par-dessus :
     * deux plans qui glissent l'un sur l'autre finissent toujours par se
     * couper, d'où la bande bleue derrière la première carte des réglages.
     * L'atmosphère est maintenant le premier enfant de la zone défilante.
     */
    for (const [name, source] of [['accueil', home], ['compte', account]] as const) {
      // Le calque a disparu…
      expect(source, name).not.toContain('<BrandBackdrop');
      // …et l'atmosphère est le premier enfant de la zone défilante, donc
      // portée par le défilement plutôt que traversée par lui.
      const screen = source.indexOf('<Screen');
      const atmosphere = source.indexOf('<BrandAtmosphere', screen);
      expect(atmosphere, name).toBeGreaterThan(screen);
      expect(source.slice(screen, atmosphere), name).not.toContain('<Card');
    }
    // L'authentification garde son grand fondu : son texte blanc tient en haut.
    expect(GRADIENT_SPAN.auth).toBeGreaterThanOrEqual(0.55);
  });

  it('n’écrit plus en blanc hors du bandeau, sur l’accueil', async () => {
    const { readFileSync } = await import('node:fs');
    const home = readFileSync('mobile/app/(app)/index.tsx', 'utf8');
    // Le carrousel et les accès rapides ne prennent plus la variante « sur
    // fond de marque » : leurs titres descendent sous le bleu.
    expect(home).not.toContain('<QuoteCarousel quotes={quotesQuery.data?.items} loading={quotesQuery.loading} en={en} onBrand />');
    expect(home).not.toContain('<QuickActions onBrand />');
    // Et le bandeau d'état repasse en encre.
    expect(home).not.toContain("color: 'rgba(255,255,255,0.85)'");
  });
});
