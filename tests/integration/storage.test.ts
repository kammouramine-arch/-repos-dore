import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { cleanupOrganization, createTestOrganization, prisma } from '../helpers';
import { getStorageProvider, resetStorageProvider, storageKey } from '@/lib/storage';

/**
 * Stockage des fichiers.
 *
 * Le pilote disque écrivait sous `./storage`, ce qui passe en développement et
 * échoue en production : les hébergeurs serverless montent le système de
 * fichiers de l'application en lecture seule. Le pilote par défaut range donc
 * le binaire dans PostgreSQL, et ces cas vérifient l'aller-retour complet.
 */
let org: Awaited<ReturnType<typeof createTestOrganization>>;

beforeAll(async () => {
  org = await createTestOrganization('Stockage');
});

afterAll(async () => {
  await cleanupOrganization(org.organization.id);
});

const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
);

describe('stockage des fichiers', () => {
  it('utilise la base par défaut, jamais le disque', () => {
    resetStorageProvider();
    expect(getStorageProvider().name).toBe('database');
  });

  it('écrit puis relit un binaire à l’identique', async () => {
    resetStorageProvider();
    const storage = getStorageProvider();
    const key = storageKey(org.organization.id, 'PHOTO_CHANTIER', crypto.randomUUID(), 'png');

    const stored = await storage.put(key, PNG, 'image/png');
    expect(stored.size).toBe(PNG.byteLength);

    const read = await storage.get(key);
    expect(read.equals(PNG)).toBe(true);

    await storage.delete(key);
    await expect(storage.get(key)).rejects.toThrow(/introuvable/i);
  });

  it('remplace un binaire existant sans dupliquer la clé', async () => {
    resetStorageProvider();
    const storage = getStorageProvider();
    const key = storageKey(org.organization.id, 'PHOTO_CHANTIER', crypto.randomUUID(), 'png');

    await storage.put(key, PNG, 'image/png');
    await storage.put(key, Buffer.concat([PNG, PNG]), 'image/png');

    expect((await storage.get(key)).byteLength).toBe(PNG.byteLength * 2);
    expect(await prisma.fileBlob.count({ where: { storageKey: key } })).toBe(1);

    await storage.delete(key);
  });

  it('ne sert pas d’URL signée : les fichiers passent par l’API, qui vérifie l’organisation', async () => {
    resetStorageProvider();
    expect(await getStorageProvider().signedUrl('peu-importe')).toBeNull();
  });
});
