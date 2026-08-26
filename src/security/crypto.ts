import nacl from 'tweetnacl';
import crypto from 'node:crypto';

const KEY_BYTES = 32;
const NONCE_BYTES = nacl.secretbox.nonceLength;

function getEncryptionKey(): Uint8Array {
  const secret = process.env.WALLET_ENCRYPTION_KEY;

  if (!secret) {
    throw new Error(
      'WALLET_ENCRYPTION_KEY is missing. Set it in Railway Variables.'
    );
  }

  const key = Buffer.from(secret, 'base64');

  if (key.length !== KEY_BYTES) {
    throw new Error(
      `WALLET_ENCRYPTION_KEY must decode to exactly 32 bytes; received ${key.length} bytes.`
    );
  }

  return new Uint8Array(key);
}

export function encryptPrivateKey(privateKey: Uint8Array): string {
  const key = getEncryptionKey();

  const nonce = nacl.randomBytes(NONCE_BYTES);

  const encrypted = nacl.secretbox(
    new Uint8Array(privateKey),
    nonce,
    key
  );

  return [
    Buffer.from(nonce).toString('base64'),
    Buffer.from(encrypted).toString('base64')
  ].join('.');
}

export function decryptPrivateKey(value: string): Uint8Array {
  const key = getEncryptionKey();

  const parts = value.split('.');

  if (parts.length !== 2) {
    throw new Error('Invalid encrypted private key format.');
  }

  const nonce = Buffer.from(parts[0], 'base64');
  const encrypted = Buffer.from(parts[1], 'base64');

  if (nonce.length !== NONCE_BYTES) {
    throw new Error('Invalid encryption nonce.');
  }

  const decrypted = nacl.secretbox.open(
    new Uint8Array(encrypted),
    new Uint8Array(nonce),
    key
  );

  if (!decrypted) {
    throw new Error(
      'Unable to decrypt private key. Check WALLET_ENCRYPTION_KEY.'
    );
  }

  return new Uint8Array(decrypted);
}

export function generateEncryptionKey(): string {
  return crypto.randomBytes(KEY_BYTES).toString('base64');
}
