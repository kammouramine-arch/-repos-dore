import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Aucun texte agrandi ne doit être rogné.
 *
 * Constaté sur iPhone : les prix d'abonnement — 39 €, 79 €, 149 € — étaient
 * coupés en haut et en bas. Les styles de base fixent un `lineHeight` ; une
 * taille de police surchargée à la hausse sans y toucher fait déborder la
 * glyphe de sa boîte. Le piège vaut aussi pour la mise à l'échelle
 * d'accessibilité, que `lineHeight` ne suit pas.
 */
const MOBILE = path.resolve(__dirname, '../../mobile');

/** Tailles des styles de base, telles que définies dans le thème. */
const BASES: Record<string, number> = {
  Body: 15,
  Muted: 13,
  Caption: 11.5,
  Heading: 18,
  Title: 27,
};

function fichiers(dossier: string, trouves: string[] = []): string[] {
  for (const entree of readdirSync(dossier)) {
    const complet = path.join(dossier, entree);
    if (statSync(complet).isDirectory()) fichiers(complet, trouves);
    else if (entree.endsWith('.tsx')) trouves.push(complet);
  }
  return trouves;
}

describe('typographie mobile', () => {
  it('protège les composants de texte contre un agrandissement rogné', () => {
    const ui = readFileSync(path.join(MOBILE, 'src/components/ui.tsx'), 'utf8');
    expect(ui).toContain('function sansRognage');
    // Le garde doit retirer l'interligne fixe, pas le recalculer au hasard.
    expect(ui).toMatch(/lineHeight:\s*undefined/);
  });

  it('n’agrandit aucun composant de texte au-delà de sa base sans protection', () => {
    const fautes: string[] = [];
    for (const fichier of [
      ...fichiers(path.join(MOBILE, 'app')),
      ...fichiers(path.join(MOBILE, 'src')),
    ]) {
      // Les commentaires citent parfois le motif qu'on traque : on ne lit que
      // le code.
      const contenu = readFileSync(fichier, 'utf8')
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/^\s*\/\/.*$/gm, '');
      for (const [composant, base] of Object.entries(BASES)) {
        const motif = new RegExp(`<${composant}[^>]*?fontSize:\\s*(\\d+(?:\\.\\d+)?)[^>]*?>`, 'gs');
        for (const trouve of contenu.matchAll(motif)) {
          const taille = Number(trouve[1]);
          // Une taille réduite tient toujours dans sa boîte. Une hausse est
          // sûre si l'appelant fixe lui-même l'interligne ; sinon, elle doit
          // passer par un composant dédié.
          const interligneFixe = /lineHeight:\s*\d/.test(trouve[0]);
          if (taille > base && !interligneFixe) {
            fautes.push(`${path.relative(MOBILE, fichier)} · <${composant} fontSize:${taille}>`);
          }
        }
      }
    }
    expect(fautes, fautes.join('\n')).toEqual([]);
  });

  it('rend le prix par un composant qui aligne montant et suffixe', () => {
    const ui = readFileSync(path.join(MOBILE, 'src/components/ui.tsx'), 'utf8');
    expect(ui).toMatch(/export function Price/);
    expect(ui).toMatch(/alignItems:\s*'baseline'/);
    const abonnement = readFileSync(path.join(MOBILE, 'app/abonnement.tsx'), 'utf8');
    expect(abonnement).toContain('<Price cents={plan.monthlyPriceCents}');
  });
});
