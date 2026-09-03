import { AppError } from '../errors';

export const IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];
export const DOCUMENT_MIME_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
  'text/csv',
];
export const AUDIO_MIME_TYPES = ['audio/webm', 'audio/mpeg', 'audio/mp4', 'audio/wav', 'audio/ogg', 'audio/x-m4a'];

export const MAX_IMAGE_BYTES = 12 * 1024 * 1024;
export const MAX_DOCUMENT_BYTES = 20 * 1024 * 1024;
export const MAX_AUDIO_BYTES = 20 * 1024 * 1024;

const EXTENSIONS: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/heic': 'heic',
  'image/heif': 'heif',
  'application/pdf': 'pdf',
  'text/csv': 'csv',
  'audio/webm': 'webm',
  'audio/mpeg': 'mp3',
  'audio/mp4': 'm4a',
  'audio/wav': 'wav',
  'audio/ogg': 'ogg',
  'audio/x-m4a': 'm4a',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
  'application/vnd.ms-excel': 'xls',
};

/** Signatures binaires vérifiées en plus du type MIME déclaré. */
const MAGIC_NUMBERS: { mime: string; test: (b: Buffer) => boolean }[] = [
  { mime: 'image/jpeg', test: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  {
    mime: 'image/png',
    test: (b) => b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47,
  },
  { mime: 'image/webp', test: (b) => b.subarray(0, 4).toString('ascii') === 'RIFF' && b.subarray(8, 12).toString('ascii') === 'WEBP' },
  { mime: 'application/pdf', test: (b) => b.subarray(0, 4).toString('ascii') === '%PDF' },
];

export interface FileValidationOptions {
  allowed: string[];
  maxBytes: number;
}

export interface ValidatedFile {
  buffer: Buffer;
  mimeType: string;
  fileName: string;
  extension: string;
  size: number;
}

/** Valide type MIME déclaré, taille, extension et signature binaire. */
export async function validateUpload(
  file: File,
  options: FileValidationOptions,
): Promise<ValidatedFile> {
  if (!options.allowed.includes(file.type)) {
    throw new AppError('VALIDATION', `Format de fichier non accepté (${file.type || 'inconnu'}).`);
  }
  if (file.size <= 0) {
    throw new AppError('VALIDATION', 'Le fichier est vide.');
  }
  if (file.size > options.maxBytes) {
    const mb = Math.round(options.maxBytes / (1024 * 1024));
    throw new AppError('VALIDATION', `Le fichier dépasse la taille maximale de ${mb} Mo.`);
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const magic = MAGIC_NUMBERS.find((m) => m.mime === file.type);
  if (magic && !magic.test(buffer)) {
    throw new AppError('VALIDATION', "Le contenu du fichier ne correspond pas à son format annoncé.");
  }

  return {
    buffer,
    mimeType: file.type,
    fileName: sanitizeFileName(file.name),
    extension: EXTENSIONS[file.type] ?? 'bin',
    size: buffer.byteLength,
  };
}

export function sanitizeFileName(name: string): string {
  return (
    name
      .normalize('NFD')
      .replace(new RegExp('[\\u0300-\\u036f]', 'g'), '')
      .replace(/[^a-zA-Z0-9._-]/g, '_')
      .replace(/_{2,}/g, '_')
      .slice(-120) || 'fichier'
  );
}

/** Clé de stockage cloisonnée par organisation. */
export function storageKey(organizationId: string, kind: string, id: string, extension: string) {
  return `org/${organizationId}/${kind.toLowerCase()}/${id}.${extension}`;
}
