// hunter.ts
import { db, getWallet, upsertSettings } from '../db/repo.js';
import { scanTrendingTokens } from '../solana/scanner.js';
import { decryptKeypair } from '../solana/wallet.js';
import { buyToken } from '../solana/executor.js';
import { checkTokenSafety } from '../solana/token.js';
import { Connection, PublicKey } from '@solana/web3.js';
import { config } from '../config.js';

const connection = new Connection(config.rpcUrl, 'confirmed');

export async function runHunter() {
  const tokens = await scanTrendingTokens();
  const users = await db.selectFrom('users').selectAll().execute();

  for (const user of users) {
    const settings = await upsertSettings(user.id, {});
    if (!settings.auto_trade_enabled) continue;

    const openCount = await db.selectFrom('positions')
      .where('user_id', '=', user.id).where('status', '=', 'OPEN')
      .execute();
    if (openCount.length >= settings.max_open_positions) continue;

    const wallet = await getWallet(user.id);
    if (!wallet) continue;

    for (const token of tokens) {
      if (token.liquiditySol < 50) continue; // min liquidity filter
      const safety = await checkTokenSafety(connection, new PublicKey(token.ca));
      if (!safety.ok) continue;

      const kp = decryptKeypair(wallet.encryptedPrivateKey);
      await buyToken(kp, token.ca, Number(settings.default_buy_size), settings.default_slippage_bps);
      await db.insertInto('positions').values({
        id: crypto.randomUUID(), user_id: user.id, token_ca: token.ca,
        entry_avg: '0', size_lamports: settings.default_buy_size,
        dca_plan: '[]', tp_levels: JSON.stringify([{ pct: settings.default_tp_pct }]),
        status: 'OPEN'
      }).execute();
      break; // one entry per cycle
    }
  }
}
