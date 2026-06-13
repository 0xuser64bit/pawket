import { NotConfiguredError } from './errors';

export type JupiterQuoteRequest = {
  inputMint: string;
  outputMint: string;
  amount: string;
  slippageBps?: number;
};
export type MercuryoWidgetOptions = {
  widgetId: string;
  walletAddress: string;
  currency?: 'SOL' | 'USDC';
};
export class PaymentHelpers {
  constructor(private readonly jupiterBaseUrl: string) {}
  async getJupiterQuote(request: JupiterQuoteRequest) {
    const url = new URL('/quote', this.jupiterBaseUrl);
    Object.entries(request).forEach(
      ([k, v]) => v !== undefined && url.searchParams.set(k, String(v)),
    );
    const r = await fetch(url);
    if (!r.ok) throw new Error(`Jupiter quote failed: ${r.status}`);
    return r.json();
  }
  buildMercuryoWidgetUrl(options: MercuryoWidgetOptions) {
    if (!options.widgetId) throw new NotConfiguredError('Mercuryo widget');
    const url = new URL('https://exchange.mercuryo.io/');
    url.searchParams.set('widget_id', options.widgetId);
    url.searchParams.set('address', options.walletAddress);
    url.searchParams.set('currency', options.currency ?? 'SOL');
    return url.toString();
  }
}
