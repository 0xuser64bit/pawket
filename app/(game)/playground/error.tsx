"use client";

import { useEffect } from "react";
import { Banner, Button, ButtonLink, Screen, Stack } from "@/components/pk";
import { reportError } from "@/lib/analytics/events";

export default function PlaygroundError({ error }: { error: unknown }) {
  useEffect(() => { if (error instanceof Error) reportError(error); }, [error]);
  return (
    <Screen width="narrow">
      <Stack gap={5} style={{ paddingTop: "var(--space-8)" }}>
        <h1 className="display-m">The playground did not load</h1>
        <Banner
          tone="risk"
          title="Reconnect, then open it again"
          body="Reloading reopens the game picker. An unfinished round is not recorded; check any transaction receipt before repeating it."
        />
        <div className="pk-acts">
          {/* A rejected lazy import survives a segment retry; reload its module cache. */}
          <Button label="Reload playground" onClick={() => window.location.reload()} icon="clock" />
          <ButtonLink label="Home" href="/home" tone="quiet" icon="home" />
        </div>
      </Stack>
    </Screen>
  );
}
