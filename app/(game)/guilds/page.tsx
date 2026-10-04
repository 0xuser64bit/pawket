import type { Metadata } from "next";
import Link from "next/link";
import { Banner, ButtonLink, Card, Chip, LaunchStage, Screen, ScreenBar, SectionLabel, Stack } from "@/components/pk";
import { GuildCrest } from "@/components/guilds/guild-crest";
import { GUILD_CAN, GUILD_CANNOT } from "@/lib/guilds/boundary";
import { isListed } from "@/lib/guilds/delisted";
import type { ChainGuild } from "@/lib/solana/accounts";
import { formatUtcDate } from "@/lib/utils/format";
import type { CoinStage } from "@/lib/coins/stage";
import { readCoinStages } from "@/server/coins/meteora";
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

function GuildCard({ guild, coin }: { guild: ChainGuild; coin?: CoinStage }) {
  return (
    <div className="pk-guild">
      <GuildCrest crest={guild.crest} colour={guild.colour} name={guild.name} />
      <div className="pk-fill">
        <div className="pk-guild__head">
          <Link href={`/guilds/${guild.slug}`} className="title pk-guild__name">
            {guild.name}
          </Link>
        </div>
        <p className="body-sm pk-muted" style={{ marginTop: "var(--space-1)" }}>
          {guild.motto || "No motto yet."}
        </p>
        <div className="pk-guild__foot">
          <span className="caption pk-faint">
            {guild.memberCount} {guild.memberCount === 1 ? "pet" : "pets"}{" "}
            <span className="pk-nowrap">· since {formatUtcDate(new Date(guild.createdAt * 1000).toISOString())}</span>
          </span>
          {coin && coin !== "none" ? <LaunchStage stage={coin} /> : null}
        </div>
      </div>
    </div>
  );
}

/**
 * Guilds: pets and their people, gathered under a name and a crest, kept on
 * Solana where anyone can read who is in one. Optional, said first. Read
 * live from the program; the rule every guild lives inside comes last.
 */
export default async function GuildsPage() {
  let guilds: ChainGuild[] | null = null;
  let coins = new Map<string, CoinStage>();
  try {
    guilds = (await readGuilds())
      .filter(isListed)
      .sort((a, b) => b.memberCount - a.memberCount || a.createdAt - b.createdAt);
    // Optional, like the coins: the list shows without them if they cannot be read.
    coins = await readCoinStages(guilds).catch(() => coins);
  } catch {
    guilds = null;
  }

  return (
    <Screen>
      <ScreenBar>
        <div>
          <h1 className="display-l">Guilds</h1>
          <p className="caption pk-faint">Optional, always. Kept on Solana.</p>
        </div>
        <Chip label={guilds ? `${guilds.length} ${guilds.length === 1 ? "guild" : "guilds"}` : "Guilds"} tone="bloom" icon="guild" />
      </ScreenBar>

      <Stack gap={6}>
        <Card variant="quiet">
          <p className="body" style={{ maxWidth: "62ch" }}>
            Pets and the people who keep them, gathered under a name, a motto and a crest. Joining one is optional —
            and so is staying. A pet is in one guild at a time; it joins with its owner&apos;s signature, Pawket
            pays the fee, and the guild is a record on Solana that anyone can read. A guild may launch a coin of its
            own, optional like the guild; nothing in a guild changes a pet.
          </p>
          <div style={{ marginTop: "var(--space-4)" }}>
            <ButtonLink label="Found a guild" href="/guilds/new" tone="bloom" icon="guild" />
          </div>
        </Card>

        {guilds === null ? (
          <Banner
            tone="wait"
            title="Solana did not answer"
            body="Every guild there is unchanged; this page could not read them just now. Reload to ask again."
          />
        ) : guilds.length === 0 ? (
          <Card>
            <h2 className="title">No guild yet</h2>
            <p className="body-sm pk-muted" style={{ marginTop: "var(--space-2)" }}>
              The first one is yours to found. It needs a pet on Solana and a name nobody has.
            </p>
          </Card>
        ) : (
          <Stack gap={3}>
            <SectionLabel tone="bloom" count={`${guilds.length}`}>
              On Solana now
            </SectionLabel>
            <div className="pk-rows">
              {guilds.map((guild) => (
                <GuildCard key={guild.address} guild={guild} coin={coins.get(guild.slug)} />
              ))}
            </div>
          </Stack>
        )}

        <Stack gap={3}>
          <SectionLabel>The rule every guild lives inside</SectionLabel>
          <div className="pk-rows">
            <Card>
              <h2 className="title" style={{ marginBottom: "var(--space-3)", color: "var(--pool-text)" }}>
                A guild can
              </h2>
              <Bounds items={GUILD_CAN} mark="✓" color="var(--pool-text)" />
            </Card>
            <Card>
              <h2 className="title" style={{ marginBottom: "var(--space-3)", color: "var(--alarm-text)" }}>
                It can never
              </h2>
              <Bounds items={GUILD_CANNOT} mark="✕" color="var(--alarm-text)" />
            </Card>
          </div>
          <Banner
            tone="info"
            title="A guild never touches your pet"
            body="No stat increase, no faster care, no XP multiplier, no matchmaking priority — and a guild's coin, if it has one, changes none of that either. Leaving changes nothing about the pet."
          />
        </Stack>
      </Stack>
    </Screen>
  );
}
