// @vitest-environment node
import { afterEach, expect, it, vi } from "vitest";
import { PAWKET_PROGRAM_ID } from "@/lib/solana/program";

vi.mock("@/server/actions", () => ({ caller: () => "203.0.113.7" }));
vi.mock("@/config/server-env", () => ({ serverRpcUrl: () => "https://rpc.example/" }));

const { POST } = await import("./route");

afterEach(() => vi.unstubAllGlobals());

it("forwards the request it checked, never the raw text a second parser could read differently", async () => {
  const upstream = vi.fn<(url: string, init: RequestInit) => Promise<Response>>(async () => Response.json({ jsonrpc: "2.0", id: 1, result: { value: {} } }));
  vi.stubGlobal("fetch", upstream);
  const raw = '{"jsonrpc":"2.0","id":1,"method":"getProgramAccounts","method":"getLatestBlockhash","params":[]}';

  const response = await POST(new Request("http://localhost/api/rpc", { method: "POST", body: raw }));

  expect(response.status).toBe(200);
  const [url, init] = upstream.mock.calls[0];
  expect(url).toBe("https://rpc.example/");
  expect(init.body).toBe('{"jsonrpc":"2.0","id":1,"method":"getLatestBlockhash","params":[]}');
});

it("sends nothing on that it refuses", async () => {
  const upstream = vi.fn();
  vi.stubGlobal("fetch", upstream);
  const response = await POST(new Request("http://localhost/api/rpc", { method: "POST", body: '{"jsonrpc":"2.0","id":2,"method":"requestAirdrop","params":[]}' }));
  expect(response.status).toBe(400);
  expect(upstream).not.toHaveBeenCalled();
});

it("refuses a null memcmp filter as JSON-RPC without calling the provider", async () => {
  const upstream = vi.fn();
  vi.stubGlobal("fetch", upstream);
  const response = await POST(new Request("http://localhost/api/rpc", {
    method: "POST",
    body: JSON.stringify({ jsonrpc: "2.0", id: 3, method: "getProgramAccounts", params: [PAWKET_PROGRAM_ID, { filters: [{ memcmp: null }] }] }),
  }));
  expect(response.status).toBe(400);
  expect(await response.json()).toEqual({ jsonrpc: "2.0", id: 3, error: { code: -32600, message: "A scan names one of Pawket's account kinds." } });
  expect(upstream).not.toHaveBeenCalled();
});

const ask = (route: { POST: typeof POST }, method = "getBalance") =>
  route.POST(new Request("http://localhost/api/rpc", { method: "POST", body: JSON.stringify({ jsonrpc: "2.0", id: 9, method, params: [] }) }));

it("refuses a body over 64,000 characters or one that is not JSON, as JSON-RPC and asking for a pause", async () => {
  const upstream = vi.fn();
  vi.stubGlobal("fetch", upstream);
  const huge = await POST(new Request("http://localhost/api/rpc", { method: "POST", body: " ".repeat(64_001) }));
  expect([huge.status, await huge.json(), huge.headers.get("retry-after")]).toEqual([413, { jsonrpc: "2.0", id: null, error: { code: -32600, message: "That request is too large." } }, "2"]);
  const garbled = await POST(new Request("http://localhost/api/rpc", { method: "POST", body: "{" }));
  expect([garbled.status, await garbled.json()]).toEqual([400, { jsonrpc: "2.0", id: null, error: { code: -32600, message: "That is not JSON." } }]);
  const exactly = await POST(new Request("http://localhost/api/rpc", { method: "POST", body: `null${" ".repeat(63_996)}` }));
  expect(exactly.status).toBe(400);
  expect(upstream).not.toHaveBeenCalled();
});

it("holds each caller to 200 calls in ten seconds and 30 sends a minute", async () => {
  vi.resetModules();
  const route = await import("./route");
  vi.stubGlobal("fetch", vi.fn(async () => Response.json({ jsonrpc: "2.0", id: 9, result: "ok" })));
  for (let i = 0; i < 30; i++) expect((await ask(route, "sendTransaction")).status).toBe(200);
  const sends = await ask(route, "sendTransaction");
  expect([sends.status, (await sends.json()).error.message]).toEqual([429, "Too many in a row. Ask again in a moment."]);
  for (let i = 0; i < 169; i++) expect((await ask(route)).status).toBe(200);
  expect((await ask(route)).status).toBe(429);
});

it("answers as the provider did, uncached, and says so when the provider does not answer", async () => {
  vi.stubGlobal("fetch", vi.fn(async () => new Response('{"jsonrpc":"2.0","id":9,"error":{"code":429}}', { status: 429, headers: { "retry-after": "7" } })));
  const busy = await ask({ POST });
  expect([busy.status, busy.headers.get("retry-after"), busy.headers.get("cache-control"), busy.headers.get("content-type")]).toEqual([429, "7", "no-store", "application/json"]);
  vi.stubGlobal("fetch", vi.fn(async () => { throw new TypeError("fetch failed"); }));
  const gone = await ask({ POST });
  expect([gone.status, await gone.json()]).toEqual([502, { jsonrpc: "2.0", id: 9, error: { code: -32600, message: "The server's RPC did not answer." } }]);
  const [, init] = (fetch as unknown as { mock: { calls: [string, RequestInit][] } }).mock.calls[0];
  expect([init.method, new Headers(init.headers).get("content-type"), init.cache]).toEqual(["POST", "application/json", "no-store"]);
});
