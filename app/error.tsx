"use client";

import { Banner, Button, ButtonLink, Row, Screen, Stack } from "@/components/pk";

/**
 * A failure names what is unchanged in the same breath as what went wrong.
 * That sentence is not reassurance; it is the fact a worried person is
 * looking for.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <Screen>
      <Stack gap={5} style={{ paddingTop: "var(--space-8)" }}>
        <h1 className="display-m">It did not load</h1>
        <Banner
          tone="risk"
          title="This screen ran into a problem"
          body="Nothing you own has changed, and no transaction was sent. Your pet is saved in this browser."
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
