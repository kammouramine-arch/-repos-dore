import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const read = (path: string) => readFileSync(path, 'utf8');
const mobile = (path: string) => read(`mobile/${path}`);

/**
 * La passe de finition du build 55.
 *
 * Trois défauts constatés sur l'appareil, et deux fonctions ajoutées. Ces
 * tests lisent les fichiers : ils ne prouvent pas qu'un écran est beau, ils
 * empêchent qu'un défaut corrigé revienne sans qu'on le voie.
 */

describe('calques qui restaient collés', () => {
  /*
   * Le bandeau de marque était en position absolue **par rapport à l'écran**,
   * donc immobile pendant que le contenu défilait par-dessus. Les intitulés de
   * section, gris, traversaient un champ bleu et devenaient illisibles.
   */
  it('fait suivre le bandeau au défilement, au lieu de le clouer au cadre', () => {
    const backdrop = mobile('src/components/brand-backdrop.tsx');
    expect(backdrop).toContain('useAnimatedScrollHandler');
    expect(backdrop).toContain('export function useBrandScroll');
    // La parallaxe a cédé la place à la compression (voir build56-polish) :
    // le bandeau se referme ancré en haut au lieu de glisser, et son bord bas
    // recule au moins aussi vite que le contenu.
    expect(backdrop).toContain('Math.max(0, 1 - y / height)');
    // Tiré vers le bas, il s'étire depuis le haut plutôt que de se déplacer.
    expect(backdrop).toContain('const factor = y < 0');

    for (const screen of ['app/(app)/index.tsx', 'app/(app)/plus.tsx']) {
      const source = mobile(screen);
      expect(source, screen).toContain('scrollY={brandScroll.scrollY}');
      expect(source, screen).toContain('onScroll={brandScroll.onScroll}');
      // L'en-tête blanc s'efface avant d'atteindre la zone claire du fondu.
      expect(source, screen).toContain('<BrandHeader');
    }
  });

  it('calcule le défilement sur le fil d’interface, pas en JavaScript', () => {
    const ui = mobile('src/components/ui.tsx');
    expect(ui).toContain('Reanimated.ScrollView');
    expect(ui).toContain('scrollEventThrottle={onScroll ? 1 : 16}');
  });
});

describe('mouvement', () => {
  it('parle un seul vocabulaire, court et sans rebond', () => {
    /*
     * Le module est lu plutôt qu'importé : il dépend de `Easing` de
     * Reanimated, qui a besoin du moteur natif. Ce qu'on vérifie ici sont des
     * valeurs littérales, elles se lisent très bien dans le texte.
     */
    const motion = mobile('src/theme/motion.ts');
    expect(motion).toContain('export const EASE_OUT');
    expect(motion).toContain('export const SPRING');
    // Rien au-delà de 420 ms : passé ce seuil on attend l'animation.
    const durations = motion.slice(motion.indexOf('export const DURATION'), motion.indexOf('export const SPRING'));
    for (const [, value] of durations.matchAll(/:\s*(\d+),/g)) {
      expect(Number(value)).toBeLessThanOrEqual(420);
    }
    // Amortissement élevé partout : les ressorts s'arrêtent sans osciller.
    for (const [, damping] of motion.matchAll(/damping: (\d+)/g)) {
      expect(Number(damping)).toBeGreaterThanOrEqual(20);
    }
    // La barre reprend ce vocabulaire au lieu de régler ses propres valeurs.
    expect(mobile('src/components/glass-tab-bar.tsx')).toContain('const SLIDE = SPRING.select;');
  });
});

describe('signature de l’entreprise', () => {
  /*
   * La signature manuscrite demandée est celle de l'artisan : il signe son
   * devis avant de l'envoyer, comme un document papier. L'acceptation du
   * client est une autre chose, et elle reste à part.
   */
  it('se trace une fois et vaut pour tous les documents émis', () => {
    expect(read('prisma/schema.prisma')).toContain('signatureStrokePath String?');
    const branding = read('src/server/services/brandingService.ts');
    // Même validation que le tracé du client : il finit dans un attribut `d`.
    expect(branding).toContain('assertStroke(input.signatureStrokePath)');
    expect(branding).toContain('signatureStrokePath: null, signatureName: null');
    // La signature a son écran depuis le build 56 ; Ma marque n'y renvoie que
    // par un lien.
    const signature = mobile('app/signature.tsx');
    expect(signature).toContain('<SignatureSheet');
    expect(signature).toContain('api.branding.update');
    expect(mobile('app/marque.tsx')).toContain("router.push('/signature')");
  });

  it('s’imprime sur le devis et sur la facture, avant l’acceptation du client', () => {
    const pdf = read('src/lib/pdf/quote-pdf.ts');
    expect(pdf).toContain('function drawBusinessSignature');
    expect(pdf).toContain("businessSignature: 'SIGNATURE DE L’ENTREPRISE'");
    // Dessinée avant le bloc d'acceptation : on voit d'abord qui s'engage.
    expect(pdf.indexOf('drawBusinessSignature(ctx, input);')).toBeLessThan(pdf.indexOf('drawAcceptance(ctx, input);'));
    // Les deux documents la reçoivent.
    // Les deux documents la reçoivent, via l'instantané figé à l'envoi.
    const service = read('src/server/services/quotePdfService.ts');
    expect(service.match(/businessSignature: issuerSignature\(/g)).toHaveLength(2);
  });

  it('ne pousse plus le client à signer sur le téléphone de l’artisan', () => {
    const screen = mobile('app/devis/[id].tsx');
    // L'action existe encore — elle est utile quand le client est là — mais
    // elle est secondaire, et n'est plus l'étape attendue du parcours.
    expect(screen).toContain("title=\"Recueillir l’accord du client\"");
    expect(screen).toContain('variant="ghost"');
    expect(screen).not.toContain('title="Faire signer le client"');
  });
});

describe('encaissement en ligne', () => {
  /*
   * Deux flux d'argent, jamais confondus : l'abonnement DEVISERA passe par
   * StoreKit, la facture de l'artisan par son propre compte.
   */
  it('garde l’abonnement et l’encaissement sur des routes distinctes', () => {
    const client = read('packages/shared/src/api-client.ts');
    expect(client).toContain("account: (refresh = false) =>");
    expect(client).toContain("publicUrl: (publicToken: string) => `${base}/facture/${publicToken}`");
    // L'abonnement garde les siennes, intactes.
    expect(client).toContain("'/api/billing/checkout'");
    expect(client).toContain("'/api/paiements/compte'");
  });

  it('confirme le règlement par le webhook signé, jamais par la redirection', () => {
    const button = read('src/app/facture/[token]/pay-button.tsx');
    /*
     * Le bouton demande une session, il ne la décrit pas : aucun corps de
     * requête, donc rien que le navigateur puisse changer. Le montant qu'il
     * affiche vient du rendu serveur et ne voyage jamais dans l'autre sens.
     */
    expect(button).toContain("fetch(`/api/public/facture/${token}/paiement`, { method: 'POST' })");
    expect(button).not.toMatch(/body:/);
    const service = read('src/server/services/paymentAccountService.ts');
    expect(service).toContain('const amountCents = balanceOf(invoice);');
    expect(service).toContain('devisiaInvoiceId: invoice.id');
    const webhook = read('src/server/services/invoicePaymentWebhookService.ts');
    expect(webhook).toMatch(/constructEvent|webhook_events|externalId/);
  });

  it('donne au client une page aux couleurs de l’artisan', () => {
    const page = read('src/app/facture/[token]/page.tsx');
    expect(read('src/app/facture/[token]/pay-button.tsx')).toContain('Payer cette facture');
    expect(page).toContain('invoice.brandColor');
    expect(page).toContain('invoice.logoUrl');
    // Aucune carte ne transite par DEVISERA, et la page le dit.
    expect(page).toContain('ne transitent jamais par DEVISERA');
  });
});
