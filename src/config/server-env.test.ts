// @vitest-environment node
import { describe, expect, it } from "vitest";
import { keypairBytes } from "./server-env";

const secret = Array.from({ length: 64 }, (_, i) => 200 + (i % 50));

describe("keypairBytes", () => {
  it("reads a Solana CLI keypair: a JSON array of 64 bytes", () => {
    expect(Array.from(keypairBytes("SPONSOR_KEYPAIR", JSON.stringify(secret)))).toEqual(secret);
  });

  it("refuses a malformed keypair by its name alone, quoting none of it", () => {
    const pasted = JSON.stringify(secret);
    for (const malformed of [
      `'${pasted}'`,
      `${pasted.slice(0, -1)},]`,
      pasted.replace("201", "2O1"),
      JSON.stringify(secret.slice(0, 63)),
      JSON.stringify([...secret.slice(0, 63), 256]),
      JSON.stringify([...secret.slice(0, 63), 1.5]),
      JSON.stringify({ secret }),
    ]) {
      let message = "";
      try {
        keypairBytes("COLLECTION_AUTHORITY_KEYPAIR", malformed);
      } catch (error) {
        message = (error as Error).message;
      }
      expect(message).toBe("COLLECTION_AUTHORITY_KEYPAIR is not a keypair: a JSON array of 64 bytes.");
    }
  });
});
