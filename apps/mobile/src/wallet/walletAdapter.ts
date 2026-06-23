import {
  clearCompanionKey,
  loadOrCreateCompanionKey,
  signWithCompanionKey,
  type CompanionKey,
} from './companionKey';

export type WalletSession = { address: string; cluster: 'devnet' | 'testnet' | 'mainnet-beta' };

export interface PawketWalletAdapter {
  connect(): Promise<WalletSession>;
  disconnect(): Promise<void>;
  signMessage(message: Uint8Array): Promise<Uint8Array>;
}

/**
 * Connects the device companion key as this session's wallet. The keypair is
 * real and persisted, so the same device returns to the same pet across launches
 * — and two devices are two distinct players. `reset` mints a fresh identity.
 */
export class DeviceWalletAdapter implements PawketWalletAdapter {
  private key: CompanionKey | null = null;

  async connect() {
    this.key = await loadOrCreateCompanionKey();
    return { address: this.key.address, cluster: 'devnet' as const };
  }

  async disconnect() {
    // Ends the in-memory session but keeps the device identity.
    this.key = null;
  }

  async reset() {
    await clearCompanionKey();
    this.key = null;
  }

  async signMessage(message: Uint8Array): Promise<Uint8Array> {
    if (!this.key) throw new Error('Connect the companion key before signing.');
    return signWithCompanionKey(this.key, message);
  }
}
