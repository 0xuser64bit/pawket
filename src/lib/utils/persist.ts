/**
 * Asks the browser to keep Pawket's storage — the pets in this browser and
 * a linked device's key — rather than clear it when space runs short. Asked
 * at the moments a player commits something to this device (an adoption, a
 * link); Chrome and Safari answer from how the site is used, Firefox may ask
 * the player. True when the storage is kept. It never throws.
 */
export async function askBrowserToKeep(): Promise<boolean> {
  try {
    const storage = typeof navigator === "undefined" ? undefined : navigator.storage;
    if (!storage?.persist) return false;
    if (await storage.persisted?.()) return true;
    return await storage.persist();
  } catch {
    return false;
  }
}
