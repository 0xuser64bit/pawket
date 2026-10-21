"use client";

import { useEffect } from "react";
import { Banner, Button, ButtonLink, Screen, Stack } from "@/components/pk";
import { reportError } from "@/lib/analytics/events";

export default function GlobalError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => reportError(error), [error]);
  return (
    <Screen width="narrow">
      <Stack gap={5} style={{ paddingTop: "var(--space-8)" }}>
        <h1 className="display-m">It did not load</h1>
        <Banner
          tone="risk"
          title="This screen ran into a problem"
          body="Try opening this screen again. If you were sending a transaction, check its receipt before repeating it."
        />
        {error.digest ? (
          <p className="addr pk-faint">Error {error.digest}</p>
        ) : null}
        <div className="pk-acts">
          <Button label="Try again" onClick={retry} icon="clock" />
          <ButtonLink label="Home" href="/home" tone="quiet" icon="home" />
        </div>
      </Stack>
    </Screen>
  );
}
