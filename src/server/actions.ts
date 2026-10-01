import "server-only";

import { NextResponse } from "next/server";
import { getPublicEnv } from "@/config/env";
import { CLUSTER_CAIP2 } from "@/lib/solana/cluster";

/**
 * Solana Actions: a link that unfurls into a card a wallet can act on — on
 * X, on dial.to, in any Blink client. Every response carries the CORS and
 * version headers the spec asks for; errors are `{ message }` in one
 * sentence that says what did not change.
 */
export const ACTION_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,PUT,OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, Content-Encoding, Accept-Encoding, X-Action-Version, X-Blockchain-Ids",
  "Access-Control-Expose-Headers": "X-Action-Version, X-Blockchain-Ids",
  "X-Action-Version": "2.4",
  "X-Blockchain-Ids": CLUSTER_CAIP2[getPublicEnv().solanaCluster],
};

export function actionJson(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: ACTION_HEADERS });
}

export function actionError(message: string, status = 400) {
  return actionJson({ message }, status);
}

export function preflight() {
  return new Response(null, { status: 204, headers: ACTION_HEADERS });
}

/** An absolute URL on this deployment, from the request that asked. */
export function absolute(request: Request, path: string): string {
  return new URL(path, request.url).toString();
}

/** The `account` a Blink client posts: the wallet that will sign. */
export async function postedAccount(request: Request): Promise<string | null> {
  const body = (await request.json().catch(() => null)) as { account?: unknown } | null;
  return typeof body?.account === "string" ? body.account : null;
}

export function caller(request: Request): string {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
}

