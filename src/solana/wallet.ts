import { Keypair } from '@solana/web3.js';
import bs58 from 'bs58';
import { encryptPrivateKey, decryptPrivateKey } from '../security/crypto.js';
import { config } from '../config.js';

export function createKeypair(): Keypair {
  return Keypair.generate();
}

export function keypairFromPrivateKeyBase58(secret: string): Keypair {
  return Keypair.fromSecretKey(bs58.decode(secret));
}

export function encryptKeypair(kp: Keypair): string {
  return encryptPrivateKey(kp.secretKey, config.encKey);
}

export function decryptKeypair(encrypted: string): Keypair {
  const secret = decryptPrivateKey(encrypted, config.encKey);
  return Keypair.fromSecretKey(secret);
}
