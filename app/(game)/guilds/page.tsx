import type { Metadata } from "next";
import { ButtonLink, Card, ReadFailure, Screen, ScreenBar, Stack } from "@/components/pk";
import { GuildDirectory } from "@/components/guilds/directory";
import { GUILD_CAN, GUILD_CANNOT } from "@/lib/guilds/boundary";
import { isListed } from "@/lib/guilds/delisted";
import type { ChainGuild } from "@/lib/solana/accounts";
import type { CoinStage } from "@/lib/coins/stage";
import { readGuilds } from "@/server/solana";

export const metadata: Metadata = {
  title: "Guilds",
  description: "Guilds of pets and their people, kept on Solana. Optional, free to join and free to leave.",
};
export const dynamic = "force-dynamic";

function Bounds({ items, mark, color }: { items: string[]; mark: string; color: string }) {
  return (
    <ul className="pk-bounds body-sm">
      {items.map((item) => (
        <li key={item}>
          <span className="pk-bounds__mark" style={{ color }} aria-hidden="true">
            {mark}
          </span>
          {item}
        </li>
      ))}
    </ul>
  );
}

/**
 * Guilds: pets and their people, gathered under a name and a crest, kept on
 * Solana where anyone can read who is in one. Optional, said first, in the
 * bar beside the way to found one; then the page is the guilds, read live
 * from the program, and the rule every guild lives inside folds away.
 */
export default async function GuildsPage() {
  let guilds: ChainGuild[] | null = null;
  let coins = new Map<string, CoinStage>();
  try {
    guilds = (await readGuilds())
      .filter(isListed)
      .sort((a, b) => b.memberCount - a.memberCount || a.createdAt - b.createdAt);
    // Optional, like the coins: the list shows without them if they — or Meteora's SDK — cannot be read.
    coins = await import("@/server/coins/meteora").then(({ readCoinStages }) => readCoinStages(guilds!)).catch(() => coins);
  } catch {
    guilds = null;
  }

  return (
    <Screen>
      <ScreenBar>
        <div>
          <h1 className="display-l">Guilds</h1>
          <p className="caption pk-faint" style={{ maxWidth: "56ch" }}>
            Pets and their people under a crest, kept on Solana. Optional, always: free to join, free to leave, and
            nothing in a guild changes a pet.
          </p>
        </div>
        <ButtonLink label="Found a guild" href="/guilds/new" tone="bloom" icon="guild" size="sm" />
      </ScreenBar>

      <Stack gap={6}>
        {guilds === null ? (
          <ReadFailure body="This page could not read the guilds just now. Trying again only reads their records." />
        ) : guilds.length === 0 ? (
          <Card>
            <h2 className="title">No guild yet</h2>
            <p className="body-sm pk-muted" style={{ marginTop: "var(--space-2)" }}>
              The first one is yours to found. It needs a pet on Solana and a name nobody has.
            </p>
          </Card>
        ) : (
          <GuildDirectory guilds={guilds} coins={coins} />
        )}

        <details className="pk-fold">
          <summary>
            <span className="title">The rule every guild lives inside</span>
            <span className="caption pk-faint">What a guild can do, and what it never can</span>
          </summary>
          <Stack gap={4}>
            <div className="pk-rows">
              <div>
                <h2 className="title" style={{ marginBottom: "var(--space-3)", color: "var(--pool-text)" }}>
                  A guild can
                </h2>
                <Bounds items={GUILD_CAN} mark="✓" color="var(--pool-text)" />
              </div>
              <div>
                <h2 className="title" style={{ marginBottom: "var(--space-3)", color: "var(--alarm-text)" }}>
                  It can never
                </h2>
                <Bounds items={GUILD_CANNOT} mark="✕" color="var(--alarm-text)" />
              </div>
            </div>
            <p className="body-sm pk-muted">
              A pet joins with its owner&apos;s signature. Network fees are covered while the sponsor is available. No stat increase, no faster care, no XP
              multiplier, no matchmaking priority — and a guild&apos;s coin, if it has one, changes none of that either.
              Leaving changes nothing about the pet.
            </p>
          </Stack>
        </details>
      </Stack>
    </Screen>
  );
}
