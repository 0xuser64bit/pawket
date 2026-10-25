import { ACTION_HEADERS, preflight } from "@/server/actions";

export function GET() {
  return Response.json(
    {
      rules: [
        { pathPattern: "/adopt", apiPath: "/api/actions/adopt" },
        { pathPattern: "/pet/*", apiPath: "/api/actions/care/*" },
        { pathPattern: "/guilds/*", apiPath: "/api/actions/guild/*" },
        { pathPattern: "/api/actions/**", apiPath: "/api/actions/**" },
      ],
    },
    { headers: ACTION_HEADERS },
  );
}

export const OPTIONS = preflight;
