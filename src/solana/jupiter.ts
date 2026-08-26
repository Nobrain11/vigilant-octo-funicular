import axios from 'axios';

const JUPITER = 'https://quote-api.jup.ag/v6';

export async function getQuote(inputMint: string, outputMint: string, amount: number, slippageBps: number) {
  const res = await axios.get(`${JUPITER}/quote`, {
    params: { inputMint, outputMint, amount, slippageBps }
  });
  return res.data;
}

export async function getSwapTransaction(quoteResponse: any, userPubkey: string, wrapAndUnwrapSol = true) {
  const res = await axios.post(`${JUPITER}/swap`, {
    quoteResponse,
    userPublicKey: userPubkey,
    wrapAndUnwrapSol
  });
  return res.data.swapTransaction; // base64
}
