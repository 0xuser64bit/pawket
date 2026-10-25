import { createSignerFromKeyPair, generateKeyPair, type KeyPairSigner } from "@solana/kit";
import { inAndroidApp } from "@/lib/native/android";

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
      const transaction = db.transaction(STORE, mode);
      const request = act(transaction.objectStore(STORE));
      transaction.oncomplete = () => resolve(request.result);
      transaction.onabort = () => reject(transaction.error ?? new Error("Device storage did not finish. Nothing was linked."));
      request.onerror = () => reject(request.error);
    });
  } finally {
    db.close();
  }
}

export async function loadDevice(owner: string): Promise<KeyPairSigner | null> {
  if (typeof indexedDB === "undefined") return null;
  try {
    const pair = await run<CryptoKeyPair | undefined>("readonly", (store) => store.get(owner));
    return pair ? await createSignerFromKeyPair(pair) : null;
  } catch {
    return null;
  }
}

export async function makeDevice(owner: string): Promise<KeyPairSigner> {
  const here = inAndroidApp() ? "This app" : "This browser";
  if (typeof indexedDB === "undefined") throw new Error(`${here} cannot keep a device key. Nothing was linked.`);
  let pair: CryptoKeyPair;
  try {
    pair = await generateKeyPair();
  } catch {
    throw new Error(
      inAndroidApp()
        ? "This phone's Android System WebView is too old to make the key. Update it from the Play Store, then link again. Nothing was linked."
        : "This browser cannot make an Ed25519 key, so it cannot be linked. Nothing was linked.",
    );
  }
  if (pair.privateKey.extractable) throw new Error(`${here} made a key that could be read. Nothing was linked.`);
  try {
    await run("readwrite", (store) => store.put(pair, owner));
  } catch {
    throw new Error(`${here} could not save its device key. Check that app storage is available, then try again. Nothing was linked.`);
  }
  return createSignerFromKeyPair(pair);
}

export async function forgetDevice(owner: string): Promise<void> {
  if (typeof indexedDB === "undefined") return;
  await run("readwrite", (store) => store.delete(owner));
}
