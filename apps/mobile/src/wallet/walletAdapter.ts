export type WalletSession = { address: string; cluster: 'devnet' | 'testnet' | 'mainnet-beta' };
export interface PawketWalletAdapter {
  connect(): Promise<WalletSession>;
  disconnect(): Promise<void>;
  signMessage(message: Uint8Array): Promise<Uint8Array>;
}
export class DevWalletAdapter implements PawketWalletAdapter {
  async connect() {
    return { address: 'DevnetDemoWallet1111111111111111111111111111', cluster: 'devnet' as const };
  }
  async disconnect() {}
  async signMessage(): Promise<Uint8Array> {
    throw new Error('Dev wallet cannot sign. Wire Solana Mobile Wallet Adapter for device builds.');
  }
}
