import { afterEach, describe, expect, it } from 'vitest';
import { LAUNCH, claimLaunch, holdFor, resetLaunchClaim, revealAt, revealDurationFor, shouldShowWaitingHint } from '../../mobile/src/lib/launch-timing';

/**
 * Rythme du lancement.
 *
 * Constaté sur iPhone : la séquence précédente était invisible, parce que
 * l'écran de lancement était démonté dès que la session locale était lue —
 * bien avant la fin de son animation. Ces cas figent le contrat : un minimum
 * perçu, aucune attente artificielle au-delà, une seule séquence par
 * processus, et une durée totale entre 0,8 et 1,7 seconde.
 */
describe('rythme du lancement', () => {
  afterEach(() => resetLaunchClaim());

  it('ne révèle jamais avant le minimum perçu, même si le démarrage est prêt tout de suite', () => {
    const startedAt = 10_000;
    const at = revealAt({ startedAt, readyAt: startedAt + 40, repeat: false, reducedMotion: false });
    expect(at).toBe(startedAt + LAUNCH.holdColdMs);
  });

  it('révèle dès que le démarrage est prêt quand il dépasse le minimum : aucun délai ajouté', () => {
    const startedAt = 10_000;
    const readyAt = startedAt + 2_400;
    expect(revealAt({ startedAt, readyAt, repeat: false, reducedMotion: false })).toBe(readyAt);
  });

  it('attend tant que le démarrage n’est pas prêt', () => {
    expect(revealAt({ startedAt: 0, readyAt: null, repeat: false, reducedMotion: false })).toBeNull();
  });

  it('est plus vif aux lancements suivants, et plus court encore avec « Réduire les animations »', () => {
    expect(holdFor({ repeat: true, reducedMotion: false })).toBeLessThan(holdFor({ repeat: false, reducedMotion: false }));
    expect(holdFor({ repeat: false, reducedMotion: true })).toBeLessThan(holdFor({ repeat: true, reducedMotion: false }));
    expect(revealDurationFor({ reducedMotion: true })).toBeLessThan(revealDurationFor({ reducedMotion: false }));
  });

  it('tient la durée totale entre 0,8 et 1,7 seconde dans tous les cas', () => {
    for (const repeat of [false, true]) {
      for (const reducedMotion of [false, true]) {
        const total = holdFor({ repeat, reducedMotion }) + revealDurationFor({ reducedMotion });
        expect(total).toBeGreaterThanOrEqual(800);
        expect(total).toBeLessThanOrEqual(1_700);
      }
    }
  });

  it('ne joue qu’une fois par processus : un retour d’arrière-plan ne rejoue rien', () => {
    expect(claimLaunch()).toBe(true);
    expect(claimLaunch()).toBe(false);
    expect(claimLaunch()).toBe(false);
  });

  it('signale l’attente seulement quand le démarrage traîne vraiment', () => {
    expect(shouldShowWaitingHint(1_000, 0, null)).toBe(false);
    expect(shouldShowWaitingHint(LAUNCH.waitingHintMs, 0, null)).toBe(true);
    expect(shouldShowWaitingHint(LAUNCH.waitingHintMs + 5_000, 0, 500)).toBe(false);
  });
});
