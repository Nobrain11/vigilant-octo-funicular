import { Connection, PublicKey } from '@solana/web3.js';
import { db, getWallet, upsertSettings } from '../db/repo.js';
import { scanTrendingTokens } from '../solana/scanner.js';
import { decryptKeypair } from '../solana/wallet.js';
import { buyToken } from '../solana/executor.js';
import { checkTokenSafety } from '../solana/token.js';
import { config } from '../config.js';

const connection = new Connection(config.rpcUrl, 'confirmed');

export async function runHunter() {
  const tokens = await scanTrendingTokens();
  const users = await db.selectFrom('users').selectAll().execute();

  for (const user of users) {
    const settings = await upsertSettings(user.id, {});
    if (!settings.autoTradeEnabled) continue;

    const openCount = await db.selectFrom('positions')
      .where('userId', '=', user.id).where('status', '=', 'OPEN')
      .execute();
    if (openCount.length >= settings.maxOpenPositions) continue;

    const wallet = await getWallet(user.id);
    if (!wallet) continue;

    for (const token of tokens) {
      if (token.liquiditySol < 50) continue;
      const safety = await checkTokenSafety(connection, new PublicKey(token.ca));
      if (!safety.ok) continue;

      const kp = decryptKeypair(wallet.encryptedPrivateKey);
      await buyToken(kp, token.ca, Number(settings.defaultBuySizeLamports), settings.defaultSlippageBps);
      await db.insertInto('positions').values({
        id: crypto.randomUUID(), userId: user.id, tokenCa: token.ca,
        entryAvgLamports: '0', sizeLamports: settings.defaultBuySizeLamports,
        dcaPlanJson: '[]', tpLevelsJson: JSON.stringify([{ pct: settings.defaultTpPct }]),
        status: 'OPEN'
      }).execute();
      break;
    }
  }
}
