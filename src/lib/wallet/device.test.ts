import { afterEach, describe, expect, it, vi } from "vitest";
import { IDBFactory } from "fake-indexeddb";
import { forgetDevice, loadDevice, makeDevice } from "./device";

afterEach(() => vi.unstubAllGlobals());

function storage() {
  const request = { result: undefined, onerror: null as (() => void) | null };
  const transaction = { error: null as Error | null, oncomplete: null as (() => void) | null, onabort: null as (() => void) | null, objectStore: () => ({ delete: () => request }) };
  const close = vi.fn();
  const opening = { result: { transaction: () => transaction, close }, onsuccess: null as (() => void) | null };
  vi.stubGlobal("indexedDB", { open: () => { queueMicrotask(() => opening.onsuccess?.()); return opening; } });
  return { transaction, close };
}

describe("device storage commits", () => {
  it("keeps one non-extractable identity when first links race across tabs", async () => {
    vi.stubGlobal("indexedDB", new IDBFactory());
    expect(await Promise.all([loadDevice("owner"), loadDevice("owner")])).toEqual([null, null]);
    const [first, second] = await Promise.all([makeDevice("owner"), makeDevice("owner")]);
    const saved = await loadDevice("owner");
    expect(first.address).toBe(second.address);
    expect(saved?.address).toBe(first.address);
    expect(saved?.keyPair.privateKey.extractable).toBe(false);
    expect((await makeDevice("owner")).address).toBe(first.address);
  });

  it("isolates owners and allows a fresh identity only after explicit deletion", async () => {
    vi.stubGlobal("indexedDB", new IDBFactory());
    const first = await makeDevice("owner");
    const other = await makeDevice("other");
    expect(other.address).not.toBe(first.address);
    await forgetDevice("owner");
    expect(await loadDevice("owner")).toBeNull();
    expect((await loadDevice("other"))?.address).toBe(other.address);
    expect((await makeDevice("owner")).address).not.toBe(first.address);
  });

  it("does not report success before the transaction has committed", async () => {
    const { transaction, close } = storage();
    let done = false;
    const pending = forgetDevice("owner").then(() => { done = true; });
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(done).toBe(false);
    expect(close).not.toHaveBeenCalled();
    transaction.oncomplete?.();
    await pending;
    expect(done).toBe(true);
    expect(close).toHaveBeenCalledOnce();
  });

  it("reports an abort even after the request returned a result", async () => {
    const { transaction, close } = storage();
    const pending = forgetDevice("owner");
    const failed = expect(pending).rejects.toThrow("Storage full");
    await new Promise((resolve) => setTimeout(resolve, 0));
    transaction.error = new Error("Storage full");
    transaction.onabort?.();
    await failed;
    expect(close).toHaveBeenCalledOnce();
  });
});
