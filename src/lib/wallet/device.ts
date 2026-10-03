import { createSignerFromKeyPair, generateKeyPair, type KeyPairSigner } from "@solana/kit";

/**
 * This device's key for a Pawket Wallet. It is made here, by the browser's
 * WebCrypto, as a non-extractable Ed25519 key: its secret half cannot be
 * read, exported or sent anywhere — by Pawket's own code included — only
 * asked to sign. It is kept in this browser's IndexedDB, one per owner, and
 * never leaves it. What it may sign is the program's call: care, rounds and
 * clothes for its owner's pets, inside the end date and the daily limit the
 * owner set when they linked it (`programs/pawket/src/lib.rs`).
 *
 * Clearing the site's data forgets the key. Nothing is lost but the small
 * fee float it held: the owner unlinks it from anywhere, and links another.
 */

const DB = "pawket";
const STORE = "devices";

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function run<T>(mode: IDBTransactionMode, act: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await open();
  try {
    return await new Promise<T>((resolve, reject) => {
      const request = act(db.transaction(STORE, mode).objectStore(STORE));
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  } finally {
    db.close();
  }
}

/** This browser's device key for `owner`, or null when it has none (or cannot keep one). */
export async function loadDevice(owner: string): Promise<KeyPairSigner | null> {
  if (typeof indexedDB === "undefined") return null;
  try {
    const pair = await run<CryptoKeyPair | undefined>("readonly", (store) => store.get(owner));
    return pair ? await createSignerFromKeyPair(pair) : null;
  } catch {
    return null;
  }
}

/**
 * A new device key for `owner`, kept in place of any before it. Throws, in
 * words, when this browser cannot make or keep one.
 */
export async function makeDevice(owner: string): Promise<KeyPairSigner> {
  if (typeof indexedDB === "undefined") throw new Error("This browser cannot keep a device key. Nothing was linked.");
  let pair: CryptoKeyPair;
  try {
    pair = await generateKeyPair();
  } catch {
    throw new Error("This browser cannot make an Ed25519 key, so it cannot be linked. Nothing was linked.");
  }
  if (pair.privateKey.extractable) throw new Error("This browser made a key that could be read. Nothing was linked.");
  await run("readwrite", (store) => store.put(pair, owner));
  return createSignerFromKeyPair(pair);
}

/** Forget `owner`'s device key on this browser. */
export async function forgetDevice(owner: string): Promise<void> {
  if (typeof indexedDB === "undefined") return;
  await run("readwrite", (store) => store.delete(owner));
}
