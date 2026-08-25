import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
import { dirname, join, normalize, resolve, sep } from 'node:path';
import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { env } from '../env';
import { AppError } from '../errors';
import type { StorageProvider, StoredObject } from './types';

/** Stockage disque, pour le développement local et les tests. */
class LocalStorage implements StorageProvider {
  readonly name = 'local';
  constructor(private root: string) {}

  private resolveKey(key: string): string {
    const target = resolve(join(this.root, normalize(key)));
    const base = resolve(this.root);
    if (target !== base && !target.startsWith(base + sep)) {
      throw new AppError('VALIDATION', 'Chemin de fichier invalide.');
    }
    return target;
  }

  async put(key: string, body: Buffer, contentType: string): Promise<StoredObject> {
    const path = this.resolveKey(key);
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, body);
    return { key, size: body.byteLength, contentType };
  }

  async get(key: string): Promise<Buffer> {
    try {
      return await readFile(this.resolveKey(key));
    } catch (cause) {
      throw new AppError('NOT_FOUND', 'Fichier introuvable.', { cause });
    }
  }

  async delete(key: string): Promise<void> {
    await unlink(this.resolveKey(key)).catch(() => undefined);
  }

  async signedUrl(): Promise<string | null> {
    // Les fichiers sont servis par /api/files/[id], qui vérifie l'organisation.
    return null;
  }
}

/** Stockage objet compatible S3 (AWS S3, Supabase Storage, Cloudflare R2, MinIO). */
class S3Storage implements StorageProvider {
  readonly name = 's3';
  private client: S3Client;

  constructor(
    private bucket: string,
    config: { region: string; endpoint?: string; accessKeyId: string; secretAccessKey: string },
  ) {
    this.client = new S3Client({
      region: config.region,
      endpoint: config.endpoint,
      forcePathStyle: Boolean(config.endpoint),
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
    });
  }

  async put(key: string, body: Buffer, contentType: string): Promise<StoredObject> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
        // Les objets ne sont jamais publics : l'accès passe par une URL signée.
        ACL: undefined,
      }),
    );
    return { key, size: body.byteLength, contentType };
  }

  async get(key: string): Promise<Buffer> {
    const result = await this.client
      .send(new GetObjectCommand({ Bucket: this.bucket, Key: key }))
      .catch((cause) => {
        throw new AppError('NOT_FOUND', 'Fichier introuvable.', { cause });
      });
    const bytes = await result.Body?.transformToByteArray();
    if (!bytes) throw new AppError('NOT_FOUND', 'Fichier introuvable.');
    return Buffer.from(bytes);
  }

  async delete(key: string): Promise<void> {
    await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
  }

  async signedUrl(key: string, expiresInSeconds = 300): Promise<string | null> {
    return getSignedUrl(this.client, new GetObjectCommand({ Bucket: this.bucket, Key: key }), {
      expiresIn: expiresInSeconds,
    });
  }
}

let cached: StorageProvider | null = null;

export function getStorageProvider(): StorageProvider {
  if (cached) return cached;
  const config = env();
  if (config.STORAGE_PROVIDER === 's3') {
    if (!config.S3_BUCKET || !config.S3_ACCESS_KEY_ID || !config.S3_SECRET_ACCESS_KEY) {
      throw new AppError('INTERNAL', 'Configuration de stockage S3 incomplète.');
    }
    cached = new S3Storage(config.S3_BUCKET, {
      region: config.S3_REGION ?? 'eu-west-3',
      endpoint: config.S3_ENDPOINT,
      accessKeyId: config.S3_ACCESS_KEY_ID,
      secretAccessKey: config.S3_SECRET_ACCESS_KEY,
    });
  } else {
    cached = new LocalStorage(config.STORAGE_LOCAL_DIR);
  }
  return cached;
}

export function resetStorageProvider() {
  cached = null;
}
