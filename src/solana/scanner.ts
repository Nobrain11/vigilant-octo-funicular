// scanner.ts
import axios from 'axios';

export type TrendingToken = { ca: string; name: string; symbol: string; liquiditySol: number };

export async function scanTrendingTokens(): Promise<TrendingToken[]> {
  // Replace with your data source (e.g., Birdeye, GMGN, or Pump.fun new-pair feed)
  // Example using a generic trending endpoint:
  const res = await axios.get('https://public-api.birdeye.so/defi/token_trending', {
    headers: { 'X-API-KEY': process.env.BIRDEYE_KEY || '' }
  });
  const items = res.data?.data?.tokens ?? [];
  return items.map((t: any) => ({
    ca: t.address,
    name: t.name,
    symbol: t.symbol,
    liquiditySol: (t.liquidity ?? 0) / 1e9
  }));
}
