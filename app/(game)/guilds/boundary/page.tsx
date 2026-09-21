import type { Metadata } from "next";
import { BackLink, Banner, Card, Screen, Stack } from "@/components/pk";
import { GUILD_CAN, GUILD_CANNOT } from "@/lib/demo";

export const metadata: Metadata = { title: "What a guild can and cannot do" };

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
 * The boundary is two lists, not a paragraph. Checks in pool and crosses in
 * alarm — the opposing pair, chosen off the red–green axis — and each line
 * short enough to remember.
 */
export default function GuildBoundaryPage() {
  return (
    <Screen>
      <BackLink label="Guilds" href="/guilds" />

      <Stack gap={4}>
        <div>
          <h1 className="display-m">What a guild can and cannot do</h1>
          <p className="body pk-muted" style={{ marginTop: "var(--space-2)" }}>
            Every approved guild publishes a utility statement. These two lists are the boundary it
            has to stay inside.
          </p>
        </div>

        <Card>
          <div className="title" style={{ marginBottom: "var(--space-3)", color: "var(--pool-text)" }}>
            A guild token can
          </div>
          <Bounds items={GUILD_CAN} mark="✓" color="var(--pool-text)" />
        </Card>

        <Card>
          <div className="title" style={{ marginBottom: "var(--space-3)", color: "var(--alarm-text)" }}>
            It can never
          </div>
          <Bounds items={GUILD_CANNOT} mark="✕" color="var(--alarm-text)" />
        </Card>

        <Banner
          tone="risk"
          title="If a guild claims otherwise, it is breaking policy"
          body="Report it and Pawket can remove its badge, benefits and listing. Pawket cannot reverse anything already on-chain."
        />
      </Stack>
    </Screen>
  );
}
