// @vitest-environment node
import { createServer, type IncomingMessage, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { Connection, PublicKey, type AccountInfo } from "@solana/web3.js";
import { DYNAMIC_BONDING_CURVE_PROGRAM_ID } from "@meteora-ag/dynamic-bonding-curve-sdk";
import { afterAll, afterEach, beforeAll, beforeEach, expect, it, vi } from "vitest";
import type { ChainGuild } from "@/lib/solana/accounts";

const config = vi.hoisted(() => ({ url: "" }));
vi.mock("@/config/server-env", async (actual) => ({
  ...(await actual<typeof import("@/config/server-env")>()),
  getServerEnv: () => ({ derivationSecret: "01".repeat(32) }),
  serverRpcUrl: () => config.url,
}));

const guild = { slug: "deadline-club", name: "Deadline Club", founder: new PublicKey(new Uint8Array(32)).toBase58() } as ChainGuild;
let server: Server;
let requests: IncomingMessage[];
let closed: number;
let responseHeaders: boolean;
beforeAll(async () => {
  server = createServer((request, response) => {
    requests.push(request);
    request.socket.once("close", () => { closed += 1; });
    if (responseHeaders) { response.writeHead(200, { "Content-Type": "application/json" }); response.flushHeaders(); }
    // Deliberately send no response: abort must close the actual HTTP operation.
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  config.url = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});
beforeEach(() => { requests = []; closed = 0; responseHeaders = false; });
afterEach(() => { server.closeAllConnections(); vi.restoreAllMocks(); });
afterAll(async () => {
  await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
});

it.each(["discovery", "SDK pool and config", "response body"])("cancels stalled %s network reads without leaving HTTP work behind", async (phase) => {
  responseHeaders = phase === "response body";
  if (phase === "SDK pool and config") {
    const pool = { owner: DYNAMIC_BONDING_CURVE_PROGRAM_ID, data: Buffer.alloc(8) } as AccountInfo<Buffer>;
    vi.spyOn(Connection.prototype, "getMultipleAccountsInfo").mockResolvedValue([pool, null]);
  }
  const { quoteTrade } = await import("./meteora");
  const controller = new AbortController();
  let outcome: unknown;
  const pending = quoteTrade(guild, "buy", 100n, 100, controller.signal).then(
    () => { outcome = "Unexpected quote"; },
    (error) => { outcome = error; },
  );
  await vi.waitFor(() => expect(requests).toHaveLength(phase === "SDK pool and config" ? 2 : 1));
  controller.abort(new DOMException("The quote took too long", "TimeoutError"));
  await vi.waitFor(() => expect(outcome).toBeInstanceOf(Error), { timeout: 250 });
  await vi.waitFor(() => expect(closed).toBe(requests.length), { timeout: 250 });
  await pending;
  // The SDK tries compatibility decoders after a refused read; cancellation
  // must prevent those fallbacks from creating another network request.
  expect(requests).toHaveLength(phase === "SDK pool and config" ? 2 : 1);
});


it("cancels the guild read through Kit before quote providers are called", async () => {
  const { readGuild } = await import("@/server/solana");
  const controller = new AbortController();
  let outcome: unknown;
  const pending = readGuild(guild.slug, controller.signal).then(
    () => { outcome = "Unexpected guild"; },
    (error) => { outcome = error; },
  );
  await vi.waitFor(() => expect(requests).toHaveLength(1));
  controller.abort(new DOMException("The quote took too long", "TimeoutError"));
  await vi.waitFor(() => expect(outcome).toBeInstanceOf(Error), { timeout: 250 });
  await vi.waitFor(() => expect(closed).toBe(1), { timeout: 250 });
  await pending;
});
