// @vitest-environment node
import { afterEach, expect, it, vi } from "vitest";

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
