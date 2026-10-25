import { afterEach, expect, it, vi } from "vitest";
import { askBrowserToKeep } from "./persist";

const original = Object.getOwnPropertyDescriptor(navigator, "storage");
afterEach(() => {
  if (original) Object.defineProperty(navigator, "storage", original);
  else Reflect.deleteProperty(navigator, "storage");
});
const storage = (value: unknown) => Object.defineProperty(navigator, "storage", { value, configurable: true });

it("asks once the storage is not already kept, and says what the browser answered", async () => {
  const persist = vi.fn(async () => true);
  storage({ persisted: async () => false, persist });
  await expect(askBrowserToKeep()).resolves.toBe(true);
  expect(persist).toHaveBeenCalledOnce();
});

it("does not ask again when the storage is kept already", async () => {
  const persist = vi.fn();
  storage({ persisted: async () => true, persist });
  await expect(askBrowserToKeep()).resolves.toBe(true);
  expect(persist).not.toHaveBeenCalled();
});

it("is false, never an error, without the API or when the browser refuses", async () => {
  storage(undefined);
  await expect(askBrowserToKeep()).resolves.toBe(false);
  storage({ persisted: async () => false, persist: async () => { throw new Error("SecurityError"); } });
  await expect(askBrowserToKeep()).resolves.toBe(false);
});
