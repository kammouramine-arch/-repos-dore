import { existsSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

// Exercise the installed SDK encoder, not a mock of its multipart behavior.
const converterPath = '../../mobile/node_modules/expo/src/winter/fetch/convertFormData.ts';
const installed = existsSync(new URL(converterPath, import.meta.url));

describe.skipIf(!installed)('installed Expo multipart encoder', () => {
  it('reproduces the old URI-object rejection and accepts file bytes', async () => {
    const { convertFormDataAsync } = await import(converterPath);
    const legacy = { entries: () => [['file', { uri: 'file:///cache/test.jpg', name: 'test.jpg', type: 'image/jpeg' }]] };
    await expect(convertFormDataAsync(legacy)).rejects.toThrow('Unsupported FormDataPart implementation');

    // Expo File implements bytes() without extending the global Blob class.
    const nativeFile = { name: 'test.jpg', type: 'image/jpeg', bytes: async () => new Uint8Array([255, 216, 255, 217]) };
    const form = { entries: () => [['file', nativeFile], ['kind', 'PHOTO_CHANTIER']] };
    const encoded = await convertFormDataAsync(form, 'boundary');
    const parsed = await new Response(encoded.body, {
      headers: { 'content-type': 'multipart/form-data; boundary=boundary' },
    }).formData();
    const file = parsed.get('file') as File;
    expect(file.name).toBe('test.jpg');
    expect(file.type).toBe('image/jpeg');
    expect(new Uint8Array(await file.arrayBuffer())).toEqual(new Uint8Array([255, 216, 255, 217]));
    expect(parsed.get('kind')).toBe('PHOTO_CHANTIER');
  });
});
