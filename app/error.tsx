"use client";

import { Banner, Button, ButtonLink, Row, Screen, Stack } from "@/components/pk";

/** A screen failure cannot establish whether an earlier send reached Solana. */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
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
        <Row gap={3} wrap>
          <Button label="Try again" onClick={reset} icon="clock" />
          <ButtonLink label="Home" href="/home" tone="quiet" icon="home" />
        </Row>
      </Stack>
    </Screen>
  );
}
