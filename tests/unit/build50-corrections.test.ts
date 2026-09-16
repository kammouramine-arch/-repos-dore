import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const read = (path: string) => readFileSync(path, 'utf8');
const mobile = (path: string) => read(`mobile/${path}`);

/**
 * Les six reproches de la passe Build 50.
 *
 * Chacun porte sur une fonction qui existait dans le code mais que personne ne
 * trouvait, ou qui ne faisait pas ce qu'elle annonçait. Ces tests lisent les
 * fichiers plutôt que de monter l'application : ils ne prouvent pas que
 * l'écran est beau, ils empêchent qu'une fonction redevienne invisible.
 */

describe('tarifs', () => {
  it('ne montre le tarif de lancement qu’une fois Apple et Stripe repricés', async () => {
    const { PLANS, effectiveMonthlyPriceCents, LAUNCH_PRICING_LIVE } = await import('../../packages/shared/src/plans');
    // Le code porte les deux tarifs ; seul celui qui est facturé s'affiche.
    expect(PLANS.ESSENTIEL.launchMonthlyPriceCents).toBe(2999);
    expect(PLANS.PRO.launchMonthlyPriceCents).toBe(5999);
    expect(PLANS.ENTREPRISE.launchMonthlyPriceCents).toBe(9999);
    expect(LAUNCH_PRICING_LIVE).toBe(false);
    expect(effectiveMonthlyPriceCents('ESSENTIEL')).toBe(3900);
    expect(effectiveMonthlyPriceCents('ESSENTIEL', true)).toBe(2999);
  });

  it('formate l’euro comme le relevé fait sur l’appareil, sans passer par Intl', async () => {
    const { formatEurosPlain } = await import('../../packages/shared/src/money');
    expect(formatEurosPlain(2999)).toBe('29,99 €');
    expect(formatEurosPlain(3900)).toBe('39,00 €');
    expect(formatEurosPlain(14900)).toBe('149,00 €');
  });
});

describe('navigation', () => {
  it('expose les documents et les outils comme destinations, pas comme réglages', () => {
    const bar = mobile('src/components/glass-tab-bar.tsx');
    expect(bar).toContain("copy(locale, 'documents')");
    expect(bar).toContain("copy(locale, 'tools')");

    // L'onglet Documents porte les devis ET les factures.
    const documents = mobile('app/(app)/devis.tsx');
    expect(documents).toContain('<Segmented');
    expect(documents).toContain('InvoiceBoard');

    // Et l'accueil met les mêmes fonctions sous le pouce.
    const quick = mobile('src/components/quick-actions.tsx');
    for (const href of ["'/depenses'", "'/comptable'", "'/marque'"]) expect(quick).toContain(href);
    expect(mobile('app/(app)/index.tsx')).toContain('<QuickActions');
  });
});

describe('première ouverture', () => {
  it('propose la voix puis l’exploration, et ne revient jamais', () => {
    const screen = mobile('app/pret.tsx');
    expect(screen).toContain('Votre atelier est prêt.');
    expect(screen).toContain('Créer mon premier devis à la voix');
    expect(screen).toContain('Explorer DEVISERA');
    // L'action principale ouvre le parcours vocal, pas un formulaire vide.
    expect(screen).toContain("router.replace(voice ? '/(app)?voix=1' : '/(app)')");
    expect(screen).toContain('clearWorkshopReady');
    expect(mobile('app/(app)/index.tsx')).toContain("voix !== '1'");
  });

  it('n’est dû qu’après une configuration réelle, jamais déduit de l’ancienneté', () => {
    const firstRun = mobile('src/lib/first-run.ts');
    expect(firstRun).toContain('export function markWorkshopReady');
    expect(firstRun).toContain('export function appEntry');
    // Le marqueur est posé à la fin de la configuration, aux deux entrées.
    expect(mobile('app/bienvenue.tsx')).toContain('markWorkshopReady(fresh.user.id)');
    expect(mobile('app/(auth)/inscription.tsx')).toContain('markWorkshopReady(session.user.id)');
    // Une reconnexion ordinaire passe par appEntry, qui rend '/(app)'.
    expect(firstRun).toContain("return isWorkshopReadyPending(session.user.id) ? '/pret' : '/(app)';");
  });
});

describe('signature', () => {
  it('se trace en plein écran, s’annule trait par trait et refuse une feuille vide', () => {
    const pad = mobile('src/components/signature-pad.tsx');
    expect(pad).toContain('export function SignatureSheet');
    expect(pad).toContain('<Modal');
    expect(pad).toContain("presentationStyle={Platform.OS === 'ios' ? 'fullScreen' : undefined}");
    // Annuler le dernier trait, tout effacer, annuler la signature.
    expect(pad).toContain('const undo =');
    expect(pad).toContain('const clear =');
    expect(pad).toContain('onCancel');
    // Et l'échelle est unique sur les deux axes : pas de signature écrasée.
    expect(pad).toContain('Math.min(width / VIEWBOX_WIDTH, height / VIEWBOX_HEIGHT)');
    // Le trait est lissé par des quadratiques, pas par des segments droits.
    expect(mobile('src/lib/signature-geometry.ts')).toContain('Q ${p(at(index))}');
  });

  it('refuse un appui accidentel et accepte une vraie signature', async () => {
    const { isSignature } = await import('../../mobile/src/lib/signature-geometry');
    const tap = [[{ x: 500, y: 200 }, { x: 502, y: 201 }]];
    expect(isSignature(tap)).toBe(false);
    const scribble = [Array.from({ length: 40 }, (_, index) => ({ x: 200 + index * 12, y: 200 + (index % 5) * 9 }))];
    expect(isSignature(scribble)).toBe(true);
  });

  it('écrit le tracé sur le PDF à la taille de sa boîte englobante', () => {
    const pdf = read('src/lib/pdf/quote-pdf.ts');
    expect(pdf).toContain('function strokeBounds');
    expect(pdf).toContain('MAX_SIGNATURE_SCALE');
    // Le bloc nomme qui a accepté et quand, dans les deux langues.
    expect(pdf).toContain("acceptedBy: 'ACCEPTÉ PAR'");
    expect(pdf).toContain("acceptedBy: 'ACCEPTED BY'");
    // Et il dit ce que vaut cette acceptation. Rien de ce qui est *imprimé*
    // ne parle de signature qualifiée ou certifiée : ce serait faux au sens
    // d'eIDAS. Les commentaires, eux, ont le droit de nommer ce qu'on évite.
    expect(pdf).toContain('electronicNotice');
    const printed = pdf.replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '');
    expect(printed).not.toMatch(/signature (qualifiée|certifiée|qualified|certified)/i);
  });
});

describe('marque', () => {
  it('laisse changer le nom, le logo, la couleur et le modèle, et le PDF les lit', () => {
    const screen = mobile('app/marque.tsx');
    expect(screen).toContain('pickLogo');
    expect(screen).toContain('removeLogo');
    expect(screen).toContain('<DocumentPreview');
    expect(screen).toContain("{ legalName: currentName.trim() }");

    // Le contrat et le service portent le nom jusqu'à la base…
    expect(read('src/app/api/marque/route.ts')).toContain('legalName: z.string()');
    expect(read('src/server/services/brandingService.ts')).toContain('{ legalName: input.legalName.trim() }');
    // …et le rendu PDF lit bien logo, couleur et modèle enregistrés.
    const service = read('src/server/services/quotePdfService.ts');
    expect(service).toContain('brandColor: profile?.brandColor');
    expect(service).toContain('logo,');
    expect(service).toContain("effectiveTemplate((profile?.documentTemplate ?? 'MODERNE')");
  });
});

describe('reçus et comptable', () => {
  it('offre l’appareil photo et la photothèque, et n’invente jamais une devise', () => {
    const screen = mobile('app/depenses.tsx');
    expect(screen).toContain('photos.takePhoto()');
    expect(screen).toContain('photos.pickPhotos()');
    expect(screen).toContain("'Scanner un reçu'");
    // Les champs illisibles sont signalés, pas remplis.
    expect(screen).toContain('draft.parsed?.missing');
    expect(screen).toContain("draft.parsed.currency !== 'EUR'");
  });

  it('prépare un envoi comptable daté et lisible avant de partager', () => {
    const screen = mobile('app/comptable.tsx');
    expect(screen).toContain('api.accounting.preview');
    expect(screen).toContain("datasets: ['sales', 'expenses', 'payments']");
    expect(screen).toContain('Sharing.shareAsync');
  });
});
