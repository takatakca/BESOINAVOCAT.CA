import { createCipheriv, createDecipheriv, createSecretKey, randomBytes } from 'node:crypto';
import { lstatSync, readFileSync } from 'node:fs';
import { isAbsolute } from 'node:path';

// Optional encryption at rest for case documents (AES-256-GCM).
// A sealed file is: "BAE1" | 12-byte nonce | ciphertext | 16-byte tag. The additional data binds the
// ciphertext to its tenant directory and plaintext SHA-256, so a file moved or renamed fails to open.
// Files written before the key was configured stay readable as plaintext; nothing is converted here.
export const SEAL_MAGIC = Buffer.from('BAE1', 'ascii');
export const SEAL_OVERHEAD = SEAL_MAGIC.length + 12 + 16;

const binding = (tenantHash, sha256) => Buffer.from(`besoinavocat-blob-v1\n${tenantHash}\n${sha256}`, 'utf8');

// Returns null when no key file is configured. A configured but unusable key throws, so the
// server never silently falls back to writing plaintext.
export function loadBlobKey(keyFile) {
  if (keyFile === undefined || keyFile === null || keyFile === '') return null;
  if (typeof keyFile !== 'string' || !isAbsolute(keyFile)) throw new Error('BESOINAVOCAT_BLOB_KEY_FILE must be an absolute path');
  const stat = lstatSync(keyFile);
  if (stat.isSymbolicLink() || !stat.isFile() || stat.size !== 32) throw new Error('The document key must be a regular 32-byte file');
  if (process.platform !== 'win32' && (stat.mode & 0o077)) throw new Error('The document key file must not be readable by others (0600)');
  const bytes = readFileSync(keyFile);
  try { return createSecretKey(bytes); } finally { bytes.fill(0); }
}

export const isSealed = data => data.length >= SEAL_OVERHEAD && data.subarray(0, SEAL_MAGIC.length).equals(SEAL_MAGIC);

export function sealBlob(key, plaintext, tenantHash, sha256) {
  const nonce = randomBytes(12), cipher = createCipheriv('aes-256-gcm', key, nonce);
  cipher.setAAD(binding(tenantHash, sha256));
  const body = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  return Buffer.concat([SEAL_MAGIC, nonce, body, cipher.getAuthTag()]);
}

export function openBlob(key, sealed, tenantHash, sha256) {
  if (!isSealed(sealed)) throw new Error('Not a sealed document');
  const nonce = sealed.subarray(4, 16), tag = sealed.subarray(sealed.length - 16);
  const decipher = createDecipheriv('aes-256-gcm', key, nonce);
  decipher.setAAD(binding(tenantHash, sha256));
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(sealed.subarray(16, sealed.length - 16)), decipher.final()]);
}
