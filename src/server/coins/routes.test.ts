// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
import { CoinRefusal } from "./meteora";
import { coinError } from "./routes";

afterEach(() => vi.restoreAllMocks());

describe("coin route errors", () => {
  it("keeps provider credentials out of logs and responses", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const response = coinError(new Error("RPC https://provider.example/private-test-token refused the request"));
    expect(response.status).toBe(503);
    expect(await response.text()).not.toContain("private-test-token");
    expect(log).toHaveBeenCalledExactlyOnceWith("coin route failed");
  });

  it("preserves an expected refusal's message and status", async () => {
    const response = coinError(new CoinRefusal("Trading is paused.", 409));
    expect(response.status).toBe(409);
    expect(await response.json()).toMatchObject({ message: "Trading is paused." });
  });
});
