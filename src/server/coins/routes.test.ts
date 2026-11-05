// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
import { CoinRefusal } from "./meteora";
import { coinError } from "./routes";

afterEach(() => vi.restoreAllMocks());

describe("coin route errors", () => {
  it("keeps provider credentials out of logs and responses", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const response = coinError(new TypeError("RPC https://provider.example/private-test-token refused the request"), "quote", Date.now() - 50);
    expect(response.status).toBe(503);
    expect(await response.text()).not.toContain("private-test-token");
    expect(log).toHaveBeenCalledOnce();
    const entry = JSON.parse(String(log.mock.calls[0][0]));
    expect(entry).toMatchObject({ pawket: "coin-error", operation: "quote", name: "TypeError", message: "RPC [url] refused the request" });
    expect(entry.elapsedMs).toBeGreaterThanOrEqual(50);
    expect(entry.elapsedMs).toBeLessThan(1000);
  });

  it("preserves an expected refusal's message and status", async () => {
    const response = coinError(new CoinRefusal("Trading is paused.", 409));
    expect(response.status).toBe(409);
    expect(await response.json()).toMatchObject({ message: "Trading is paused." });
  });
});
