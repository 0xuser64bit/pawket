import type { Metadata } from "next";
import { BackLink, Screen } from "@/components/pk";
import { FoundGuild } from "@/components/guilds/found-guild";

export const metadata: Metadata = { title: "Found a guild" };

/**
 * Founding sits on the same rails as every place. The head is the
 * directory's on the left — the title and one line under it — with the guild
 * as it will look on the right (under the title on a phone); the form that
 * makes it fills the width below.
 */
export default function FoundGuildPage() {
  return (
    <Screen>
      <BackLink label="Guilds" href="/guilds" />
      <FoundGuild>
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
