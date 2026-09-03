import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Aucun nom de groupe de routes ne doit atteindre l'écran.
 *
 * Constaté sur iPhone : le détail d'un devis affichait « ‹ (app) ». Sans
 * intitulé explicite, iOS reprend le titre de l'écran précédent pour le bouton
 * retour, et ce titre est le nom du groupe. Le défaut se répare une fois dans
 * les options communes ; ces cas empêchent qu'il revienne par un écran ajouté
 * plus tard.
 */
const MOBILE = path.resolve(__dirname, '../../mobile');
const LAYOUT = readFileSync(path.join(MOBILE, 'app/_layout.tsx'), 'utf8');

function ecrans(dossier: string, trouves: string[] = []): string[] {
  for (const entree of readdirSync(dossier)) {
    const complet = path.join(dossier, entree);
    if (statSync(complet).isDirectory()) ecrans(complet, trouves);
    else if (entree.endsWith('.tsx')) trouves.push(complet);
  }
  return trouves;
}

describe('navigation iOS', () => {
  it('pose un intitulé de retour par défaut pour toute la pile', () => {
    expect(LAYOUT).toMatch(/screenOptions=\{\{[\s\S]*headerBackTitle:\s*'Retour'/);
  });

  it('donne un titre à chaque écran dont l’en-tête est visible', () => {
    const declarations = LAYOUT.match(/<Stack\.Screen[\s\S]*?\/>/g) ?? [];
    const avecEntete = declarations.filter((d) => d.includes('headerShown: true'));
    expect(avecEntete.length).toBeGreaterThan(0);
    for (const d of avecEntete) expect(d, d.slice(0, 90)).toMatch(/title:\s*'/);
  });

  it('n’affiche jamais un nom de groupe comme texte d’interface', () => {
    const suspect = /(?:title|headerBackTitle|headerTitle)\s*:\s*'[^']*\((?:app|auth|public)\)/;
    for (const fichier of ecrans(path.join(MOBILE, 'app'))) {
      const contenu = readFileSync(fichier, 'utf8');
      expect(suspect.test(contenu), path.relative(MOBILE, fichier)).toBe(false);
    }
  });

  it('nomme les écrans atteints depuis « Plus »', () => {
    for (const titre of ['Catalogue de prix', 'Mon entreprise', 'Activité', 'Abonnement', 'Devis']) {
      expect(LAYOUT).toContain(`title: '${titre}'`);
    }
  });
});
