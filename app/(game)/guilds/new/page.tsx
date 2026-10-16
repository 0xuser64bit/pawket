import type { Metadata } from "next";
import { BackLink, Screen, ScreenBar } from "@/components/pk";
import { FoundGuild } from "@/components/guilds/found-guild";

export const metadata: Metadata = { title: "Found a guild" };

/**
 * Founding sits on the same rails as every place, with the directory's head:
 * the title and one line under it. On a desktop the guild, as it will look,
 * stays in view beside the form that makes it.
 */
export default function FoundGuildPage() {
  return (
    <Screen>
      <BackLink label="Guilds" href="/guilds" />
      <ScreenBar>
        <div>
          <h1 className="display-l">Found a guild</h1>
          <p className="caption pk-faint" style={{ maxWidth: "56ch" }}>
            Optional, like every guild. A pet on Solana founds it and is its first member; anyone&apos;s pet can join
            after, and leave whenever they like.
          </p>
        </div>
      </ScreenBar>
      <FoundGuild />
    </Screen>
  );
}
