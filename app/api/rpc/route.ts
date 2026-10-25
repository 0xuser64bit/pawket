import { NextResponse } from "next/server";
import { serverRpcUrl } from "@/config/server-env";
import { checkRpcRequest } from "@/lib/solana/rpc-proxy";
import { createLimiter } from "@/lib/solana/sponsor";
import { caller as callerOf } from "@/server/actions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const anyCall = createLimiter(200, 10_000);
const sends = createLimiter(30, 60_000);

const refuse = (id: unknown, message: string, status: number) =>
  NextResponse.json({ jsonrpc: "2.0", id: id ?? null, error: { code: -32600, message } }, { status, headers: { "retry-after": "2" } });

export async function POST(request: Request) {
  const text = await request.text();
  if (text.length > 64_000) return refuse(null, "That request is too large.", 413);
  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    return refuse(null, "That is not JSON.", 400);
  }
  const id = (body as { id?: unknown } | null)?.id;
  const check = checkRpcRequest(body);
  if (!check.ok) return refuse(id, check.reason, 400);
  const caller = callerOf(request);
  if (!anyCall(caller) || (check.method === "sendTransaction" && !sends(caller))) return refuse(id, "Too many in a row. Ask again in a moment.", 429);

  const upstream = await fetch(serverRpcUrl(), {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
    signal: AbortSignal.timeout(20_000),
  }).catch(() => null);
  if (!upstream) return refuse(id, "The server's RPC did not answer.", 502);
  const retry = upstream.headers.get("retry-after");
  return new Response(upstream.body, {
    status: upstream.status,
    headers: { "content-type": "application/json", "cache-control": "no-store", ...(retry ? { "retry-after": retry } : {}) },
  });
}
