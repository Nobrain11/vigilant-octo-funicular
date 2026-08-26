import { Connection, PublicKey } from '@solana/web3.js';
import { getQuote } from './jupiter.js';
import { config } from '../config.js';
import { getAssociatedTokenAddress } from '@solana/spl-token';

const connection = new Connection(config.rpcUrl, 'confirmed');
const WSOL = 'So11111111111111111111111111111111111111112';

export async function getPrice(tokenCa: string): Promise<number | undefined> {
  try {
    const quote = await getQuote(tokenCa, WSOL, 1_000_000, 100);
    return quote.outAmount / 1e9; // SOL per 1M smallest unit
  } catch {
    return undefined;
  }
}

export async function getTokenBalance(owner: PublicKey, tokenCa: string): Promise<number> {
  const ata = await getAssociatedTokenAddress(new PublicKey(tokenCa), owner);
  const info = await connection.getTokenAccountBalance(ata);
  return Number(info.value.amount);
}
