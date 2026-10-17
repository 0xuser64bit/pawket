import type { Instrumentation } from "next";
import { scrub, scrubPath } from "@/lib/analytics/scrub";

/**
 * One line per server error, findable in the host's logs: where it happened
 * and what kind of error, with its message scrubbed of URLs (an RPC error can
 * carry the provider's key) and addresses. Next logs the error as well; this
 * is the line to search for.
 */
export const onRequestError: Instrumentation.onRequestError = (error, request, context) => {
  const digest = typeof error === "object" && error !== null && "digest" in error ? String(error.digest) : undefined;
  console.error(
    JSON.stringify({
      pawket: "server-error",
      route: context.routePath,
      kind: context.routeType,
      path: scrubPath(request.path),
      method: request.method,
      digest,
      name: error instanceof Error ? error.name : typeof error,
      message: error instanceof Error ? scrub(error.message) : undefined,
    }),
  );
};
