import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  NOTIFICATION_CATEGORIES,
  categoryForNotificationType,
  readNotificationPreferences,
} from '@devisia/shared';
import { DARK, LIGHT } from '../../mobile/src/theme/palette';

const read = (path: string) => readFileSync(path, 'utf8');
/**
 * Le fichier sans ses commentaires.
 *
 * Plusieurs de ces tests vérifient l'**absence** d'un motif. Les commentaires
 * expliquent justement le défaut corrigé et citent l'ancien code : les lire
 * ferait échouer le test pour la raison inverse de celle qu'il cherche.
 */
const code = (source: string) => source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
const mobile = (path: string) => read(`mobile/${path}`);
const server = (path: string) => read(`src/${path}`);

/**
 * La passe du build 56.
 *
 * Ces tests lisent des fichiers plus souvent qu'ils n'exécutent du code : ils
 * ne prouvent pas qu'un écran est beau, ils empêchent qu'un défaut corrigé
 * revienne sans que personne ne le voie. Chacun nomme le défaut qu'il garde
 * fermé.
 */

describe('les raccourcis de l’accueil ne détournent plus la navigation', () => {
  /*
   * « Mes factures » menait à `/(app)/devis?onglet=factures` : l'application
   * basculait sur l'onglet Documents, et l'artisan parti de l'accueil se
   * retrouvait ailleurs sans retour possible.
   */
  it('pousse /factures au lieu de changer d’onglet', () => {
    const actions = mobile('src/components/quick-actions.tsx');
    expect(actions).toContain("href: '/factures'");
    expect(code(actions)).not.toContain('onglet=factures');
  });

  it('propose la signature depuis l’accueil', () => {
    expect(mobile('src/components/quick-actions.tsx')).toContain("href: '/signature'");
  });

  /*
   * L'encaissement des factures par le client de l'artisan a été retiré de
   * l'interface au build 57 : « mes clients » désignait les artisans abonnés à
   * DEVISERA, pas les clients de l'artisan. L'infrastructure serveur reste,
   * l'application n'en propose plus rien.
   */
  it('ne propose plus de faire régler une facture par carte', () => {
    const tools = mobile('app/(app)/outils.tsx');
    expect(code(tools)).not.toContain("href: '/encaissement'");
    expect(code(tools)).not.toContain("href: '/paiements'");

    const board = mobile('src/components/invoice-board.tsx');
    expect(code(board)).not.toContain('Encaisser');
    expect(code(board)).not.toContain('invoicePayments');
    expect(code(board)).not.toContain('pay by card');

    // Et l'écran d'activation n'est plus une route de l'application.
    expect(code(mobile('app/_layout.tsx'))).not.toContain('name="encaissement"');
  });
});

describe('le micro ne s’arme pas tout seul', () => {
  /*
   * Appuyer sur « + » ouvrait l'écran de dictée **et démarrait
   * l'enregistrement**. Ouvrir n'est pas consentir à être écouté.
   */
  it('n’appelle plus dictation.start() à l’ouverture', () => {
    const screen = mobile('app/devis/nouveau.tsx');
    expect(code(screen)).not.toContain('autoDictated');
    expect(screen).toContain("const invited = dicter === '1'");
    // Le seul démarrage restant est celui du bouton, sous le doigt.
    const starts = screen.match(/dictation\.start\(\)/g) ?? [];
    expect(starts.length).toBeLessThanOrEqual(2);
  });

  it('annonce que le micro est prêt, pas qu’il écoute', () => {
    expect(mobile('app/devis/nouveau.tsx')).toContain('Prêt — appuyez pour parler');
  });
});

describe('apparence', () => {
  it('propose trois choix et les conserve', () => {
    const appearance = mobile('src/lib/appearance.tsx');
    expect(appearance).toContain("export type AppearanceChoice = 'system' | 'light' | 'dark'");
    expect(appearance).toContain('SecureStore.setItemAsync');
    // « Automatique » doit suivre l'iPhone en direct.
    expect(appearance).toContain('useColorScheme');
  });

  /*
   * Un mode sombre obtenu en inversant le clair donne du noir pur et un bleu
   * qui disparaît. Ces trois règles décrivent une palette conçue.
   */
  it('n’est pas une inversion du thème clair', () => {
    // Le fond n'est pas noir pur.
    expect(DARK.surface).not.toBe('#000000');
    // Les surfaces montent : une carte est plus claire que la page.
    const luminance = (hex: string) => parseInt(hex.slice(1, 3), 16) + parseInt(hex.slice(3, 5), 16) + parseInt(hex.slice(5, 7), 16);
    expect(luminance(DARK.canvas)).toBeGreaterThan(luminance(DARK.surface));
    expect(luminance(LIGHT.canvas)).toBeGreaterThan(luminance(LIGHT.surface));
    // L'accent s'éclaircit : le bleu de marque tombe sous le seuil de
    // lisibilité sur fond sombre.
    expect(luminance(DARK.accent)).toBeGreaterThan(luminance(LIGHT.accent));
    // L'encre du bandeau de marque reste blanche dans les deux thèmes.
    expect(DARK.white).toBe('#FFFFFF');
  });

  it('applique la palette avant de rendre les enfants, pas dans un effet', () => {
    const appearance = mobile('src/lib/appearance.tsx');
    const applyIndex = appearance.indexOf('applyScheme(scheme);');
    const providerIndex = appearance.indexOf('<AppearanceContext.Provider');
    expect(applyIndex).toBeGreaterThan(0);
    expect(applyIndex).toBeLessThan(providerIndex);
  });

  it('laisse iOS suivre l’apparence pour ce qu’il dessine lui-même', () => {
    expect(mobile('app.config.ts')).toContain("userInterfaceStyle: 'automatic'");
  });

  /*
   * `StyleSheet.create` fige les valeurs du premier rendu : une couleur du
   * thème posée là resterait claire après une bascule en sombre.
   */
  it('ne fige aucune couleur de thème dans une feuille de styles', () => {
    const atmosphere = mobile('src/components/brand-atmosphere.tsx');
    expect(code(atmosphere)).not.toContain('StyleSheet.create');
    // Les arrêts sont relus à chaque rendu, depuis la palette courante : c'est
    // ce qui fait que le bas du dégradé vaut toujours la couleur de page.
    expect(atmosphere).toContain('const surface = colors.surface;');
  });

  /*
   * Le même piège, au niveau module.
   *
   * `const BADGE_TONES = { neutral: { bg: colors.surface2 } }` est évalué une
   * fois à l'import : la palette du premier rendu y reste gravée. C'est ce qui
   * laissait des pastilles blanches au milieu de l'interface sombre. Toute
   * table de couleurs doit être une fonction, relue à chaque rendu.
   */
  it('ne capture aucune couleur dans une constante de module', () => {
    const files = [
      'src/components/ui.tsx',
      'src/components/toast.tsx',
      'src/components/invoice-board.tsx',
      'src/components/glass-tab-bar.tsx',
    ];
    for (const file of files) {
      const source = code(mobile(file));
      // Une déclaration `const NOM = { … colors.x … }` au niveau module.
      const frozen = source.match(/^const [A-Z][A-Z0-9_]* *(?::[^=]*)?= *\{[^}]*(?:\{[^}]*\}[^}]*)*colors\./m);
      expect(frozen, `${file} fige une couleur au niveau module`).toBeNull();
    }
  });
});

describe('notifications', () => {
  it('ne propose que des catégories réellement émises par le serveur', () => {
    /*
     * Chaque `notify({ type: … })` du serveur doit tomber dans une catégorie,
     * sinon l'artisan couperait un interrupteur sans rien couper.
     */
    const sources = [
      'server/services/quoteService.ts',
      'server/services/invoiceService.ts',
      'server/services/followUpService.ts',
      'server/services/leadService.ts',
      'server/services/billingService.ts',
      'server/services/invoicePaymentWebhookService.ts',
    ];
    const emitted = new Set<string>();
    for (const path of sources) {
      const source = server(path);
      for (const match of source.matchAll(/type: '([A-Z_]+)'/g)) {
        // Les évènements de devis (`CREE`, `ENVOYE`…) portent le même nom de
        // champ sans être des notifications : on ne retient que ce que
        // `NotificationType` connaît.
        if (categoryForNotificationType(match[1])) emitted.add(match[1]);
      }
    }
    expect(emitted.size).toBeGreaterThan(4);
    for (const type of emitted) {
      expect(categoryForNotificationType(type)).not.toBeNull();
    }
  });

  it('allume tout par défaut, et ne retient que ce qui est coupé', () => {
    expect(readNotificationPreferences(null)).toEqual(DEFAULT_NOTIFICATION_PREFERENCES);
    expect(readNotificationPreferences({ quoteViewed: false }).quoteViewed).toBe(false);
    expect(readNotificationPreferences({ quoteViewed: false }).paymentReceived).toBe(true);
    // Une catégorie inconnue enregistrée par une ancienne version est ignorée.
    expect(readNotificationPreferences({ inventé: false })).toEqual(DEFAULT_NOTIFICATION_PREFERENCES);
  });

  /*
   * Filtrer à l'arrivée aurait laissé la bannière s'afficher : le tri doit se
   * faire avant l'envoi.
   */
  it('trie les appareils avant d’envoyer, pas après', () => {
    const service = server('server/services/notificationService.ts');
    expect(service).toContain('categoryForNotificationType(input.type)');
    expect(service).toContain('tokens: allowed.map((device) => device.token)');
  });

  it('émet réellement la facture en retard qui a un interrupteur', () => {
    expect(NOTIFICATION_CATEGORIES).toContain('invoiceOverdue');
    expect(server('server/services/invoiceService.ts')).toContain("type: 'FACTURE_EN_RETARD'");
    expect(server('app/api/cron/relances/route.ts')).toContain('notifyOverdueInvoices');
  });

  it('n’invente pas de pouvoir sur l’autorisation iOS', () => {
    const screen = mobile('app/notifications.tsx');
    expect(screen).toContain('Linking.openSettings');
    expect(screen).toContain('Ouvrir les réglages');
  });
});

describe('barre d’onglets', () => {
  /*
   * Chaque onglet avait son propre ressort, démarré par un effet React : trois
   * animations désynchronisées partaient en même temps que la capsule, ce qui
   * donnait un clignotement au lieu d'un déplacement.
   */
  it('déduit l’état des icônes de la position de la capsule', () => {
    const bar = mobile('src/components/glass-tab-bar.tsx');
    expect(bar).toContain('const presence = useDerivedValue');
    expect(bar).toContain('Math.abs(centre.value - own)');
    expect(code(bar)).not.toContain('progress.value = reduced');
  });

  it('étire la capsule dans le sens de sa course', () => {
    const bar = mobile('src/components/glass-tab-bar.tsx');
    expect(bar).toContain('const stretch = useDerivedValue');
    expect(bar).toContain('scaleX: 1 + stretch.value');
    // Déduit de la distance restante, donc de la vitesse — jamais d'un
    // minuteur, sans quoi une course interrompue garderait l'ancienne forme.
    expect(bar).toContain('Math.abs(target.value - centre.value)');
  });

  /*
   * Une vue d'effet natif imbriquée dans une autre ne suit pas une
   * transformation animée de façon fiable : le matériau se redessine à sa
   * position finale et la lentille « apparaît ailleurs » au lieu de glisser.
   * La composition est donc celle d'iOS — le plateau est le verre, la lentille
   * est une teinte posée dessus, et c'est elle qui bouge.
   */
  it('garde le verre pour le plateau et une teinte pour la lentille', () => {
    const bar = mobile('src/components/glass-tab-bar.tsx');
    expect(bar.match(/<GlassSurface/g)?.length).toBe(1);
    const lens = bar.slice(bar.indexOf('La lentille : une seule vue'));
    expect(lens).toContain('backgroundColor: lensColor');
    expect(lens).not.toContain('<GlassSurface');
  });
});

describe('le bleu rejoint le fond au lieu de s’arrêter dessus', () => {
  /*
   * Le dégradé descendait vers le blanc quel que soit le thème : sur fond de
   * nuit, il dessinait une bande lumineuse au milieu de l'écran. Et son
   * dernier arrêt ne valait pas la couleur de page, ce qui laissait une ligne
   * là où il n'aurait rien dû y avoir.
   */
  it('termine exactement sur la couleur de page du thème courant', () => {
    const atmosphere = mobile('src/components/brand-atmosphere.tsx');
    expect(atmosphere).toContain('const surface = colors.surface;');
    expect(atmosphere).toContain('mix(BRAND_TOP, surface, ease(fade))');
  });

  it('réserve un fondu vide sous le contenu, pour qu’aucun intitulé n’y tombe', () => {
    const atmosphere = mobile('src/components/brand-atmosphere.tsx');
    expect(atmosphere).toContain('const FADE = 176');
    expect(atmosphere).toContain('style={{ height: fade }}');
  });
});

describe('signature de l’entreprise', () => {
  it('a son propre écran, et Ma marque n’y renvoie que par un lien', () => {
    expect(mobile('app/signature.tsx')).toContain('purpose="business"');
    const marque = mobile('app/marque.tsx');
    expect(marque).toContain("router.push('/signature')");
    expect(code(marque)).not.toContain('<SignatureSheet');
  });

  it('ne demande plus de tendre le téléphone quand c’est l’artisan qui signe', () => {
    const pad = mobile('src/components/signature-pad.tsx');
    expect(pad).toContain("purpose === 'business'");
    const business = pad.slice(pad.indexOf("purpose === 'business'"), pad.indexOf('Tendez le téléphone'));
    expect(business).toContain('comme sur papier');
  });

  /*
   * Le rendu lisait la signature vivante du profil : remplacer sa signature
   * changeait rétroactivement des devis déjà reçus par des clients.
   */
  it('fige le tracé sur le document au moment de l’envoi', () => {
    expect(server('server/services/brandingService.ts')).toContain('export async function issuerSignatureSnapshot');
    expect(server('server/services/quoteService.ts')).toContain('await issuerSignatureSnapshot(organizationId)');
    expect(server('server/services/invoiceService.ts')).toContain('await issuerSignatureSnapshot(organizationId)');
  });

  it('fait primer l’instantané sur la signature courante au rendu', () => {
    const pdf = server('server/services/quotePdfService.ts');
    expect(pdf).toContain('function issuerSignature(');
    expect(pdf).toContain('if (document.issuerSignaturePath)');
    expect(pdf).toContain('businessSignature: issuerSignature(quote, profile)');
    expect(pdf).toContain('businessSignature: issuerSignature(invoice, profile)');
  });
});

describe('encaissement et connexions, rendus vérifiables', () => {
  it('ne parle plus de paiement sur la liste des factures', () => {
    const board = mobile('src/components/invoice-board.tsx');
    expect(code(board)).not.toContain('CollectionState');
    // La liste des factures parle des factures, et de rien d'autre.
    expect(board).toContain('No invoices yet');
  });

  it('expose l’état de configuration sans divulguer de secret', () => {
    const health = server('app/api/health/route.ts');
    expect(health).toContain('checks.payments');
    expect(health).toContain('connectWebhook');
    expect(health).toContain('checks.signIn');
    // Des booléens et un décompte, jamais une clé.
    expect(health).not.toContain('STRIPE_SECRET_KEY,');
    expect(health).toContain('splitAudiences(env().GOOGLE_SIGN_IN_CLIENT_IDS).length');
  });
});
