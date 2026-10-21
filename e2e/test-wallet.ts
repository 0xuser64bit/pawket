import { generateKeyPairSync } from "node:crypto";

export interface TestWallet {
  address: string;
  script: string;
}

const ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";

function base58(bytes: Uint8Array): string {
  let value = BigInt(`0x${Buffer.from(bytes).toString("hex") || "0"}`);
  let out = "";
  while (value > 0n) {
    out = ALPHABET[Number(value % 58n)] + out;
    value /= 58n;
  }
  for (const byte of bytes) {
    if (byte !== 0) break;
    out = `1${out}`;
  }
  return out;
}

export function createTestWallet(name = "Pawket Test Wallet"): TestWallet {
  const { privateKey, publicKey } = generateKeyPairSync("ed25519");
  const pkcs8 = privateKey.export({ format: "der", type: "pkcs8" }).toString("base64");
  const raw = new Uint8Array(publicKey.export({ format: "der", type: "spki" }).subarray(-32));
  const address = base58(raw);
  const config = JSON.stringify({ name, address, pkcs8, publicKey: Array.from(raw) });
  return { address, script: `(${install.toString()})(${config});` };
}

function install(config: { name: string; address: string; pkcs8: string; publicKey: number[] }) {
  const publicKey = new Uint8Array(config.publicKey);
  const chains = ["solana:devnet", "solana:localnet", "solana:testnet"] as const;
  const keyPromise = crypto.subtle.importKey(
    "pkcs8",
    Uint8Array.from(atob(config.pkcs8), (c) => c.charCodeAt(0)),
    { name: "Ed25519" },
    false,
    ["sign"],
  );
  const account = {
    address: config.address,
    publicKey,
    chains,
    features: ["solana:signTransaction", "solana:signMessage"],
    label: config.name,
  };
  let connected = false;
  const listeners = new Set<(change: unknown) => void>();
  const emit = () => listeners.forEach((listener) => listener({ accounts: connected ? [account] : [] }));

  function shortvec(bytes: Uint8Array, offset: number): [number, number] {
    let value = 0;
    let size = 0;
    for (;;) {
      const byte = bytes[offset + size];
      value |= (byte & 0x7f) << (7 * size);
      size += 1;
      if ((byte & 0x80) === 0) return [value, offset + size];
    }
  }

  async function signTransaction(wire: Uint8Array): Promise<Uint8Array> {
    const counted = window as unknown as { __testWalletSigned?: number };
    counted.__testWalletSigned = (counted.__testWalletSigned ?? 0) + 1;
    const [count, signaturesAt] = shortvec(wire, 0);
    const message = wire.slice(signaturesAt + count * 64);
    const head = message[0] & 0x80 ? 1 : 0;
    const signers = message[head];
    const [, keysAt] = shortvec(message, head + 3);
    for (let i = 0; i < signers; i++) {
      const key = message.slice(keysAt + 32 * i, keysAt + 32 * (i + 1));
      if (key.every((byte, j) => byte === publicKey[j])) {
        const signature = new Uint8Array(await crypto.subtle.sign("Ed25519", await keyPromise, message));
        const signed = wire.slice();
        signed.set(signature, signaturesAt + 64 * i);
        return signed;
      }
    }
    throw new Error("The test wallet is not a signer of this transaction.");
  }

  const wallet = {
    version: "1.0.0",
    name: config.name,
    icon: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAzMiAzMiI+PHJlY3Qgd2lkdGg9IjMyIiBoZWlnaHQ9IjMyIiByeD0iNiIgZmlsbD0iIzJhMWUxNCIvPjwvc3ZnPg==",
    chains,
    get accounts() {
      return connected ? [account] : [];
    },
    features: {
      "standard:connect": {
        version: "1.0.0",
        connect: async () => {
          connected = true;
          emit();
          return { accounts: [account] };
        },
      },
      "standard:disconnect": {
        version: "1.0.0",
        disconnect: async () => {
          connected = false;
          emit();
        },
      },
      "standard:events": {
        version: "1.0.0",
        on: (_event: string, listener: (change: unknown) => void) => {
          listeners.add(listener);
          return () => listeners.delete(listener);
        },
      },
      "solana:signTransaction": {
        version: "1.0.0",
        supportedTransactionVersions: ["legacy", 0],
        signTransaction: async (...inputs: Array<{ transaction: Uint8Array }>) =>
          Promise.all(inputs.map(async ({ transaction }) => ({ signedTransaction: await signTransaction(transaction) }))),
      },
      "solana:signMessage": {
        version: "1.0.0",
        signMessage: async (...inputs: Array<{ message: Uint8Array }>) =>
          Promise.all(
            inputs.map(async ({ message }) => ({
              signedMessage: message,
              signature: new Uint8Array(await crypto.subtle.sign("Ed25519", await keyPromise, new Uint8Array(message))),
            })),
          ),
      },
    },
  };

  const register = ({ register }: { register: (w: unknown) => void }) => register(wallet);
  window.dispatchEvent(Object.assign(new Event("wallet-standard:register-wallet"), { detail: register }));
  window.addEventListener("wallet-standard:app-ready", (event) =>
    register((event as unknown as { detail: { register: (w: unknown) => void } }).detail),
  );
}
