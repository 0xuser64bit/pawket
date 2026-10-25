import type { Metadata } from "next";
import { BackLink, Screen } from "@/components/pk";
import { FoundGuild } from "@/components/guilds/found-guild";
import { GUILD_LIMITS } from "@/lib/solana/program";

export const metadata: Metadata = { title: "Found a guild" };

export default async function FoundGuildPage({ searchParams }: { searchParams: Promise<{ name?: string | string[] }> }) {
  const { name } = await searchParams;
  return (
    <Screen>
      <BackLink label="Guilds" href="/guilds" />
      <FoundGuild initialName={typeof name === "string" ? name.slice(0, GUILD_LIMITS.maxName) : ""}>
        <div>
          <h1 className="display-l">Found a guild</h1>
          <p className="caption pk-faint" style={{ maxWidth: "56ch" }}>
            Optional, like every guild. A pet on Solana founds it and is its first member; anyone&apos;s pet can join
            after, and leave whenever they like.
          </p>
        </div>
      </FoundGuild>
    </Screen>
  );
}
