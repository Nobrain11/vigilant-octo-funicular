import nacl from 'tweetnacl';
import bs58 from 'bs58';

export function encryptPrivateKey(privateKeyUint8Array: Uint8Array, key: string): string {
  const keyBytes = new TextEncoder().encode(key);
  const nonce = nacl.randomBytes(nacl.secretbox.nonceLength);
  const box = nacl.secretbox(privateKeyUint8Array, nonce, keyBytes);
  const combined = new Uint8Array(nonce.length + box.length);
  combined.set(nonce); combined.set(box, nonce.length);
  return bs58.encode(combined);
}

export function decryptPrivateKey(encryptedBase58: string, key: string): Uint8Array {
  const combined = bs58.decode(encryptedBase58);
  const nonce = combined.slice(0, nacl.secretbox.nonceLength);
  const box = combined.slice(nacl.secretbox.nonceLength);
  const keyBytes = new TextEncoder().encode(key);
  const decrypted = nacl.secretbox.open(box, nonce, keyBytes);
  if (!decrypted) throw new Error('Decryption failed');
  return decrypted;
}
