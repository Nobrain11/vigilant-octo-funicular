import { Connection, PublicKey } from '@solana/web3.js';
import axios from 'axios';

export type TokenSafety = {
  ok: boolean;
  reasons: string[];
  liquiditySol?: number;
  mintAuthorityDisabled?: boolean;
  freezeAuthorityDisabled?: boolean;
  top10HoldersPct?: number;
};

export async function checkTokenSafety(connection: Connection, mint: PublicKey): Promise<TokenSafety> {
  const reasons: string[] = [];
  const mintInfo = await connection.getParsedAccountInfo(mint);
  const data = mintInfo.value?.data as any;
  const mintAuth = data?.parsed?.info?.mintAuthority;
  const freezeAuth = data?.parsed?.info?.freezeAuthority;
  const mintAuthorityDisabled = !mintAuth;
  const freezeAuthorityDisabled = !freezeAuth;

  if (!mintAuthorityDisabled) reasons.push('Mint authority still enabled (can mint more tokens)');
  if (!freezeAuthorityDisabled) reasons.push('Freeze authority still enabled (can freeze your tokens)');

  // TODO: fetch liquidity from a DEX/aggregator API and holder distribution
  const ok = reasons.length === 0;
  return { ok, reasons, mintAuthorityDisabled, freezeAuthorityDisabled };
}
