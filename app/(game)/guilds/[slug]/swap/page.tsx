import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  BackLink,
  Banner,
  Button,
  ButtonLink,
  ChipLink,
  Icon,
  LaunchStage,
  Meter,
  Paper,
  Receipt,
  Row,
  Screen,
  SectionLabel,
  Stack,
} from "@/components/pk";
import { findDemoGuild, type DemoGuild } from "@/lib/demo";

const STATES = [
  { key: "quote", label: "Quote" },
  { key: "pending", label: "Migration pending" },
  { key: "failed", label: "Failed" },
  { key: "slow", label: "Still waiting" },
];

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  return { title: `Swap · ${findDemoGuild(slug)?.name ?? "Guild"}` };
}

/**
 * Risk before quote, quote before wallet. Price impact is the only coloured
 * figure on the screen, so the warning cannot be lost in a page of colour.
 *
 * The three routing states are never derived here — a real screen passes
 * what the indexer confirmed. This preview switches them by hand.
 */
export default async function SwapPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ state?: string }>;
}) {
  const { slug } = await params;
  const { state = "quote" } = await searchParams;
  const guild = findDemoGuild(slug);
  if (!guild?.token) notFound();
  const active = STATES.some((s) => s.key === state) ? state : "quote";

  return (
    <Screen width="narrow">
      <BackLink label="Risks" href={`/guilds/${guild.slug}/risks`} />

      <Stack gap={4}>
        {active === "quote" ? <Quote guild={guild} /> : null}
        {active === "pending" ? <Pending guild={guild} /> : null}
        {active === "failed" ? <Failed guild={guild} /> : null}
        {active === "slow" ? <Slow guild={guild} /> : null}

        <div style={{ marginTop: "var(--space-5)" }}>
          <SectionLabel>Preview states</SectionLabel>
          <Row gap={2} wrap style={{ marginTop: "var(--space-3)" }}>
            {STATES.map((s) => (
              <ChipLink
                key={s.key}
                label={s.label}
                href={`/guilds/${guild.slug}/swap?state=${s.key}`}
                selected={s.key === active}
              />
            ))}
          </Row>
          <p className="caption pk-faint" style={{ marginTop: "var(--space-2)" }}>
            These four screens are fixtures, shown so each can be reviewed. Nothing is quoted,
            signed or submitted.
          </p>
        </div>
      </Stack>
    </Screen>
  );
}

function Quote({ guild }: { guild: DemoGuild }) {
  const quote = guild.token!.quote;
  return (
    <Stack gap={3}>
      <div>
        <h1 className="display-m">Swap</h1>
        <div style={{ marginTop: "var(--space-2)" }}>
          <LaunchStage stage={guild.stage} />
        </div>
      </div>

      <Paper title="You pay">
        <div className="pk-spread">
          <span className="amount-xl">{quote.payAmount}</span>
          <span className="receipt-label pk-faint">{quote.payAsset}</span>
        </div>
      </Paper>

      <div style={{ display: "grid", placeItems: "center", color: "var(--ink-faint)" }}>
        <Icon name="swap" size={20} />
      </div>

      <Paper title="You receive, roughly">
        <div className="pk-spread">
          <span className="amount-xl">{quote.receiveAmount}</span>
          <span className="receipt-label pk-faint">{quote.receiveAsset}</span>
        </div>
      </Paper>

      <Paper
        title="Details"
        meta={quote.validFor}
        torn
        foot={
          <Row gap={2}>
            <ButtonLink label="Cancel" href={`/guilds/${guild.slug}`} tone="paper" />
            <Button label="Confirm in wallet" tone="paper" disabled />
          </Row>
        }
      >
        <Receipt rows={quote.rows} total={quote.total} note={quote.note} />
      </Paper>
    </Stack>
  );
}

function Pending({ guild }: { guild: DemoGuild }) {
  return (
    <Stack gap={3}>
      <h1 className="display-m">Migration pending</h1>
      {/* Neutral, because a player mid-migration should feel informed, not
          reassured and not alarmed. */}
      <Banner
        tone="wait"
        title="Trading is paused for a few minutes"
        body="The launch met its published threshold. Pawket is waiting for the new pool to be confirmed on-chain before it will route anything to it."
      />
      <Paper title="Lifecycle">
        <div className="pk-receipt">
          <div className="pk-receipt__row" style={{ padding: "7px 0" }}>
            <LaunchStage stage="dbc" label="Bonding curve" />
            <span className="pk-receipt__v pk-receipt__ok">done</span>
          </div>
          <div className="pk-receipt__row" style={{ padding: "7px 0" }}>
            <LaunchStage stage="pending" label="Verifying new pool" />
            <span className="pk-receipt__v">now</span>
          </div>
          <div className="pk-receipt__row" style={{ padding: "7px 0" }}>
            <LaunchStage stage="damm" label="Active liquidity" />
            <span className="pk-receipt__v" style={{ color: "var(--ink-faint)" }}>
              next
            </span>
          </div>
        </div>
        <div style={{ marginTop: "var(--space-3)" }}>
          <Meter label="Confirmations" value={2} max={5} tone="neutral" readout="2 / 5" slim />
        </div>
      </Paper>
      {/* Every route-dependent control is disabled, and nothing is submitted. */}
      <Button label="Swap" tone="paper" disabled />
      <p className="caption pk-faint">
        Nothing you hold has changed. Pawket will not submit to the old route.
      </p>
      <ButtonLink label={guild.name} href={`/guilds/${guild.slug}`} tone="quiet" />
    </Stack>
  );
}

function Failed({ guild }: { guild: DemoGuild }) {
  return (
    <Stack gap={3}>
      <h1 className="display-m">It did not go through</h1>
      <Banner
        tone="risk"
        title="Price moved past your slippage limit"
        body="The swap was rejected on-chain before anything left your wallet. Your balance is unchanged."
      />
      <Paper title="What happened">
        <Receipt
          rows={[
            { k: "Submitted", v: "09:41:12" },
            { k: "Result", v: "Rejected by the pool" },
            { k: "Reason", v: "Slippage 0.5% exceeded", tone: "warn" },
            { k: "Signature", v: "5pQz…Lm14" },
            { k: "SOL moved", v: "None" },
          ]}
        />
      </Paper>
      {/* Retry is offered only where retrying is safe, with the cost of
          raising slippage spelled out. */}
      <Row gap={2} wrap>
        <ButtonLink label="Try again" href={`/guilds/${guild.slug}/swap`} tone="paper" />
        <Button label="Raise slippage" tone="paper" disabled />
      </Row>
      <p className="caption pk-faint">
        Raising slippage means accepting a worse price. Pawket will show the new limit before you
        sign.
      </p>
    </Stack>
  );
}

function Slow({ guild }: { guild: DemoGuild }) {
  return (
    <Stack gap={3}>
      <h1 className="display-m">Still waiting</h1>
      {/* A client timeout is never called a failure. */}
      <Banner
        tone="wait"
        title="Your wallet signed. We have not seen it confirm yet."
        body="This usually means the network is busy, not that it failed. Pawket will not tell you it failed just because this screen timed out."
      />
      <Paper
        title="Look it up"
        foot={
          <Row gap={2}>
            <ButtonLink
              label="Refresh"
              href={`/guilds/${guild.slug}/swap?state=slow`}
              tone="paper"
            />
            <Button label="View signature" tone="paper" after="out" disabled />
          </Row>
        }
      >
        <Receipt
          rows={[
            { k: "Signature", v: "4xQe…T7mP" },
            { k: "Sent", v: "42s ago" },
            { k: "Client view", v: "Timed out" },
            { k: "Chain state", v: "Checking", tone: "ok" },
          ]}
          note="Your balance here updates from confirmed chain state, never from what this screen guessed."
        />
      </Paper>
      <Banner
        tone="risk"
        title="Incident: pool initialisation failed"
        body="Shown only when Pawket has verified a real fault. Routing stops, an audit trail is kept, and the published recovery process starts."
      />
    </Stack>
  );
}
