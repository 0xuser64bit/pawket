import type { Instrumentation } from "next";
import { scrub, scrubPath } from "@/lib/analytics/scrub";

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
