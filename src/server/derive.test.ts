// @vitest-environment node
import { createHmac } from "node:crypto";
import { afterEach, expect, it, vi } from "vitest";
import { derivedSeed } from "./derive";

const keypair = (fill: number) => JSON.stringify(Array.from({ length: 64 }, (_, i) => (fill + i) % 256));
const seedOf = (json: string) => Buffer.from(Uint8Array.from(JSON.parse(json) as number[]).subarray(0, 32));
const hmac = (secret: Buffer, label: string) => createHmac("sha256", secret).update(label).digest();

afterEach(() => vi.unstubAllEnvs());

it("derives from the sponsor's secret while no derivation secret is set, as every address so far was", () => {
  vi.stubEnv("SPONSOR_KEYPAIR", keypair(7));
  vi.stubEnv("DERIVATION_SECRET", "");
  expect(derivedSeed("pawket keepsake Pet1")).toEqual(hmac(seedOf(keypair(7)), "pawket keepsake Pet1"));
});

it("keeps every derived address when the sponsor rotates, once the derivation secret holds the old seed", () => {
  vi.stubEnv("SPONSOR_KEYPAIR", keypair(7));
  vi.stubEnv("DERIVATION_SECRET", "");
  const before = derivedSeed("pawket guild coin sunbeam-club");
  vi.stubEnv("DERIVATION_SECRET", seedOf(keypair(7)).toString("hex"));
  vi.stubEnv("SPONSOR_KEYPAIR", keypair(99));
  expect(derivedSeed("pawket guild coin sunbeam-club")).toEqual(before);
});

it("refuses a malformed sponsor key by name, without quoting the secret it falls back to", () => {
  vi.stubEnv("SPONSOR_KEYPAIR", `${keypair(201).slice(0, -1)},]`);
  vi.stubEnv("DERIVATION_SECRET", "");
  expect(() => derivedSeed("pawket keepsake Pet1")).toThrow(/^SPONSOR_KEYPAIR is not a keypair: a JSON array of 64 bytes\.$/);
});

it("refuses a derivation secret that is not 32 bytes of hex, and derives nothing with no secret at all", () => {
  vi.stubEnv("SPONSOR_KEYPAIR", keypair(7));
  vi.stubEnv("DERIVATION_SECRET", "not-a-secret");
  expect(() => derivedSeed("pawket keepsake Pet1")).toThrow(/64 hex characters/);
  vi.stubEnv("DERIVATION_SECRET", "");
  vi.stubEnv("SPONSOR_KEYPAIR", "");
  expect(derivedSeed("pawket keepsake Pet1")).toBeNull();
});
