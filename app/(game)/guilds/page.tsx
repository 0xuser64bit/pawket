import type { Metadata } from "next";
import {
  ButtonLink,
  ChipLink,
  Field,
  GuildRow,
  Row,
  Screen,
  ScreenBar,
  Stack,
} from "@/components/pk";
import { PreviewNote } from "@/components/preview-note";
import { DEMO_GUILDS } from "@/lib/demo";

export const metadata: Metadata = { title: "Guilds" };

const FILTERS = [
  { key: "all", label: "All" },
  { key: "no-token", label: "No token" },
  { key: "events", label: "Events" },
];

/**
 * Optional is stated in the sentence, not a footnote, every single time. A
 * guild with no token sits in the same list, at the same size, with the same
 * join button: the social guild is the normal case, not the diminished one.
 */
export default async function GuildsPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const { filter = "all" } = await searchParams;
  const guilds =
    filter === "no-token" ? DEMO_GUILDS.filter((guild) => guild.stage === "none") : DEMO_GUILDS;

  return (
    <Screen>
      <ScreenBar>
        <h1 className="display-l">Guilds</h1>
      </ScreenBar>

      <Stack gap={3}>
        <p className="body pk-muted">
          Communities around pets, creators and events. Joining one is optional — and so is staying.
        </p>
        <Field label="Search guilds" placeholder="Search guilds" />
        <Row gap={2} wrap>
          {FILTERS.map((f) => (
            <ChipLink
              key={f.key}
              label={f.label}
              href={`/guilds?filter=${f.key}`}
              tone={f.key === "no-token" ? "bloom" : undefined}
              selected={f.key === filter}
            />
          ))}
        </Row>

        <Stack gap={3} style={{ marginTop: "var(--space-1)" }}>
          {guilds.map((guild) => (
            <GuildRow
              key={guild.slug}
              name={guild.name}
              href={`/guilds/${guild.slug}`}
              letter={guild.letter}
              color={guild.color}
              members={guild.members}
              stage={guild.stageLabel}
              blurb={guild.blurb}
              official={guild.official}
              markLabel={guild.markLabel}
              action={
                <ButtonLink
                  label={guild.joined ? "Joined" : "Open"}
                  href={`/guilds/${guild.slug}`}
                  tone={guild.joined ? "quiet" : "bloom"}
                  size="sm"
                />
              }
            />
          ))}
        </Stack>

        <ButtonLink
          label="What a guild actually does"
          href="/guilds/boundary"
          tone="quiet"
          full
          after="right"
        />

        <PreviewNote what="These guilds, member counts and launch stages are fixtures." />
      </Stack>
    </Screen>
  );
}
