import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  BackLink,
  Banner,
  Button,
  ButtonLink,
  Card,
  Chip,
  Columns,
  Crest,
  LaunchProgress,
  LaunchStage,
  OfficialMark,
  Paper,
  Receipt,
  Row,
  Screen,
  Stack,
  Tabs,
} from "@/components/pk";
import { PreviewNote } from "@/components/preview-note";
import { findDemoGuild, type DemoGuild } from "@/lib/demo";

const TABS = [
  { key: "about", label: "About" },
  { key: "events", label: "Events" },
  { key: "treasury", label: "Treasury" },
  { key: "policy", label: "Policy" },
];

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  return { title: findDemoGuild(slug)?.name ?? "Guild" };
}

/**
 * Purpose, then people, then — last — the token. The free social join is the
 * page's only coloured button; the token sits below it inside a Paper block
 * whose one control reads "Read the risks first", so the buy step is never
 * one tap from a guild's front page.
 */
export default async function GuildPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { slug } = await params;
  const { tab = "about" } = await searchParams;
  const guild = findDemoGuild(slug);
  if (!guild) notFound();
  const active = TABS.some((t) => t.key === tab) ? tab : "about";

  return (
    <Screen>
      <BackLink label="Guilds" href="/guilds" />

      <Stack gap={4}>
        <Row gap={3}>
          <Crest name={guild.name} letter={guild.letter} color={guild.color} />
          <div className="pk-fill">
            <h1 className="display-m">{guild.name}</h1>
            <Row gap={3} wrap style={{ marginTop: "var(--space-1)" }}>
              <OfficialMark official={guild.official} label={guild.markLabel} />
              <span className="caption pk-faint">{guild.members} members</span>
            </Row>
          </div>
        </Row>

        <Tabs
          label={`${guild.name} sections`}
          active={active}
          items={TABS.map((t) => ({ ...t, href: `/guilds/${guild.slug}?tab=${t.key}` }))}
        />

        {active === "about" ? <About guild={guild} /> : null}
        {active === "events" ? <Events guild={guild} /> : null}
        {active === "treasury" ? <Treasury guild={guild} /> : null}
        {active === "policy" ? <Policy guild={guild} /> : null}

        <PreviewNote what="This guild, its members, treasury and launch stage are fixtures." />
      </Stack>
    </Screen>
  );
}

function About({ guild }: { guild: DemoGuild }) {
  return (
    <Columns
      first={
        <>
          <p className="body-lg pk-muted">{guild.summary}</p>

          <div>
            <ButtonLink
              label={guild.joined ? "Leave the guild" : "Join the guild"}
              href={`/guilds/${guild.slug}?tab=about`}
              tone={guild.joined ? "quiet" : "bloom"}
              size="lg"
              full
              icon="guild"
            />
            <p className="caption pk-faint" style={{ textAlign: "center", marginTop: "var(--space-2)" }}>
              {guild.joined
                ? "You are a member. Leaving is free, and nothing you own changes."
                : "Free. No token needed to join, post, or come to events."}
            </p>
          </div>

          {guild.utility ? (
            <Card>
              <h2 className="title" style={{ marginBottom: "var(--space-2)" }}>
                Utility statement
              </h2>
              <p className="body-sm pk-muted">{guild.utility}</p>
              <div style={{ marginTop: "var(--space-3)" }}>
                <Chip
                  label={guild.reviewed ?? "Not reviewed"}
                  tone={guild.official ? "pool" : undefined}
                  icon={guild.official ? "shield" : "info"}
                />
              </div>
            </Card>
          ) : null}
        </>
      }
      second={
        <>
          {guild.token ? (
            <Paper title="Token" meta="Optional">
              <LaunchStage stage={guild.stage} />
              <div style={{ marginTop: "var(--space-3)" }}>
                <LaunchProgress
                  value={guild.token.launch.value}
                  max={guild.token.launch.max}
                  readout={guild.token.launch.readout}
                />
              </div>
              <div style={{ marginTop: "var(--space-4)" }}>
                <ButtonLink label="Read the risks first" href={`/guilds/${guild.slug}/risks`} tone="paper" />
              </div>
            </Paper>
          ) : (
            <Paper title="Token" meta="None">
              <p className="receipt">
                This guild has no token and no launch. Everything it runs is free to members.
              </p>
            </Paper>
          )}

          <Banner
            tone="info"
            title="A guild token never touches your pet"
            body="No stat increase, no faster care, no XP multiplier, no matchmaking priority, no queue skip. Ever."
          />
        </>
      }
    />
  );
}

function Events({ guild }: { guild: DemoGuild }) {
  return (
    <Stack gap={4}>
      <div className="pk-rows">
        {guild.events.map((event) => (
          <Card key={event.name}>
            <div className="pk-spread" style={{ alignItems: "flex-start" }}>
              <div className="pk-fill">
                <h2 className="title">{event.name}</h2>
                <p className="body-sm pk-muted">{event.when}</p>
                <p className="caption pk-faint" style={{ marginTop: "var(--space-1)" }}>
                  {event.note}
                </p>
              </div>
              <Chip label={event.open ? "Open" : "Ended"} tone={event.open ? "pool" : undefined} />
            </div>
          </Card>
        ))}
      </div>
      <Banner
        tone="guild"
        title="Events are the point of a guild"
        body="Joining is free, and so is leaving. Your pet, your progress and every game work the same either way."
      />
    </Stack>
  );
}

function Treasury({ guild }: { guild: DemoGuild }) {
  if (!guild.token) {
    return (
      <Paper title="Treasury" meta="None">
        <p className="receipt">
          This guild has no token, no treasury and no launch. There is nothing to publish here.
        </p>
      </Paper>
    );
  }
  return (
    <Stack gap={4}>
      <div className="pk-rows">
        <Paper title="Allocation" meta="Published before launch">
          <Receipt rows={guild.token.allocation} />
        </Paper>
        <Paper title="Treasury" meta={guild.token.treasury.indexed}>
          <Receipt rows={guild.token.treasury.rows} note={guild.token.treasury.note} />
        </Paper>
      </div>
      <Banner
        tone="wait"
        title="What Pawket can and cannot do here"
        body="Pawket can delist this guild, remove its badge and stop its benefits under policy. Pawket cannot reverse a transaction, freeze a token, or take anyone’s assets."
      />
    </Stack>
  );
}

function Policy({ guild }: { guild: DemoGuild }) {
  return (
    <Columns
      first={
        <Paper title="Policy" meta="Published">
          <ol className="pk-numbered receipt">
            {guild.policy.map((line, index) => (
              <li key={line}>
                <span className="amount-sm pk-faint">{index + 1}</span>
                <span>{line}</span>
              </li>
            ))}
          </ol>
        </Paper>
      }
      second={
        <>
          {guild.official ? null : (
            <Banner
              tone="risk"
              title="This guild is not approved by Pawket"
              body="Anything it published is its own claim. Nothing you own has changed, and joining is still free."
            />
          )}
          <div>
            <ButtonLink label="What a guild can and cannot do" href="/guilds/boundary" tone="quiet" after="right" />
          </div>
          <div>
            <Button label="Report this guild" tone="quiet" disabled />
          </div>
        </>
      }
    />
  );
}
