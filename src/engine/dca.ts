import { db, getWallet } from '../db/repo.js';
import { decryptKeypair } from '../solana/wallet.js';
import { buyToken } from '../solana/executor.js';

export async function runDcaEngine() {
  const orders = await db.selectFrom('orders')
    .where('type', '=', 'DCA')
    .where('status', '=', 'PENDING')
    .selectAll().execute();

  for (const order of orders) {
    const wallet = await getWallet(order.userId);
    if (!wallet) continue;
    const kp = decryptKeypair(wallet.encryptedPrivateKey);
    await buyToken(kp, order.tokenCa, Number(order.sizeLamports), 100);
    await db.updateTable('orders').set({ status: 'FILLED' }).where('id', '=', order.id).execute();
  }
}
