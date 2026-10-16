"use client";

import { NavLink as Link } from "@/components/pk/nav-link";
import { Chip, LaunchStage, SectionLabel, Stack } from "@/components/pk";
import { useCompanion } from "@/lib/companion/use-companion";
import type { ChainGuild } from "@/lib/solana/accounts";
import type { CoinStage } from "@/lib/coins/stage";
import { formatUtcDate } from "@/lib/utils/format";
import { GuildCrest } from "./guild-crest";

/** Membership is read from the connected wallet; nothing is saved beside chain state. */
export function GuildDirectory({ guilds, coins }: { guilds: ChainGuild[]; coins: Map<string, CoinStage> }) {
  const companion = useCompanion();
  const status = (guild: ChainGuild) => ({
    founded: companion.owner === guild.founder,
    joined: companion.owned.filter((entry) => entry.member?.guild === guild.address).length,
  });
  const yours = guilds.filter((guild) => { const state = status(guild); return state.founded || state.joined > 0; });
  const others = guilds.filter((guild) => !yours.includes(guild));
  return <Stack gap={5}>
    {[{ title: "Your guilds", guilds: yours }, { title: yours.length ? "Explore guilds" : "On Solana now", guilds: others }].map((group) => group.guilds.length ? (
      <section key={group.title} aria-label={group.title} className="pk-stack">
        <SectionLabel tone="bloom" count={String(group.guilds.length)}>{group.title}</SectionLabel>
        <div className="pk-rows">{group.guilds.map((guild) => <GuildCard key={guild.address} guild={guild} coin={coins.get(guild.slug)} {...status(guild)} />)}</div>
      </section>
    ) : null)}
  </Stack>;
}

function GuildCard({ guild, coin, founded, joined }: { guild: ChainGuild; coin?: CoinStage; founded: boolean; joined: number }) {
  return (
    <div className={`pk-guild${founded || joined ? " pk-guild--yours" : ""}`}>
      <GuildCrest crest={guild.crest} colour={guild.colour} name={guild.name} />
      <div className="pk-fill">
        <div className="pk-guild__head">
          {founded ? <Chip label="Founded by you" tone="bloom" icon="guild" /> : joined ? <Chip label="Joined" tone="bloom" icon="check" /> : null}
          <Link href={`/guilds/${guild.slug}`} className="title pk-guild__name" transitionTypes={["nav-forward"]}>
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

