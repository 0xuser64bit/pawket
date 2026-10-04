import type { Metadata } from "next";
import { BackLink, Banner, Card, Chip, Columns, LaunchStage, OfficialMark, Paper, Receipt, Row, Screen, Stack } from "@/components/pk";
import { CoinDesk } from "@/components/coins/coin-desk";
import { GuildCrest } from "@/components/guilds/guild-crest";
import { AddressLine } from "@/components/wallet/address";
import { getPublicEnv, type SolanaCluster } from "@/config/env";
import { COIN_DOES, COIN_NEVER, COIN_RISKS, DEVNET_COIN_NOTE } from "@/lib/coins/copy";
import { COIN_PRESETS, COIN_TERMS, coinName, feeSplitBps, findPreset, type CoinCluster, type PresetId } from "@/lib/coins/presets";
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
 * A guild's coin: optional, like the guild. What it is now and its terms,
 * read live from Solana and set on Paper; then what a player can do with
 * it; then what it does and never does, and where it all is on chain. The
 * only place in Pawket a coin is traded — never Home, a pet or the park.
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
      <Stack gap={5}>
        <div className="pk-guild-head">
          <GuildCrest crest={guild.crest} colour={guild.colour} name={guild.name} size="lg" />
          <div>
            <h1 className="display-l" style={{ overflowWrap: "anywhere" }}>
              {launched ? coin.name : `${guild.name}'s coin`}
            </h1>
            <Row gap={2} wrap style={{ marginTop: "var(--space-3)", alignItems: "center" }}>
              {launched ? <Chip label={coin.symbol} tone="paper" /> : null}
              <LaunchStage stage={coin.stage} />
              {launched ? <OfficialMark official label={`${guild.name}'s own coin`} /> : null}
              <Chip label="Optional" tone="bloom" icon="guild" />
            </Row>
          </div>
        </div>

        {cluster === "devnet" ? <Banner tone="info" title="A rehearsal on devnet" body={DEVNET_COIN_NOTE} /> : null}
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
              <Stack gap={4}>
                <Paper title="The coin now" meta={`Solana ${cluster}`}>
                  <Receipt
                    rows={[
                      { k: "A million coins cost", v: `${(coin.price * 1_000_000).toPrecision(3)} SOL` },
                      ...(coin.stage === "damm"
                        ? [{ k: "Where it trades", v: "Its DAMM v2 pool", tone: "ok" as const }]
                        : [{ k: "Raised on the curve", v: `${sol(coin.raised, 3)} of ${sol(coin.threshold, 3)}` }]),
                      { k: "Wallets holding it", v: coin.holders ? String(coin.holders.count) : "Not counted just now" },
                      ...(coin.holders && coin.holders.count > 0
                        ? [{ k: "Held by the largest ten", v: `${coin.holders.topTenPercent.toFixed(1)}%`, ...(coin.holders.topTenPercent > 80 ? { tone: "warn" as const } : {}) }]
                        : []),
                      { k: "Trading fees on the curve", v: sol(coin.fees.total, 6) },
                      { k: "Pawket's share, unclaimed", v: sol(coin.fees.pawketUnclaimed, 6) },
                    ]}
                    note="Read from Solana when this page loaded. Not a price promise, a forecast, or advice."
                  />
                </Paper>
                <Paper title="On the record" meta="Explorer">
                  <div className="pk-receipt">
                    <Fact k="Coin" value={coin.mint} cluster={cluster} />
                    {coin.pool ? <Fact k="Curve" value={coin.pool} cluster={cluster} /> : null}
                    {coin.graduated ? <Fact k="Pool" value={coin.graduated.pool} cluster={cluster} /> : null}
                    {coin.creator ? <Fact k="Launched by" value={coin.creator} cluster={cluster} /> : null}
                  </div>
                </Paper>
              </Stack>
            }
            second={desk}
          />
        ) : (
          desk
        )}

        <div className="pk-guild-facts">
          <Paper title="The terms" meta={preset ? preset.name : "Pawket's presets"}>
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
          </Paper>

          <Card>
            <h2 className="title">What it does, and never does</h2>
            <ul className="pk-risks body-sm" style={{ marginTop: "var(--space-3)" }}>
              {COIN_DOES.map((line) => (
                <li key={line}>{line}</li>
              ))}
              {COIN_NEVER.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </Card>

          <Paper title="What can go wrong" meta="Read before trading">
            <ol className="pk-risks body-sm">
              {COIN_RISKS.map((risk) => (
                <li key={risk}>{risk}</li>
              ))}
            </ol>
          </Paper>
        </div>
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
