import { describe, expect, it } from 'vitest';
import { polishDraft, recognizeWork, subjectFromSentence, echoes } from '../../src/lib/ai/polish';
import { buildHeuristicQuoteDraft } from '../../src/lib/ai/heuristic';
import type { QuoteDraft } from '../../src/lib/ai/schemas';

const base = { catalog: [], hourlyRateCents: 4500, defaultVatRate: 20, trade: 'PLOMBIER' };
const draft = (over: Partial<QuoteDraft>): QuoteDraft => ({
  titre: 'x', resume: '', descriptionTravaux: [], materiaux: [], mainOeuvre: [], questions: [], alertes: [], observations: [], hypotheses: [], dureeEstimeeMinutes: null, confiance: 50, ...over,
});

describe('objet du devis', () => {
  it.each([
    ["J'ai une fuite sous l'évier, il faut enlever l'ancien siphon et mettre un nouveau siphon parce que ça fuit beaucoup.", 'Remplacement du siphon sous évier'],
    ['Le client veut repeindre tout le salon, plafond et murs, réparer les trous etc.', 'Remise en peinture du salon'],
    ['Remplacer quatre prises et installer un plafonnier.', 'Remplacement de prises et pose d’un plafonnier'],
    ['Remplacer une porte intérieure et ajuster le bâti.', 'Remplacement d’une porte intérieure'],
  ])('%s → %s', (raw, subject) => {
    expect(recognizeWork(raw)?.subject).toBe(subject);
    expect(buildHeuristicQuoteDraft({ ...base, description: raw }).titre).toBe(subject);
  });
  it('nominalises an unknown job instead of copying the sentence', () => {
    expect(subjectFromSentence("il faut remplacer la gouttière côté rue parce qu'elle est percée")).toBe('Remplacement de la gouttière côté rue');
    expect(subjectFromSentence('Le client veut que je répare le portail')).toBe('Réparation du portail');
    expect(subjectFromSentence("J'ai une fuite sous l'évier")).toBe('Fuite sous l\'évier');
    expect(subjectFromSentence('Bonjour, réfection de la terrasse en bois avec remplacement des lambourdes, ponçage et traitement de toutes les lames')).toBe('Réfection de la terrasse en bois avec remplacement des');
    expect(subjectFromSentence('a fait tout refaire')).not.toMatch(/…/);
  });
});

describe('une seule source par notion', () => {
  const raw = "A une fuite sous l'évier remplacé le siphon et le mur je dois le peindre rose le mur, il fait 4 m longueur. Quelle surface à peindre et combien de couches prévues ? 4 couches et 4m longueur.";
  it('the degraded engine never echoes the dictation in the summary or the labour line', () => {
    const d = buildHeuristicQuoteDraft({ ...base, description: raw });
    expect(d.resume).toBe('');
    expect(d.titre).toBe('Remplacement du siphon sous évier');
    expect(d.mainOeuvre[0]!.description).toContain('Dépose du siphon existant');
    expect(d.mainOeuvre[0]!.description).not.toMatch(/d'après votre description/);
    expect(d.descriptionTravaux).toEqual(['Dépose du siphon existant', 'Fourniture et pose d’un siphon neuf', 'Mise en eau et contrôle d’étanchéité']);
  });
  it('drops an AI summary that repeats the dictation, a question, or the title, and keeps a useful one', () => {
    expect(polishDraft(draft({ titre: 'Remplacement du siphon', resume: raw }), { description: raw }).resume).toBe('');
    expect(polishDraft(draft({ titre: 'Remplacement du siphon', resume: 'Quelle surface à peindre ?' }), { description: raw }).resume).toBe('');
    expect(polishDraft(draft({ titre: 'Remplacement du siphon', resume: 'Remplacement du siphon' }), { description: raw }).resume).toBe('');
    expect(polishDraft(draft({ titre: 'Remplacement du siphon', resume: 'Accès par la cave, coupure d’eau générale nécessaire.' }), { description: raw }).resume).toBe('Accès par la cave, coupure d’eau générale nécessaire.');
  });
  it('replaces a conversational AI title and strips work items already carried by the lines', () => {
    const p = polishDraft(draft({
      titre: "Le client veut que je remplace le siphon parce que ça fuit",
      mainOeuvre: [{ designation: 'Dépose du siphon existant', description: null, heures: 1, tauxHoraire: 45, referenceCatalogue: null }],
      descriptionTravaux: ['Dépose du siphon existant', 'Coupure d’eau au compteur', raw],
    }), { description: raw });
    expect(p.titre).toBe('Remplacement du siphon sous évier');
    expect(p.descriptionTravaux).toEqual(['Coupure d’eau au compteur']);
  });
  it('keeps professional titles and line items the artisan or the AI already wrote', () => {
    const p = polishDraft(draft({ titre: 'Remise en peinture du salon', mainOeuvre: [{ designation: 'Application de deux couches, murs et plafond', description: 'Peinture acrylique mate', heures: 6, tauxHoraire: 45, referenceCatalogue: null }] }), { description: 'Repeindre le salon, murs et plafond, reboucher quelques trous.' });
    expect(p.titre).toBe('Remise en peinture du salon');
    expect(p.mainOeuvre[0]!.designation).toBe('Application de deux couches, murs et plafond');
    expect(p.mainOeuvre[0]!.description).toBe('Peinture acrylique mate');
  });
  it('detects echoes without flagging short professional phrases', () => {
    expect(echoes(raw, raw)).toBe(true);
    expect(echoes('Contrôle d’étanchéité', raw)).toBe(false);
  });
});

describe('send result contract', () => {
  it('the send route returns the provider acceptance flag and the app only fails on an explicit false', async () => {
    const { readFileSync } = await import('node:fs');
    expect(readFileSync('src/app/api/quotes/[id]/envoi/route.ts', 'utf8')).toContain('delivered: result.delivered,');
    const screen = readFileSync('mobile/app/devis/[id].tsx', 'utf8');
    expect(screen).toContain('if (result.delivered === false)');
    expect(screen).toContain("title: en ? 'Quote sent' : 'Devis envoyé'");
    expect(screen).not.toContain('Devis marqué comme envoyé');
    expect(readFileSync('mobile/app/devis/nouveau.tsx', 'utf8')).toContain('summary: draft.summary.trim() || null,');
  });
});
