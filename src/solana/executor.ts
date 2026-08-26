import { Connection, VersionedTransaction, Keypair, PublicKey } from '@solana/web3.js';
import { getQuote, getSwapTransaction } from './jupiter.js';
import { config } from '../config.js';

const connection = new Connection(config.rpcUrl, 'confirmed');
const WSOL = 'So11111111111111111111111111111111111111112';

export async function buyToken(
  payer: Keypair,
  tokenCa: string,
  solAmountLamports: number,
  slippageBps: number
): Promise<string> {
  const quote = await getQuote(WSOL, tokenCa, solAmountLamports, slippageBps);
  const swapTxB64 = await getSwapTransaction(quote, payer.publicKey.toBase58(), true);
  return await sendAndConfirm(swapTxB64, payer);
}

export async function sellToken(
  payer: Keypair,
  tokenCa: string,
  tokenAmount: number,
  slippageBps: number
): Promise<string> {
  const quote = await getQuote(tokenCa, WSOL, tokenAmount, slippageBps);
  const swapTxB64 = await getSwapTransaction(quote, payer.publicKey.toBase58(), true);
  return await sendAndConfirm(swapTxB64, payer);
}

async function sendAndConfirm(swapTxB64: string, payer: Keypair): Promise<string> {
  const tx = VersionedTransaction.deserialize(Buffer.from(swapTxB64, 'base64'));
  tx.sign([payer]);
  const sig = await connection.sendTransaction(tx, { preflightCommitment: 'confirmed', maxRetries: 2 });
  const { value } = await connection.confirmTransaction(sig, 'confirmed');
  if (value?.err) throw new Error('Transaction failed on confirmation');
  return sig;
}
