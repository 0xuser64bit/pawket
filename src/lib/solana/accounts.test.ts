import { describe, expect, it } from "vitest";
import { getAccountSummary, isProgramDeployed } from "./accounts";

function stubClient(value: unknown) {
  return {
    rpc: {
      getAccountInfo: () => ({
        send: async () => ({ value }),
      }),
    },
  };
}

describe("getAccountSummary", () => {
  it("reports an existing account", async () => {
    const summary = await getAccountSummary(
      stubClient({ lamports: 10n, owner: "11111111111111111111111111111111", data: { length: 8 } }),
      "11111111111111111111111111111111",
      "test",
    );
    expect(summary).toEqual({
      exists: true,
      lamports: 10n,
      owner: "11111111111111111111111111111111",
      dataLength: 8,
    });
  });

  it("reports a missing account as not existing", async () => {
    const summary = await getAccountSummary(
      stubClient(null),
      "11111111111111111111111111111111",
      "test",
    );
    expect(summary.exists).toBe(false);
  });

  it("rejects an invalid address before any RPC call", async () => {
    await expect(
      getAccountSummary(stubClient(null), "nope", "pet"),
    ).rejects.toThrow(/Invalid pet/);
  });
});

describe("isProgramDeployed", () => {
  it("is true when the program account exists", async () => {
    await expect(
      isProgramDeployed(
        stubClient({ lamports: 1n, owner: "BPFLoader", data: { length: 100 } }),
        "11111111111111111111111111111111",
      ),
    ).resolves.toBe(true);
  });

  it("is false when nothing is deployed there", async () => {
    await expect(
      isProgramDeployed(stubClient(null), "11111111111111111111111111111111"),
    ).resolves.toBe(false);
  });
});
