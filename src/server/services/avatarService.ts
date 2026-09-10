import 'server-only';
import sharp from 'sharp';
import { prisma } from '@/lib/prisma';
import { validation } from '@/lib/errors';

// Personal media is deliberately outside organization File records: even a
// teammate must not be able to retrieve it via /api/files/:id.
export const avatarKey = (userId: string) => `private-avatar/${userId}`;
export async function readAvatar(userId: string) {
  const record = await prisma.fileBlob.findUnique({ where: { storageKey: avatarKey(userId) } });
  return { image: record ? `data:image/jpeg;base64,${Buffer.from(record.bytes).toString('base64')}` : null };
}
export async function saveAvatar(userId: string, encoded: string) {
  if (!encoded || encoded.length > 700_000 || !/^[A-Za-z0-9+/]+={0,2}$/.test(encoded)) throw validation('Image invalide ou trop volumineuse.');
  const input = Buffer.from(encoded, 'base64');
  if (input.length > 512_000 || input[0] !== 0xff || input[1] !== 0xd8) throw validation('Sélectionnez une photo JPEG.');
  let bytes: Buffer;
  try {
    // Decode with a pixel ceiling, resize and re-encode: remove GPS/EXIF and
    // reject malformed input instead of trusting the client's dimensions.
    bytes = await sharp(input, { limitInputPixels: 4_000_000, animated: false }).rotate().resize(256, 256, { fit: 'cover' }).jpeg({ quality: 82 }).toBuffer();
  } catch { throw validation('Cette image ne peut pas être utilisée.'); }
  await prisma.$transaction(async tx => {
    const user = await tx.user.findUnique({ where: { id: userId }, select: { deletedAt: true } });
    if (!user || user.deletedAt) throw validation('Compte indisponible.');
    const storedBytes = new Uint8Array(bytes);
    await tx.fileBlob.upsert({ where: { storageKey: avatarKey(userId) }, create: { storageKey: avatarKey(userId), bytes: storedBytes }, update: { bytes: storedBytes } });
  }, { isolationLevel: 'Serializable' });
  return { image: `data:image/jpeg;base64,${bytes.toString('base64')}` };
}
export async function removeAvatar(userId: string) {
  await prisma.fileBlob.deleteMany({ where: { storageKey: avatarKey(userId) } });
  return { image: null };
}
