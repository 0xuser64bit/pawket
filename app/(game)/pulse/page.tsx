import type { Metadata } from "next";
import { Banner, Paper, Receipt, Screen, ScreenBar, Chip } from "@/components/pk";
import { AddressLine } from "@/components/wallet/address";
import { getPublicEnv } from "@/config/env";
import { explorerAddressUrl } from "@/lib/solana/cluster";
import { MARKET, PAWKET_PROGRAM_ID } from "@/lib/solana/program";
import { formatUnits } from "@/lib/utils/format";
import { readPulse, type Pulse } from "@/server/pulse";

export const metadata: Metadata = {
  title: "Pulse",
  description: "What has happened on Pawket, counted from its program's accounts on Solana and read live.",
};
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const n = (value: number) => value.toLocaleString("en-US");
const sol = (lamports: bigint) => `${formatUnits(lamports, 9, 3)} SOL`;

/**
 * Pawket's pulse: every figure counted from the program's accounts, read
 * live, with nothing estimated and nothing added by hand — the same
 * accounts anyone can read on Explorer. Facts, so all of it is Paper.
 */
export default async function PulsePage() {
  let pulse: Pulse | null = null;
  try {
    pulse = await readPulse();
  } catch {
    pulse = null;
  }
  const cluster = getPublicEnv().solanaCluster;

  return (
    <Screen>
      <ScreenBar>
        <div>
          <h1 className="display-l">Pulse</h1>
          <p className="caption pk-faint">Counted from Pawket&apos;s program on Solana, read live.</p>
        </div>
        <Chip label={`Solana ${cluster}`} tone="paper" />
      </ScreenBar>

      {!pulse ? (
        <Banner tone="wait" title="Solana did not answer" body="Nothing here is stored anywhere but on chain, and the chain did not answer just now. Reload to ask again." />
      ) : (
        <div className="pk-guild-facts">
          {cluster === "devnet" ? (
            <Banner
              tone="info"
              title="Devnet, and honest about it"
              body="These counts include the runs of Pawket's own tests and the starter guilds it seeded. Nothing is estimated or added by hand."
            />
          ) : null}
          <Paper title="Pets" meta="Pet + Passport accounts">
            <Receipt
              rows={[
                { k: "Kept on Solana", v: n(pulse.pets.kept) },
                { k: "Wallets keeping them", v: n(pulse.pets.owners) },
                { k: "Out today (UTC)", v: n(pulse.pets.outToday) },
                { k: "Cares recorded", v: n(pulse.pets.cares) },
                { k: "Rounds played", v: n(pulse.pets.rounds) },
                { k: "Longest run", v: `${n(pulse.pets.bestRun)} days` },
                { k: "Waves in guestbooks", v: n(pulse.guestbook.waves) },
              ]}
            />
          </Paper>
          <Paper title="Guilds" meta="Guild, event and poll accounts">
            <Receipt
              rows={[
                { k: "Guilds", v: n(pulse.guilds.listed) },
                { k: "Pets in them", v: n(pulse.guilds.pets) },
                { k: "Events planned", v: n(pulse.guilds.events) },
                { k: "Said they would go", v: n(pulse.guilds.going) },
                { k: "Checked in", v: n(pulse.guilds.came) },
                { k: "Polls asked", v: n(pulse.guilds.polls) },
                { k: "Votes, one per wallet", v: n(pulse.guilds.votes) },
              ]}
            />
          </Paper>
          <Paper title="Guild coins" meta="Meteora DBC → DAMM v2">
            {pulse.coins ? (
              <Receipt
                rows={[
                  { k: "Launched", v: n(pulse.coins.launched) },
                  { k: "On their curve", v: n(pulse.coins.onCurve) },
                  { k: "Graduating", v: n(pulse.coins.graduating) },
                  { k: "Graduated into DAMM v2", v: n(pulse.coins.graduated) },
                ]}
                note="Optional, launched by a guild's founder from Pawket's presets. A coin never touches a pet."
              />
            ) : (
              <Receipt rows={[{ k: "Coins", v: "Not read just now" }]} />
            )}
          </Paper>
          <Paper title="Market and fees" meta="Closet accounts, the treasury">
            <Receipt
              rows={[
                { k: "Closets", v: n(pulse.market.closets) },
                { k: "Looks sold", v: n(pulse.market.sold) },
                { k: "Paid into the treasury", v: sol(pulse.market.paid) },
                { k: "Treasury holds now", v: sol(pulse.market.treasury) },
                { k: "Pawket Wallets opened", v: n(pulse.wallets.opened) },
                { k: "Cares signed by a linked device", v: n(pulse.wallets.deviceActions) },
              ]}
              note="The treasury also receives Pawket's share of guild-coin fees, claimed from Meteora. It pays the network fees Pawket covers for everyone's pets."
            />
            <div className="pk-receipt" style={{ marginTop: "var(--space-3)" }}>
              <div className="pk-receipt__row">
                <span className="pk-receipt__k">Treasury</span>
                <AddressLine value={MARKET.treasury} label="treasury" href={explorerAddressUrl(MARKET.treasury, cluster)} />
              </div>
              <div className="pk-receipt__row">
                <span className="pk-receipt__k">Program</span>
                <AddressLine value={PAWKET_PROGRAM_ID} label="program" href={explorerAddressUrl(PAWKET_PROGRAM_ID, cluster)} />
              </div>
            </div>
          </Paper>
        </div>
      )}
    </Screen>
  );
}
