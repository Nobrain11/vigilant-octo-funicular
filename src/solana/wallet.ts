import {
  Keypair
} from '@solana/web3.js';

import {
  encryptPrivateKey,
  decryptPrivateKey
} from '../security/crypto.js';

export function createKeypair(): Keypair {
  return Keypair.generate();
}

export function encryptKeypair(
  keypair: Keypair
): string {
  return encryptPrivateKey(
    keypair.secretKey
  );
}

export function decryptKeypair(
  encryptedPrivateKey: string
): Keypair {
  const secretKey =
    decryptPrivateKey(
      encryptedPrivateKey
    );

  return Keypair.fromSecretKey(
    secretKey
  );
}
