import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Système de mouvement : ce qui fait qu'un écran DEVISERA « se pose » au
 * lieu d'apparaître. Ces cas figent les invariants de la passe de finition,
 * pas les valeurs de réglage.
 */
const MOBILE = path.resolve(__dirname, '../../mobile');
const read = (file: string) => readFileSync(path.join(MOBILE, file), 'utf8');

describe('mouvement', () => {
  const motion = read('src/components/motion.tsx');

  it('expose entrée, séquence, compteur, coche et respiration, tous sensibles à « Réduire les animations »', () => {
    for (const name of ['export function Enter', 'export function Stagger', 'export function useCountUp', 'export function SuccessCheck', 'export function Breathe']) {
      expect(motion).toContain(name);
    }
    expect(motion.match(/useReducedMotion\(\)/g)?.length ?? 0).toBeGreaterThanOrEqual(6);
  });

  it('anime les écrans natifs avec le pilote natif partout où c’est possible', () => {
    const files = ['src/components/motion.tsx', 'src/components/voice-visuals.tsx', 'src/components/launch.tsx'];
    for (const file of files) {
      const source = read(file);
      const timings = source.match(/useNativeDriver: (true|false)/g) ?? [];
      const nonNative = timings.filter((entry) => entry.endsWith('false'));
      // Seul le compteur numérique (texte) passe par le pilote JavaScript.
      expect(nonNative.length, file).toBeLessThanOrEqual(file.endsWith('motion.tsx') ? 1 : 0);
    }
  });
});

describe('états', () => {
  it('fait miroiter les squelettes et pose les états vides dans la marque', () => {
    const ui = read('src/components/ui.tsx');
    expect(ui).toContain('devisera-shimmer');
    expect(ui).toMatch(/export function EmptyState[\s\S]*<Enter distance=\{8\}>/);
    expect(ui).toContain('export function AnimatedAmount');
    expect(ui).toContain('export function AnimatedCount');
  });

  it('célèbre une réussite d’une coche qui se pose', () => {
    expect(read('src/components/toast.tsx')).toContain('<SuccessCheck');
    expect(read('app/devis/nouveau.tsx')).toContain('Votre devis est prêt');
  });

  it('donne à la dictée des anneaux et une onde pendant l’écoute', () => {
    const nouveau = read('app/devis/nouveau.tsx');
    expect(nouveau).toContain('<ListeningRings');
    expect(nouveau).toContain('<Waveform');
    expect(nouveau).toContain('shadows.glow');
  });

  it('ajoute un retour de réussite aux actions qui comptent', () => {
    expect(read('app/(app)/clients.tsx')).toMatch(/toast\(\{ title: en \? 'Client added'/);
    expect(read('app/catalogue.tsx')).toContain("toast({ title: existing ? 'Prestation mise à jour'");
    expect(read('app/compte.tsx')).toMatch(/toast\(\{ title: en \? 'Name saved'/);
  });
});

describe('barre de navigation', () => {
  it('keeps the whole client activity row accessible and tappable', () => {
    const profile = read('app/clients/[id].tsx');
    expect(profile).toContain('<Pressable key={event.id} accessibilityRole="button"');
    expect(profile).toContain('minHeight: 44');
    expect(profile).toContain('params: { id: event.quoteId }');
    expect(profile).not.toMatch(/<Ionicons[^>]*onPress=/);
  });
  it('efface l’indicateur sur une route masquée au lieu de retomber sur Accueil', () => {
    const bar = read('src/components/glass-tab-bar.tsx');
    expect(bar).toContain('const unselected = activeIndex < 0;');
  });

  /*
   * La barre est passée au verre natif d'iOS 26. Ce qui compte n'est pas
   * qu'elle l'utilise, mais qu'elle sache s'en passer : un iPhone sous iOS 18
   * et un réglage « Réduire la transparence » doivent rester lisibles.
   */
  it('n’impose le verre que là où le système le fournit, et le rend à l’accessibilité', () => {
    const glass = read('src/components/glass.tsx');
    expect(glass).toContain('isLiquidGlassAvailable()');
    expect(glass).toContain('isReduceTransparencyEnabled');
    expect(glass).toContain("reduceTransparencyChanged");
    // Trois niveaux : verre natif, flou natif, surface opaque.
    for (const kind of ["'liquid'", "'blur'", "'solid'"]) expect(glass).toContain(kind);
    // Jamais de faux verre : pas de rectangle translucide bordé de blanc.
    expect(glass).not.toMatch(/borderColor:\s*'rgba\(255,\s*255,\s*255/);
    const bar = read('src/components/glass-tab-bar.tsx');
    expect(bar).toContain('useReducedMotion');
    /*
     * La lentille n'utilise plus de ressort : un ressort donne une durée
     * proportionnelle à la distance, et la traversée d'un bout à l'autre de la
     * barre y traînait. Elle suit une courbe plafonnée à 220 ms.
     */
    expect(read('src/components/tab-lens-motion.ts')).toContain('withTiming(destination');
  });
});
