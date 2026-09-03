export interface StoredObject {
  key: string;
  size: number;
  contentType: string;
}

export interface StorageProvider {
  readonly name: string;
  put(key: string, body: Buffer, contentType: string): Promise<StoredObject>;
  get(key: string): Promise<Buffer>;
  delete(key: string): Promise<void>;
  /** URL temporaire signée, ou null si le fournisseur sert les fichiers via l'API. */
  signedUrl(key: string, expiresInSeconds?: number): Promise<string | null>;
}
