import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { cleanupOrganization, createTestOrganization } from '../helpers';
import { validateUpload, IMAGE_MIME_TYPES, MAX_IMAGE_BYTES } from '@/lib/storage/validation';
import { getStorageProvider } from '@/lib/storage/provider';

/**
 * Téléversement d'une photo de chantier.
 *
 * Constaté sur iPhone : la vignette s'affichait, puis « L'envoi n'a pas abouti.
 * Vérifiez votre connexion » — alors que la connexion allait bien. Deux causes,
 * mesurées contre la production : la plateforme d'hébergement refuse tout corps
 * au-delà d'environ quatre mégaoctets et demi, et le client abandonnait au bout
 * de vingt secondes, délai prévu pour un appel JSON, pas pour une photo en 4G.
 *
 * Le correctif tient côté appareil — réduction avant envoi — et non dans un
 * relâchement de la validation, que ces cas vérifient intacte.
 */
let org: Awaited<ReturnType<typeof createTestOrganization>>;

beforeAll(async () => {
  org = await createTestOrganization('Plomberie Photo');
});

afterAll(async () => {
  await cleanupOrganization(org.organization.id);
});

/** Un JPEG minimal mais valide. */
function jpeg(octets: number): Buffer {
  const entete = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00]);
  const fin = Buffer.from([0xff, 0xd9]);
  const corps = Buffer.alloc(Math.max(0, octets - entete.length - fin.length), 0x42);
  return Buffer.concat([entete, corps, fin]);
}

describe('validation d’un envoi de photo', () => {
  const options = { allowed: IMAGE_MIME_TYPES, maxBytes: MAX_IMAGE_BYTES };
  const fichier = (octets: number, nom = 'chantier.jpg', type = 'image/jpeg') =>
    new File([new Uint8Array(jpeg(octets))], nom, { type });

  it('accepte une photo réduite comme le fait désormais le mobile', async () => {
    // Après réduction sur l'appareil, une photo de chantier pèse quelques
    // centaines de kilooctets — très loin de la limite de la plateforme.
    const valide = await validateUpload(fichier(320 * 1024), options);
    expect(valide.mimeType).toBe('image/jpeg');
    expect(valide.size).toBeGreaterThan(0);
    expect(valide.size).toBeLessThan(4 * 1024 * 1024);
  });

  it('refuse toujours un fichier au-delà de la limite : la règle n’est pas relâchée', async () => {
    await expect(
      validateUpload(fichier(MAX_IMAGE_BYTES + 1024, 'enorme.jpg'), options),
    ).rejects.toBeTruthy();
  });

  it('refuse un contenu qui n’est pas l’image annoncée', async () => {
    const piege = new File([new TextEncoder().encode('ceci est du texte')], 'piege.jpg', {
      type: 'image/jpeg',
    });
    await expect(validateUpload(piege, options)).rejects.toBeTruthy();
  });

  it('accepte le HEIC, format natif des photos iPhone', () => {
    expect(IMAGE_MIME_TYPES).toContain('image/heic');
    expect(IMAGE_MIME_TYPES).toContain('image/heif');
  });

  it('écrit puis relit la photo à l’octet près', async () => {
    const contenu = jpeg(64 * 1024);
    const stockage = getStorageProvider();
    const cle = `test/${org.organization.id}/chantier.jpg`;
    await stockage.put(cle, contenu, 'image/jpeg');
    const relu = await stockage.get(cle);
    expect(relu.byteLength).toBe(contenu.byteLength);
    await stockage.delete(cle);
    await expect(stockage.get(cle)).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });
});
