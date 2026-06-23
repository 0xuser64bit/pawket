import * as Crypto from 'expo-crypto';
import bs58 from 'bs58';
import nacl from 'tweetnacl';
import { storage } from './storage';

/**
 * The device "companion key": a real Ed25519 keypair generated and persisted on
 * this device. It gives every install a unique, Solana-compatible wallet address
 * (base58 of the 32-byte public key) so each player owns a distinct pet and
 * Passport — no shared demo wallet. The secret never leaves the device and is
 * only used to sign devnet game actions. This is intentionally a lightweight
 * device-custodied key for the devnet companion loop, not a funds wallet; a
 * Solana Mobile Wallet Adapter path can replace it for signing real value.
 */
const SECRET_KEY = 'pawket.companion.secret';

export type CompanionKey = {
  address: string;
  publicKey: Uint8Array;
  secretKey: Uint8Array;
};

let prngReady = false;

/** Seed tweetnacl's PRNG from the platform CSPRNG (WebCrypto or expo-crypto). */
function ensurePrng() {
  if (prngReady) return;
  nacl.setPRNG((out, length) => {
    const bytes = Crypto.getRandomBytes(length);
    out.set(bytes.subarray(0, length));
  });
  prngReady = true;
}

function toKey(secretKey: Uint8Array): CompanionKey {
  const pair = nacl.sign.keyPair.fromSecretKey(secretKey);
  return {
    address: bs58.encode(pair.publicKey),
    publicKey: pair.publicKey,
    secretKey: pair.secretKey,
  };
}

/** True once this device has minted a companion key (a returning player). */
export async function hasCompanionKey(): Promise<boolean> {
  return (await storage.get(SECRET_KEY)) !== null;
}

/** Loads the persisted companion key, generating + saving one on first run. */
export async function loadOrCreateCompanionKey(): Promise<CompanionKey> {
  const stored = await storage.get(SECRET_KEY);
  if (stored) {
    try {
      return toKey(bs58.decode(stored));
    } catch {
      // Corrupt value — fall through and mint a fresh key.
    }
  }
  return createCompanionKey();
}

/** Mints a brand-new identity and persists it, replacing any existing key. */
export async function createCompanionKey(): Promise<CompanionKey> {
  ensurePrng();
  const pair = nacl.sign.keyPair();
  await storage.set(SECRET_KEY, bs58.encode(pair.secretKey));
  return toKey(pair.secretKey);
}

/** Forgets the on-device identity (used by "start over"). */
export async function clearCompanionKey(): Promise<void> {
  await storage.remove(SECRET_KEY);
}

/** Signs a message with the companion key — real Ed25519, MWA-shaped. */
export function signWithCompanionKey(key: CompanionKey, message: Uint8Array): Uint8Array {
  return nacl.sign.detached(message, key.secretKey);
}
