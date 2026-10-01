import { ACTION_HEADERS, preflight } from "@/server/actions";

/**
 * Tells Blink clients which pages on this domain are Solana Actions, so the
 * links people already share unfurl as cards: /adopt as the adoption, a
 * pet's record as its four cares.
 */
export function GET() {
  return Response.json(
    {
      rules: [
        { pathPattern: "/adopt", apiPath: "/api/actions/adopt" },
        { pathPattern: "/pet/*", apiPath: "/api/actions/care/*" },
        { pathPattern: "/api/actions/**", apiPath: "/api/actions/**" },
      ],
    },
    { headers: ACTION_HEADERS },
  );
}

export const OPTIONS = preflight;
