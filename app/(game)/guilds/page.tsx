import type { Metadata } from "next";
import {
  ButtonLink,
  ChipLink,
  EmptyState,
  Field,
  GuildRow,
  Row,
  Screen,
  ScreenBar,
  Stack,
} from "@/components/pk";
import { PreviewNote } from "@/components/preview-note";
import { GUILD_FILTERS, findGuilds } from "@/lib/demo";

export const metadata: Metadata = { title: "Guilds" };

function guildsHref(params: { filter?: string; q?: string }) {
  const search = new URLSearchParams();
  if (params.filter && params.filter !== "all") search.set("filter", params.filter);
  if (params.q) search.set("q", params.q);
  const query = search.toString();
  return query ? `/guilds?${query}` : "/guilds";
}

/**
 * Optional is stated in the sentence, not a footnote, every single time. A
 * guild with no token sits in the same list, at the same size, with the same
 * join button: the social guild is the normal case, not the diminished one.
 */
export default async function GuildsPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string; q?: string }>;
}) {
  const { filter = "all", q = "" } = await searchParams;
  const query = q.trim();
  const guilds = findGuilds({ filter, q: query });

  return (
    <Screen>
      <ScreenBar>
        <div>
          <h1 className="display-l">Guilds</h1>
          <p className="body pk-muted" style={{ marginTop: "var(--space-1)", maxWidth: "52ch" }}>
            Communities around pets, creators and events. Joining one is optional — and so is
            staying.
          </p>
        </div>
      </ScreenBar>

      <Stack gap={4}>
        <div className="pk-toolbar">
          <form action="/guilds" role="search">
            {filter !== "all" ? <input type="hidden" name="filter" value={filter} /> : null}
            <Field label="Search guilds" name="q" type="search" defaultValue={query} placeholder="Search guilds" />
          </form>
          <Row gap={2} wrap>
            {GUILD_FILTERS.map((f) => (
              <ChipLink
                key={f.key}
                label={f.label}
                href={guildsHref({ filter: f.key, q: query })}
                tone={f.key === "no-token" ? "bloom" : undefined}
                selected={f.key === filter}
              />
            ))}
          </Row>
        </div>

        {guilds.length ? (
          <div className="pk-rows">
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
          </div>
        ) : (
          <EmptyState
            icon="guild"
            title="No guild matches"
            body={
              query
                ? `No guild goes by “${query}”. Try what it is about — races, naps, lanterns.`
                : "No guild fits this filter right now."
            }
            action={<ButtonLink label="Show every guild" href="/guilds" tone="quiet" />}
          />
        )}

        <div>
          <ButtonLink label="What a guild actually does" href="/guilds/boundary" tone="quiet" after="right" />
        </div>

        <PreviewNote what="These guilds, member counts and launch stages are fixtures." />
      </Stack>
    </Screen>
  );
}
