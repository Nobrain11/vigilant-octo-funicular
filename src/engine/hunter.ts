import { scanTrendingTokens } from '../solana/scanner.js';
export async function runHunter() {
  const tokens = await scanTrendingTokens();
  // TODO: for each token, check user settings and open positions if autoTrade=ON
}
