"use client";

import { NavLink as Link } from "@/components/pk/nav-link";
import { LaunchStage, SectionLabel, Stack } from "@/components/pk";
import type { ChainGuild } from "@/lib/solana/accounts";
import type { CoinStage } from "@/lib/coins/stage";
import { formatUtcDate } from "@/lib/utils/format";
import { GuildCrest } from "./guild-crest";
import { useCompanion } from "@/lib/companion/use-companion";
import { yourPlace, YourBadge, type YourPlace } from "./yours";

/**
 * Every guild, yours first: the ones you founded or a pet of yours is in,
 * read from the connected wallet, then the rest. Nothing is saved beside
 * chain state.
 */
export function GuildDirectory({ guilds, coins }: { guilds: ChainGuild[]; coins: Map<string, CoinStage> }) {
  const companion = useCompanion();
  const places = new Map(guilds.map((guild) => [guild.address, yourPlace(companion, guild)]));
  const isYours = (guild: ChainGuild) => places.get(guild.address)!.founded || places.get(guild.address)!.pets.length > 0;
  const yours = guilds.filter(isYours);
  const others = guilds.filter((guild) => !isYours(guild));
  const groups = [
    { title: "Your guilds", guilds: yours },
    { title: yours.length ? "More guilds" : "On Solana now", guilds: others },
  ];
  return (
    <Stack gap={5}>
      {groups.map((group) =>
        group.guilds.length ? (
          <section key={group.title} aria-label={group.title} className="pk-stack">
            <SectionLabel tone="bloom" count={String(group.guilds.length)}>
              {group.title}
            </SectionLabel>
            <div className="pk-rows">
              {group.guilds.map((guild) => (
                <GuildCard key={guild.address} guild={guild} coin={coins.get(guild.slug)} place={places.get(guild.address)!} />
              ))}
            </div>
          </section>
        ) : null,
      )}
    </Stack>
  );
}

function GuildCard({ guild, coin, place }: { guild: ChainGuild; coin?: CoinStage; place: YourPlace }) {
  const yours = place.founded || place.pets.length > 0;
  return (
    <div className={yours ? "pk-guild pk-guild--yours" : "pk-guild"}>
      <GuildCrest crest={guild.crest} colour={guild.colour} name={guild.name} />
      <div className="pk-fill">
        <div className="pk-guild__head">
          <Link href={`/guilds/${guild.slug}`} className="title pk-guild__name" transitionTypes={["nav-forward"]}>
            {guild.name}
          </Link>
          {yours ? <YourBadge {...place} /> : null}
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
