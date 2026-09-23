import type { Metadata } from "next";
import { Banner, Card, Chip, Screen, ScreenBar, Stack } from "@/components/pk";
import { GUILD_CAN, GUILD_CANNOT } from "@/lib/guilds/boundary";

export const metadata: Metadata = { title: "Guilds" };

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
 * Guilds are a rule, not a directory. There is no membership, no treasury
 * and no swap until a real one exists.
 */
export default function GuildsPage() {
  return (
    <Screen>
      <ScreenBar>
        <h1 className="display-l">Guilds</h1>
        <Chip label="Not open" icon="guild" />
      </ScreenBar>

      <Stack gap={4}>
        <p className="body pk-muted" style={{ maxWidth: "62ch" }}>
          No guild to join, and nothing here to buy. When a guild opens, these two lists are the
          boundary it has to stay inside. Joining one would add people to the game. It would add
          nothing to a pet.
        </p>

        <div className="pk-rows">
          <Card>
            <h2 className="title" style={{ marginBottom: "var(--space-3)", color: "var(--pool-text)" }}>
              A guild token can
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
          title="A guild token never touches your pet"
          body="No stat increase, no faster care, no XP multiplier, no matchmaking priority, no queue skip. Ever."
        />
        <Banner
          tone="risk"
          title="If a guild claims otherwise, it is breaking the rule"
          body="There is no report form in this version, because there are no guilds yet."
        />
      </Stack>
    </Screen>
  );
}
