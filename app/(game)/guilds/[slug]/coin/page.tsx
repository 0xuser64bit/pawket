import type { Metadata } from "next";
import { BackLink, Banner, Chip, Columns, LaunchProgress, LaunchStage, OfficialMark, Paper, Receipt, Row, Screen, Stack } from "@/components/pk";
import { CoinDesk } from "@/components/coins/coin-desk";
import { GuildCrest } from "@/components/guilds/guild-crest";
import { AddressLine } from "@/components/wallet/address";
import { getPublicEnv, type SolanaCluster } from "@/config/env";
import { COIN_DOES, COIN_NEVER, COIN_RISKS, DEVNET_COIN_NOTE } from "@/lib/coins/copy";
import { COIN_PRESETS, COIN_TERMS, coinName, feeSplitBps, findPreset, type CoinCluster, type PresetId } from "@/lib/coins/presets";
import { graduationSegments } from "@/lib/coins/stage";
import { isValidSlug } from "@/lib/guilds/guild";
import type { ChainGuild } from "@/lib/solana/accounts";
import { explorerAddressUrl } from "@/lib/solana/cluster";
import { formatUnits } from "@/lib/utils/format";
import { presetParameters } from "@/server/coins/curve";
import { readCoin, type CoinState } from "@/server/coins/meteora";
import { readGuild } from "@/server/solana";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const guild = isValidSlug(slug) ? await readGuild(slug).catch(() => null) : null;
  if (!guild) return { title: "Guild coin" };
  return {
    title: coinName(guild.name),
    description: `${guild.name}'s optional coin on Meteora, launched on Pawket. It never touches a pet.`,
  };
}

const sol = (lamports: string | bigint, places = 4) => `${formatUnits(lamports, 9, places)} SOL`;

/**
 * A guild's coin: optional, like the guild. The head says whose it is and
 * where it is in its life; then the page is two things side by side — the
 * coin now (what a million cost, how far toward graduation, who holds it),
 * read live from Solana on Paper, and what a player can do with it. What
 * can go wrong, the terms, what it does and never does, and where it all is
 * on chain fold away below. The only place in Pawket a coin is traded —
 * never Home, a pet or the park.
 */
export default async function CoinPage({ params }: Props) {
  const { slug } = await params;
  let guild: ChainGuild | null = null;
  let coin: CoinState | null = null;
  try {
    guild = isValidSlug(slug) ? await readGuild(slug) : null;
    if (guild) coin = await readCoin(guild);
  } catch {
    return (
      <Screen width="narrow">
        <BackLink label="Guilds" href="/guilds" />
        <Banner tone="wait" title="Solana did not answer" body="The coin is unchanged; this page could not read it just now. Reload to ask again." />
      </Screen>
    );
  }
  if (!guild) {
    return (
      <Screen width="narrow">
        <BackLink label="Guilds" href="/guilds" />
        <Banner tone="info" title="No guild has that name" body="Nothing on Solana answers to it in Pawket's program." />
      </Screen>
    );
  }
  if (!coin) {
    return (
      <Screen width="narrow">
        <BackLink label={guild.name} href={`/guilds/${guild.slug}`} />
        <Banner tone="info" title="Guild coins are off here" body="This deployment does not offer guild coins. The guild itself is unchanged." />
      </Screen>
    );
  }

  const cluster = getPublicEnv().solanaCluster;
  const preset = findPreset(coin.preset);
  const split = feeSplitBps();
  const thresholds = Object.fromEntries(
    COIN_PRESETS.map((option) => [
      option.id,
      cluster === "devnet" || cluster === "mainnet-beta" ? presetParameters(option, cluster as CoinCluster).migrationQuoteThreshold.toString() : "0",
    ]),
  ) as Record<PresetId, string>;
  const launched = coin.stage !== "none";
  const desk = (
    <CoinDesk
      guild={{ slug: guild.slug, name: guild.name, founder: guild.founder, memberCount: guild.memberCount }}
      coin={coin}
      thresholds={thresholds}
      cluster={cluster}
    />
  );

  return (
    <Screen>
      <BackLink label={guild.name} href={`/guilds/${guild.slug}`} />
      <Stack gap={6}>
        <header className="pk-guild-hero">
          <GuildCrest crest={guild.crest} colour={guild.colour} name={guild.name} size="lg" />
          <div className="pk-guild-hero__words">
            <h1 className="display-l" style={{ overflowWrap: "anywhere" }}>
              {launched ? coin.name : `${guild.name}'s coin`}
            </h1>
            <Row gap={2} wrap style={{ marginTop: "var(--space-3)", alignItems: "center" }}>
              {launched ? <Chip label={coin.symbol} tone="paper" /> : null}
              <LaunchStage stage={coin.stage} />
              {launched ? <OfficialMark official label={`${guild.name}'s own coin`} /> : null}
              <Chip label="Optional" tone="bloom" icon="guild" />
            </Row>
            {cluster === "devnet" ? <p className="caption pk-faint" style={{ marginTop: "var(--space-3)" }}>{DEVNET_COIN_NOTE}</p> : null}
          </div>
        </header>

        {coin.stage === "suspended" ? (
          <Banner
            tone="risk"
            title="Pawket stopped offering trades in this coin"
            body="Pawket no longer promotes this guild under its guild rule. The coin and everything held in it are untouched on Solana; Pawket cannot take a coin or reverse a trade."
          />
        ) : null}

        {launched ? (
          <Columns
            split="portrait"
            first={
              <Paper title="The coin now" meta={`Read from Solana ${cluster}`}>
                <div className="pk-coin-now">
                  <span className="receipt-label">A million {coin.symbol} cost</span>
                  <span className="pk-coin-now__v">{(coin.price * 1_000_000).toPrecision(3)} SOL</span>
                </div>
                {coin.stage === "dbc" || coin.stage === "pending" ? (
                  <LaunchProgress
                    value={graduationSegments(BigInt(coin.raised), BigInt(coin.threshold))}
                    readout={`${sol(coin.raised, 2)} of ${sol(coin.threshold, 2)}`}
                  />
                ) : null}
                <Receipt
                  rows={[
                    ...(coin.stage === "damm" ? [{ k: "Where it trades", v: "Its DAMM v2 pool, liquidity locked", tone: "ok" as const }] : []),
                    { k: "Wallets holding it", v: coin.holders ? String(coin.holders.count) : "Not counted just now" },
                    ...(coin.holders && coin.holders.count > 0
                      ? [{ k: "Held by the largest ten", v: `${coin.holders.topTenPercent.toFixed(1)}%`, ...(coin.holders.topTenPercent > 80 ? { tone: "warn" as const } : {}) }]
                      : []),
                    { k: "Trading fees so far", v: sol(coin.fees.total, 6) },
                  ]}
                  note="Read when this page loaded. Not a price promise, a forecast, or advice."
                />
              </Paper>
            }
            second={desk}
          />
        ) : (
          desk
        )}

        <Stack gap={3}>
          <details className="pk-fold">
            <summary>
              <span className="title">What can go wrong</span>
              <span className="caption pk-faint">Read before trading</span>
            </summary>
            <ol className="pk-risks body-sm">
              {COIN_RISKS.map((risk) => (
                <li key={risk}>{risk}</li>
              ))}
            </ol>
          </details>
          <details className="pk-fold">
            <summary>
              <span className="title">The terms</span>
              <span className="caption pk-faint">{preset ? `${preset.name}, fixed on chain` : "Pawket's presets, fixed on chain"}</span>
            </summary>
            <Receipt
              rows={[
                { k: "Supply", v: `${formatUnits(BigInt(COIN_TERMS.supply), 0)}, fixed` },
                { k: "Allocations", v: "None" },
                ...(preset
                  ? [
                      { k: "Price rises along the curve", v: `${preset.rise}×` },
                      { k: "Graduates at", v: `${sol(thresholds[preset.id], 2)} raised` },
                    ]
                  : COIN_PRESETS.map((option) => ({ k: `${option.name} graduates at`, v: `${sol(thresholds[option.id], 2)} raised` }))),
                { k: "Trading fee", v: `${split.total / 100}% of each trade` },
                { k: "· to the founder", v: `${split.founder / 100}%` },
                { k: "· to Pawket", v: `${split.pawket / 100}%` },
                { k: "· to Meteora", v: `${split.meteora / 100}%` },
                { k: "After graduation", v: `DAMM v2, ${COIN_TERMS.graduatedFeeBps / 100}% fee` },
                { k: "Its liquidity", v: "Locked for good", tone: "ok" },
              ]}
              note="Nobody can mint more, and nobody holds a coin the curve did not sell them. The liquidity is locked half in the founder's position and half in Pawket's; both can only claim its fees. The same for every coin on a preset, fixed on chain before the coin existed."
            />
          </details>
          <details className="pk-fold">
            <summary>
              <span className="title">What it does, and never does</span>
              <span className="caption pk-faint">A coin never touches a pet</span>
            </summary>
            <ul className="pk-risks body-sm">
              {COIN_DOES.map((line) => (
                <li key={line}>{line}</li>
              ))}
              {COIN_NEVER.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </details>
          {launched ? (
            <details className="pk-fold">
              <summary>
                <span className="title">On the record</span>
                <span className="caption pk-faint">Solana {cluster}</span>
              </summary>
              <div className="pk-receipt">
                <Fact k="Coin" value={coin.mint} cluster={cluster} />
                {coin.pool ? <Fact k="Curve" value={coin.pool} cluster={cluster} /> : null}
                {coin.graduated ? <Fact k="Pool" value={coin.graduated.pool} cluster={cluster} /> : null}
                {coin.creator ? <Fact k="Launched by" value={coin.creator} cluster={cluster} /> : null}
              </div>
            </details>
          ) : null}
        </Stack>
      </Stack>
    </Screen>
  );
}

function Fact({ k, value, cluster }: { k: string; value: string; cluster: SolanaCluster }) {
  return (
    <div className="pk-receipt__row">
      <span className="pk-receipt__k">{k}</span>
      <AddressLine value={value} label={k.toLowerCase()} href={explorerAddressUrl(value, cluster)} />
    </div>
  );
}
