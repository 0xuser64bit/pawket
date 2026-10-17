import { z } from "zod";
import { scrub, scrubPath } from "@/lib/analytics/scrub";
import { createLimiter } from "@/lib/solana/sponsor";
import { caller } from "@/server/actions";

/**
 * POST { path, name, message, digest }: a screen that broke in a browser,
 * said in one line of Pawket's logs so it can be fixed — the page, the kind
 * of error and its message, scrubbed of URLs and addresses, and nothing about
 * who saw it. Sent only while the player is being counted (`record`).
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const HOUR = 60 * 60 * 1000;
const reports = createLimiter(30, HOUR);
const bodySchema = z.object({
  path: z.string().max(400),
  name: z.string().max(80),
  message: z.string().max(1000),
  digest: z.string().max(80).optional(),
});

export async function POST(request: Request) {
  if (!reports(caller(request))) return new Response(null, { status: 429 });
  const body = bodySchema.safeParse(await request.json().catch(() => null));
  if (!body.success) return new Response(null, { status: 400 });
  const { path, name, message, digest } = body.data;
  console.error(JSON.stringify({ pawket: "client-error", path: scrubPath(path), name: scrub(name, 80), message: scrub(message), digest: digest && scrub(digest, 80) }));
  return new Response(null, { status: 204 });
}
