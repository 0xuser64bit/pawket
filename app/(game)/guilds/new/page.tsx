import type { Metadata } from "next";
import { BackLink, Screen } from "@/components/pk";
import { FoundGuild } from "@/components/guilds/found-guild";

export const metadata: Metadata = { title: "Found a guild" };

/** Founding is one decision, so it keeps a reading measure. */
export default function FoundGuildPage() {
  return (
    <Screen width="narrow">
      <BackLink label="Guilds" href="/guilds" />
      <h1 className="display-l" style={{ margin: "var(--space-3) 0 var(--space-2)" }}>
        Found a guild
      </h1>
      <p className="body pk-muted" style={{ marginBottom: "var(--space-6)" }}>
        Optional, like every guild. A pet on Solana founds it and is its first member; anyone&apos;s pet can join
        after, and leave whenever they like.
      </p>
      <FoundGuild />
    </Screen>
  );
}
