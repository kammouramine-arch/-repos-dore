import test from 'node:test';
import assert from 'node:assert/strict';
import { pbkdf2Sync } from 'node:crypto';
import { derivePasswordValue } from './password.mjs';

test('portable password hash matches independent native PBKDF2 at the full work factor', async () => {
  const password = 'Synthetic password é 🗺️', salt = 'Synthetic-salt-0123456789';
  assert.equal(await derivePasswordValue(password, salt), pbkdf2Sync(password, salt, 600000, 32, 'sha256').toString('hex'));
});
