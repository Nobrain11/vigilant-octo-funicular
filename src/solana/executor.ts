import { Connection, VersionedTransaction, PublicKey } from '@solana/web3.js';
import { config } from '../config.js';

const connection = new Connection(config.rpcUrl, 'confirmed');

export async function sendSwap(base64Tx: string, payerKeypair: import('@solana/web3.js').Keypair) {
  const txBuf = Buffer.from(base64Tx, 'base64');
  const tx = VersionedTransaction.deserialize(txBuf);
  tx.sign([payerKeypair]);
  const sig = await connection.sendTransaction(tx, {
    preflightCommitment: 'confirmed',
    maxRetries: 2
  });
  const { value } = await connection.confirmTransaction(sig, 'confirmed');
  if (value?.err) throw new Error('Transaction failed');
  return sig;
}
