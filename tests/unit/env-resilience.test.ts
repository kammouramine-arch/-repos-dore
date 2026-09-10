import { afterEach, describe, expect, it, vi } from 'vitest';

/**
 * Une variable optionnelle mal saisie ne doit jamais faire tomber l'API.
 *
 * Constaté en production le 7 septembre 2026 : `/api/health` répondait 503
 * « database unavailable » en une milliseconde et l'inscription comme la
 * connexion répondaient 500, alors que la base répondait — `env()` levait sur
 * l'ensemble du schéma. Ces cas figent le comportement attendu : seule une
 * variable critique bloque, le reste se dégrade en le disant.
 */
async function charger(overrides: Record<string, string | undefined>) {
  vi.resetModules();
  const previous = { ...process.env };
  for (const [key, value] of Object.entries(overrides)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  const loaded = await import('@/lib/env');
  loaded.resetEnv();
  return {
    ...loaded,
    restore: () => {
      for (const key of Object.keys(process.env)) if (!(key in previous)) delete process.env[key];
      Object.assign(process.env, previous);
      loaded.resetEnv();
    },
  };
}

describe('configuration résiliente', () => {
  const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  afterEach(() => warn.mockClear());

  it('remplace un fournisseur email inconnu par le fournisseur console et le nomme', async () => {
    const loaded = await charger({ EMAIL_PROVIDER: 'Resend ' });
    try {
      expect(() => loaded.env()).not.toThrow();
      expect(loaded.env().EMAIL_PROVIDER).toBe('console');
      expect(loaded.configurationReport().ignored).toEqual(['EMAIL_PROVIDER']);
      expect(loaded.configurationReport().missing).toEqual([]);
      // Le nom est journalisé, jamais la valeur.
      const journal = JSON.stringify(warn.mock.calls);
      expect(journal).toContain('EMAIL_PROVIDER');
      expect(journal).not.toContain('Resend ');
    } finally {
      loaded.restore();
    }
  });

  it('accepte une adresse de réponse avec nom d’affichage, telle que Resend l’attend', async () => {
    // Constaté en production le 7 septembre 2026 : cette forme voulue était
    // rejetée par le schéma, puis classée « ignorée ».
    const loaded = await charger({ EMAIL_REPLY_TO: 'DEVISERA <contact@devisera.fr>', EMAIL_PROVIDER: 'console' });
    try {
      expect(loaded.env().EMAIL_REPLY_TO).toBe('DEVISERA <contact@devisera.fr>');
      expect(loaded.configurationReport().ignored).toEqual([]);
    } finally {
      loaded.restore();
    }
  });

  it('normalise les formes voisines d’une adresse de réponse', async () => {
    for (const [raw, expected] of [
      ['  contact@devisera.fr ', 'contact@devisera.fr'],
      ['"contact@devisera.fr"', 'contact@devisera.fr'],
      ['<contact@devisera.fr>', 'contact@devisera.fr'],
      ['mailto:contact@devisera.fr', 'contact@devisera.fr'],
      ['"DEVISERA <contact@devisera.fr>"', 'DEVISERA <contact@devisera.fr>'],
    ] as const) {
      const loaded = await charger({ EMAIL_REPLY_TO: raw });
      try {
        expect(loaded.env().EMAIL_REPLY_TO, raw).toBe(expected);
        expect(loaded.configurationReport().ignored, raw).toEqual([]);
      } finally {
        loaded.restore();
      }
    }
  });

  it('ignore une adresse de réponse réellement invalide et conserve les autres valeurs', async () => {
    const loaded = await charger({ EMAIL_REPLY_TO: 'contact devisera', EMAIL_PROVIDER: 'console' });
    try {
      expect(loaded.env().EMAIL_REPLY_TO).toBe('contact@devisera.fr');
      expect(loaded.env().EMAIL_PROVIDER).toBe('console');
      expect(loaded.configurationReport().ignored).toEqual(['EMAIL_REPLY_TO']);
    } finally {
      loaded.restore();
    }
  });

  it('tolère un indicateur booléen mal formé', async () => {
    const loaded = await charger({ PUSH_ENABLED: '1' });
    try {
      expect(loaded.env().PUSH_ENABLED).toBe(true);
      expect(loaded.configurationReport().ignored).toEqual(['PUSH_ENABLED']);
    } finally {
      loaded.restore();
    }
  });

  it('complète une URL publique saisie sans schéma', async () => {
    const loaded = await charger({ APP_URL: 'devisera.fr' });
    try {
      expect(loaded.env().APP_URL).toBe('https://devisera.fr');
      expect(loaded.appUrl('/devis')).toBe('https://devisera.fr/devis');
      expect(loaded.configurationReport().ignored).toEqual([]);
    } finally {
      loaded.restore();
    }
  });

  it('bloque toujours sans base de données, en nommant la variable', async () => {
    const loaded = await charger({ DATABASE_URL: undefined });
    try {
      expect(() => loaded.env()).toThrow(/DATABASE_URL/);
      expect(loaded.configurationReport().missing).toEqual(['DATABASE_URL']);
    } finally {
      loaded.restore();
    }
  });

  it('ne signale rien quand tout est valide', async () => {
    const loaded = await charger({ EMAIL_PROVIDER: 'console', EMAIL_REPLY_TO: 'contact@devisera.fr' });
    try {
      expect(loaded.configurationReport()).toEqual({ missing: [], ignored: [] });
      expect(warn).not.toHaveBeenCalled();
    } finally {
      loaded.restore();
    }
  });
});

describe('domaine d’expédition', () => {
  it('extrait le domaine d’une adresse nue ou avec nom d’affichage', async () => {
    const { senderDomain } = await import('@/lib/email');
    expect(senderDomain('DEVISERA <contact@devisera.fr>')).toBe('devisera.fr');
    expect(senderDomain('contact@devisera.fr')).toBe('devisera.fr');
    expect(senderDomain('  <Contact@Devisera.FR> ')).toBe('devisera.fr');
    expect(senderDomain('pas une adresse')).toBeNull();
  });
});
