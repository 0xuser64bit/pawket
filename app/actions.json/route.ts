import { ACTION_HEADERS, preflight } from "@/server/actions";

/** Tells Blink clients which paths on this domain are Solana Actions. */
export function GET() {
  return Response.json(
    { rules: [{ pathPattern: "/api/actions/**", apiPath: "/api/actions/**" }] },
    { headers: ACTION_HEADERS },
  );
}

export const OPTIONS = preflight;
