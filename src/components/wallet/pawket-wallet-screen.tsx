"use client";

import { useCallback, useState } from "react";
import type { Address } from "@solana/kit";
import { useConnectedWallet } from "@solana/kit-plugin-wallet/react";
import { useRequest } from "@solana/react";
import {
  Banner,
  Button,
  ButtonLink,
  Card,
  Chip,
  Choice,
  Field,
  Paper,
  Receipt,
  Row,
  Screen,
  ScreenBar,
  SectionLabel,
  Stack,
  Waiting,
} from "@/components/pk";
import { AddressLine } from "@/components/wallet/address";
import { WalletSheet } from "@/components/wallet/wallet-sheet";
import { getPublicEnv } from "@/config/env";
import { findWearable } from "@/lib/closet/catalog";
import { useCompanion } from "@/lib/companion/use-companion";
import { CARE_DONE_LABEL } from "@/lib/game/appearance";
import { rpc, wallet as walletClient, useWalletReady } from "@/lib/solana/browser-client";
import { explorerAddressUrl, explorerTxUrl } from "@/lib/solana/cluster";
import { WALLET_LIMITS } from "@/lib/solana/program";
import {
  getCloseWalletInstruction,
  getDepositInstruction,
  getReturnFloatInstruction,
  getUnlinkDeviceInstruction,
  getWithdrawInstruction,
} from "@/lib/solana/instructions";
import { usePawketSend, useSponsor } from "@/lib/solana/use-send";
import { dayTurnsAt, formatAgo, formatLocalDate, formatSol, parseSolToLamports, truncateAddress } from "@/lib/utils/format";
import { forgetDevice } from "@/lib/wallet/device";
import { useLinkBrowser } from "@/lib/wallet/link";
import { fetchWalletHistory, type WalletEntry } from "@/lib/wallet/history";
import { refreshPawketWallet, rentOfWallet, usePawketWallet, type PawketWalletState } from "@/lib/wallet/pawket-wallet";
import { useHere } from "@/lib/native/android";
import { DevnetFaucet } from "@/components/wallet/faucet";

const DAYS = [
  { value: 1, label: "A day" },
  { value: 7, label: "A week" },
  { value: 30, label: "30 days" },
] as const;
const DAILY = [
  { value: 50, label: "50 a day" },
  { value: 100, label: "100 a day" },
  { value: 250, label: "250 a day" },
] as const;
const PUT = [
  { value: 10_000_000, label: "0.01 SOL" },
  { value: 100_000_000, label: "0.1 SOL" },
  { value: 250_000_000, label: "0.25 SOL" },
] as const;
const NOTHING_YET = { value: 0, label: "Nothing yet" } as const;
const sol = (lamports: bigint) => `${formatSol(lamports)} SOL`;


export function PawketWalletScreen() {
  const ready = useWalletReady();
  const connected = useConnectedWallet(walletClient);
  const owner = (connected?.account.address as Address | undefined) ?? null;
  const { here, Here } = useHere();
  const state = usePawketWallet(owner);
  const [connecting, setConnecting] = useState(false);

  return (
    <Screen>
      <ScreenBar>
        <div>
          <h1 className="display-l">Pawket Wallet</h1>
          <p className="caption pk-faint">Everything Pawket does on Solana, from one balance and one history. Yours, on Solana {getPublicEnv().solanaCluster}.</p>
        </div>
        {state?.linked ? <Chip label={`${Here} is linked`} tone="sprout" icon="check" /> : null}
      </ScreenBar>

      {!ready ? (
        <Waiting label="Opening your Pawket Wallet" />
      ) : !owner ? (
        <Stack gap={4}>
          <Card>
            <h2 className="title">Set up your Pawket Wallet</h2>
            <p className="body-sm pk-muted" style={{ marginTop: "var(--space-2)" }}>
              Connect the wallet that keeps your pets. It owns the Pawket Wallet and approves once; then {here}{" "}
              signs for your pets with no pop-up. Connecting signs nothing.
            </p>
            <div className="pk-foot">
              <Button label="Connect a wallet" icon="wallet" tone="quiet" onClick={() => setConnecting(true)} />
            </div>
          </Card>
          <Rules />
        </Stack>
      ) : !state || state.status === "loading" ? (
        <Waiting label="Reading your Pawket Wallet" />
      ) : state.status === "error" && !state.wallet ? (
        <Banner
          tone="wait"
          title="Solana did not answer"
          body="Your Pawket Wallet, if you have one, is unchanged; this screen could not read it just now."
          action={<Button label="Try again" tone="quiet" size="sm" onClick={() => void refreshPawketWallet(owner)} />}
        />
      ) : state.wallet ? (
        <Opened state={state} owner={owner} />
      ) : (
        <Stack gap={4}>
          <SetUp />
          <Rules />
        </Stack>
      )}

      {connecting ? (
        <WalletSheet
          why="Connect the wallet that keeps your pets. It will own the Pawket Wallet; connecting signs nothing."
          onDismiss={() => setConnecting(false)}
        />
      ) : null}
    </Screen>
  );
}

function Rules() {
  const { here } = useHere();
  const can = [
    "Care for, play with and dress your pets on Solana, and keep a new one there",
    "Found, join and leave guilds, go to their events, check in and vote",
    "Wave at other pets",
    "Act until the date you choose — 30 days at most — up to the times a day you choose",
  ];
  const cannot = [
    "Spend your SOL: a Market look or a guild coin always asks your wallet",
    "Move your balance anywhere: only your wallet withdraws, and only to itself",
    "Act for a pet that is not yours, once its link runs out, or past today's limit",
    `Be read: its key is made in ${here} and cannot be exported — by Pawket either`,
  ];
  return (
    <details className="pk-fold">
      <summary>
        <span className="title">What a linked browser can and cannot do</span>
        <span className="caption pk-faint">The program holds it to every line</span>
      </summary>
      <div className="pk-rows">
        <Card>
          <h2 className="title" style={{ marginBottom: "var(--space-3)", color: "var(--pool-text)" }}>
            A device can
          </h2>
          <ul className="pk-bounds body-sm">
            {can.map((line) => (
              <li key={line}>
                <span className="pk-bounds__mark" style={{ color: "var(--pool-text)" }} aria-hidden="true">
                  ✓
                </span>
                {line}
              </li>
            ))}
          </ul>
        </Card>
        <Card>
          <h2 className="title" style={{ marginBottom: "var(--space-3)", color: "var(--alarm-text)" }}>
            It can never
          </h2>
          <ul className="pk-bounds body-sm">
            {cannot.map((line) => (
              <li key={line}>
                <span className="pk-bounds__mark" style={{ color: "var(--alarm-text)" }} aria-hidden="true">
                  ✕
                </span>
                {line}
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </details>
  );
}

function SetUp() {
  const { link, problem, busy } = useLinkBrowser();
  const sponsor = useSponsor();
  const { here } = useHere();
  const rent = useRequest(rentOfWallet);
  const cluster = getPublicEnv().solanaCluster;
  const sponsored = Boolean(sponsor.data?.available);
  const [picked, setPut] = useState<number | null>(null);
  const put = picked ?? (sponsored ? NOTHING_YET.value : PUT[0].value);
  const [days, setDays] = useState<number>(30);
  const [daily, setDaily] = useState<number>(100);
  const deposit = BigInt(put);

  return (
    <Card>
      <h2 className="title">Set up your Pawket Wallet</h2>
      <p className="body-sm pk-muted" style={{ marginTop: "var(--space-2)" }}>
        Pawket acts on Solana only through it. Your wallet approves once — opening it, linking {here}, and putting
        SOL in if you like. After that {here} signs what your pets do — care, rounds, outfits, guilds, gatherings
        and waves — with no pop-up, and Market looks and guild coins spend this balance once your wallet approves.
        Every one of them is in the history here.
      </p>
      <Stack gap={4} style={{ marginTop: "var(--space-4)" }}>
        <Choice label={`Link ${here} for`} options={DAYS} value={days} onPick={setDays} />
        <Choice label="At most" options={DAILY} value={daily} onPick={setDaily} />
        <Choice label="Put in" options={sponsored ? [NOTHING_YET, ...PUT] : PUT} value={put} onPick={setPut} />
        <p className="caption pk-faint" style={{ marginTop: "calc(-1 * var(--space-2))" }}>
          {sponsored
            ? "Pawket pays the network fees for your pets, so the wallet can start empty. A balance pays for Market looks and guild coins, with your approval, and for fees if Pawket stops paying; take out what is left whenever you like."
            : `Pawket is not paying fees right now, so ${here} pays its own from what you put in — one fee an action, and the rest back whenever you like.`}
          <DevnetFaucet />
        </p>
        <Paper title="What this approval does" meta={`Solana ${cluster}`}>
          <Receipt
            rows={[
              { k: "From your wallet", v: deposit > 0n ? sol(deposit) : "Nothing" },
              {
                k: "Rent for the wallet",
                v: sponsored ? "Paid by Pawket, back to it when you close" : rent.data ? `${sol(rent.data)}, back when you close it` : "Back when you close it",
              },
              { k: "Each action's fee", v: sponsored ? "Paid by Pawket" : "From your balance" },
            ]}
            note="The browser's key is made here and cannot be read or exported — by Pawket either."
          />
        </Paper>
        {problem ? <Banner tone="risk" title="Nothing was linked" body={problem} /> : null}
        <div>
          <Button label={`Link ${here}`} icon="bolt" tone="sun" disabled={busy || !sponsor.data} onClick={() => void link({ days, daily, deposit })} />
        </div>
      </Stack>
    </Card>
  );
}

function Opened({ state, owner }: { state: PawketWalletState; owner: Address }) {
  const wallet = state.wallet!;
  const cluster = getPublicEnv().solanaCluster;
  const [now] = useState(() => Date.now() / 1000);
  return (
    <Stack gap={5}>
      {state.error ? (
        <Banner tone="wait" title="Solana did not answer" body="What is shown was read a moment ago; it may be behind." />
      ) : null}
      <div className="pk-wallet-top">
        <Paper title="Pawket Wallet" meta={`Solana ${cluster}`}>
          <div className="pk-wallet-balance">
            <span className="receipt-label">Balance</span>
            <span className="pk-wallet-balance__v">{sol(state.balance)}</span>
          </div>
          <Receipt
            rows={[
              { k: "On this device, for fees", v: state.device ? sol(state.deviceLamports) : "—" },
              { k: "Put in", v: sol(wallet.deposited) },
              { k: "Taken out", v: sol(wallet.withdrawn) },
              { k: "Spent on activity + fees", v: sol(wallet.spent) },
              { k: "Actions by a device", v: wallet.actions.toLocaleString() },
            ]}
          />
          <div className="pk-receipt" style={{ marginTop: "var(--space-3)" }}>
            <div className="pk-receipt__row">
              <span className="pk-receipt__k">Address</span>
              <AddressLine value={wallet.address} label="Pawket Wallet" href={explorerAddressUrl(wallet.address, cluster)} />
            </div>
          </div>
        </Paper>
        <ThisDevice state={state} owner={owner} now={now} />
      </div>
      <MoveMoney state={state} owner={owner} />
      <History state={state} owner={owner} now={now} />
      <Rules />
      <CloseWallet state={state} owner={owner} />
    </Stack>
  );
}

function ThisDevice({ state, owner, now }: { state: PawketWalletState; owner: Address; now: number }) {
  const wallet = state.wallet!;
  const sender = usePawketSend();
  const [days, setDays] = useState<number>(30);
  const [daily, setDaily] = useState<number>(wallet.dailyActions || 100);
  const linking = useLinkBrowser();
  const { here: place, Here: Place } = useHere();
  const link = () => linking.link({ days, daily });
  const problem = linking.problem;
  const here = state.device && wallet.device === state.device.address;
  const elsewhere = wallet.device && !here;
  const expired = here && wallet.deviceExpiresAt <= now;
  const until = formatLocalDate(new Date(wallet.deviceExpiresAt * 1000));
  const left = Math.max(0, wallet.dailyActions - wallet.actionsToday);

  async function unlinkHere() {
    if (!state.device) return;
    const device = state.device;
    const result = await sender.asDevice(`Unlink ${place}`, device, () => [
      getUnlinkDeviceInstruction({ authority: device, wallet: wallet.address, device, deviceSigns: true }),
    ]);
    if (result?.outcome === "confirmed") {
      await forgetDevice(owner);
      await refreshPawketWallet(owner);
    }
  }

  const stranded = state.device && wallet.device !== state.device.address && state.deviceLamports > WALLET_LIMITS.feePerSignature
    ? state.deviceLamports - WALLET_LIMITS.feePerSignature
    : 0n;

  async function returnFloat() {
    if (!state.device || stranded <= 0n) return;
    const device = state.device;
    const home = await getReturnFloatInstruction({ device, owner, lamports: stranded });
    const result = await sender.asDevice(`Return ${sol(stranded)} from ${place}`, device, () => [home]);
    if (result?.outcome === "confirmed") await refreshPawketWallet(owner);
  }

  async function unlinkElsewhere() {
    if (!wallet.device) return;
    const result = await sender.send("Unlink the other device", ({ owner: signer }) => [
      getUnlinkDeviceInstruction({ authority: signer, wallet: wallet.address, device: wallet.device!, deviceSigns: false }),
    ]);
    if (result) await refreshPawketWallet(owner);
  }

  const limits = (
    <>
      <Choice label="Link it for" options={DAYS} value={days} onPick={setDays} />
      <Choice label="At most" options={DAILY} value={daily} onPick={setDaily} />
    </>
  );

  return (
    <Card>
      <div className="pk-spread">
        <h2 className="title">{Place}</h2>
        {here && !expired ? <Chip label="Linked" tone="sprout" icon="check" /> : <Chip label={expired ? "Link ran out" : "Not linked"} />}
      </div>
      <Stack gap={4} style={{ marginTop: "var(--space-3)" }}>
        {here && !expired ? (
          <>
            <p className="body-sm">
              What your pets do on Solana is signed here, with no pop-up — until {until}, up to {wallet.dailyActions} times
              a day. Anything that spends SOL still asks your wallet.
            </p>
            <Receipt
              rows={[
                { k: "Today", v: `${wallet.actionsToday} of ${wallet.dailyActions}`, tone: left === 0 ? "warn" : undefined },
                { k: "Linked until", v: until },
                { k: "This device's key", v: truncateAddress(state.device!.address) },
              ]}
            />
            {left === 0 ? (
              <Banner
                tone="wait"
                title="Today's limit is reached"
                body={`This device can act again ${dayTurnsAt()}. To continue sooner, link again with a higher daily limit below.`}
              />
            ) : null}
            <Row gap={2} wrap>
              {state.linked ? <ButtonLink label="Back to your pets" icon="home" size="sm" href="/home" /> : null}
              <Button label={`Unlink ${place}`} tone="quiet" size="sm" disabled={sender.busy} onClick={() => void unlinkHere()} />
            </Row>
            <details className="pk-more">
              <summary className="body-sm">Change how long, or how much a day</summary>
              <Stack gap={3} style={{ marginTop: "var(--space-3)" }}>
                {limits}
                <div>
                  <Button label="Link again with these" tone="quiet" size="sm" disabled={sender.busy || linking.busy} onClick={() => void link()} />
                </div>
              </Stack>
            </details>
          </>
        ) : (
          <>
            <p className="body-sm pk-muted">
              {expired
                ? `Its link ran out on ${until}. Link it again to continue without pop-ups.`
                : elsewhere
                  ? `Another browser (${truncateAddress(wallet.device!)}) is linked. Linking this one takes its place; the other can hand back what it holds for fees from its own Pawket Wallet screen.`
                  : `Pawket acts on Solana through a linked device. Link ${place}, and it signs what your pets do with no pop-up.`}
            </p>
            {limits}
            <Row gap={2} wrap>
              <Button label={expired ? "Link it again" : `Link ${place}`} icon="bolt" tone="sun" disabled={sender.busy || linking.busy} onClick={() => void link()} />
              {elsewhere ? <Button label="Unlink the other device" tone="ghost" size="sm" disabled={sender.busy} onClick={() => void unlinkElsewhere()} /> : null}
            </Row>
            {stranded > 0n ? (
              <p className="caption pk-faint">
                {Place}&apos;s old key still holds {sol(stranded + WALLET_LIMITS.feePerSignature)} from its fee float.{" "}
                <button type="button" className="pk-linkish" disabled={sender.busy} onClick={() => void returnFloat()}>
                  Send {sol(stranded)} back to your Pawket Wallet
                </button>{" "}
                (it pays its own fee; no pop-up).
              </p>
            ) : null}
          </>
        )}
        {problem ? <Banner tone="risk" title="Nothing was linked" body={problem} /> : null}
      </Stack>
    </Card>
  );
}

function MoveMoney({ state, owner }: { state: PawketWalletState; owner: Address }) {
  const wallet = state.wallet!;
  const sender = usePawketSend();
  const [way, setWay] = useState<"in" | "out">("in");
  const [amount, setAmount] = useState("0.01");
  const lamports = parseSolToLamports(amount);
  const over = way === "out" && lamports !== null && lamports > state.balance;

  async function move() {
    if (!lamports || over) return;
    const result =
      way === "in"
        ? await sender.send(`Put ${sol(lamports)} in your Pawket Wallet`, ({ owner: signer }) => [
            getDepositInstruction({ owner: signer, wallet: wallet.address, amount: lamports }),
          ])
        : await sender.send(`Take ${sol(lamports)} back to your wallet`, ({ owner: signer }) => [
            getWithdrawInstruction({ owner: signer, wallet: wallet.address, amount: lamports }),
          ]);
    if (result) await refreshPawketWallet(owner);
  }

  return (
    <Card id="put-in">
      <h2 className="title">Put in, take out</h2>
      <p className="body-sm pk-muted" style={{ marginTop: "var(--space-2)" }}>
        Either way your wallet approves it. What comes out goes to your wallet ({truncateAddress(owner)}) and nowhere else.
        <DevnetFaucet />
      </p>
      <Stack gap={4} style={{ marginTop: "var(--space-4)" }}>
        <Choice
          label="Which way"
          options={[
            { value: "in", label: "Put in" },
            { value: "out", label: "Take out" },
          ]}
          value={way}
          onPick={setWay}
        />
        <Field
          label={way === "in" ? "Amount to put in" : "Amount to take out"}
          icon="wallet"
          suffix="SOL"
          amount
          inputMode="decimal"
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
          error={lamports === null ? "An amount in SOL, like 0.01." : over ? `Your balance is ${sol(state.balance)}.` : undefined}
        />
        <Row gap={2} wrap>
          <Button
            label={way === "in" ? "Put it in" : "Take it out"}
            tone="quiet"
            disabled={!lamports || over || sender.busy}
            onClick={() => void move()}
          />
          {way === "out" && state.balance > 0n ? (
            <Button label="All of it" tone="ghost" size="sm" onClick={() => setAmount(formatSol(state.balance))} />
          ) : null}
        </Row>
      </Stack>
    </Card>
  );
}

export function History({ state, owner, now }: { state: PawketWalletState; owner: Address; now: number }) {
  const wallet = state.wallet!;
  const cluster = getPublicEnv().solanaCluster;
  const companion = useCompanion();
  const sponsor = useSponsor();
  const names = new Map(companion.owned.map((entry) => [entry.pet.address as string, entry.pet.name]));
  const paidBy = (entry: WalletEntry) =>
    entry.feePayer === owner
      ? " · fee paid by you"
      : sponsor.data?.address && entry.feePayer === sponsor.data.address
        ? " · fee paid by Pawket"
        : sponsor.data
          ? // A refused transaction undoes the device's refill, so only its own float paid.
            ` · fee paid by a device${entry.ok ? ", from your balance" : ""}`
          : "";
  const rent = useRequest(rentOfWallet);
  const version = `${wallet.address}:${wallet.actions}:${wallet.deposited}:${wallet.withdrawn}:${wallet.spent}:${wallet.device}`;
  const statement = { rent: rent.data, owner, device: wallet.device };
  const first = useCallback(
    () => fetchWalletHistory(rpc, wallet.address, { ...statement, limit: 6 }),
    [wallet.address, version, rent.data], // eslint-disable-line react-hooks/exhaustive-deps
  );
  const page = useRequest(rent.data === undefined ? null : first);
  const [older, setOlder] = useState<{ version: string; entries: WalletEntry[]; next: string | null } | null>(null);
  const [loading, setLoading] = useState(false);
  const [missed, setMissed] = useState(false);
  const extra = older?.version === version ? older : null;
  const entries = [...(page.data?.entries ?? []), ...(extra?.entries ?? [])];
  const next = extra ? extra.next : (page.data?.next ?? null);

  async function more() {
    if (!next) return;
    setLoading(true);
    setMissed(false);
    try {
      const read = await fetchWalletHistory(rpc, wallet.address, { ...statement, before: next });
      setOlder({ version, entries: [...(extra?.entries ?? []), ...read.entries], next: read.next });
    } catch {
      setMissed(true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Stack gap={3}>
      <SectionLabel count={entries.length ? `${entries.length}${next ? "+" : ""}` : undefined}>Where it went</SectionLabel>
      <Paper title="History" meta="Read from Solana">
        {page.status === "error" && !page.data ? (
          <p className="body-sm pk-muted">Solana did not answer, so the history could not be read. Nothing in it changed.</p>
        ) : !page.data ? (
          <p className="body-sm pk-faint">Reading…</p>
        ) : entries.length === 0 ? (
          <p className="body-sm pk-muted">Nothing yet.</p>
        ) : (
          <ol className="pk-ledger">
            {entries.map((entry) => (
              <li key={entry.signature} className="pk-ledger__row">
                <span className="pk-ledger__what">
                  <span className="body-sm">{describe(entry, names)}</span>
                  <span className="caption pk-faint">
                    {entry.at ? formatAgo(now - entry.at) : "time unknown"}{paidBy(entry)}
                    {entry.ok ? "" : " · refused, nothing changed"}
                  </span>
                </span>
                <a className="pk-ledger__amount" href={explorerTxUrl(entry.signature, cluster)} target="_blank" rel="noreferrer">
                  {entry.change === 0n ? "0 SOL" : `${entry.change > 0n ? "+" : "−"}${sol(entry.change < 0n ? -entry.change : entry.change)}`}
                  <span className="pk-sr"> — open on the explorer</span>
                </a>
              </li>
            ))}
          </ol>
        )}
        {next ? (
          <div style={{ marginTop: "var(--space-3)" }}>
            <Button tone="paper" label={loading ? "Reading…" : "Older"} disabled={loading} onClick={() => void more()} />
            {missed ? (
              <p role="status" className="caption pk-muted" style={{ marginTop: "var(--space-2)" }}>
                Solana did not answer, so the older history could not be read. Nothing in it changed; try again.
              </p>
            ) : null}
          </div>
        ) : null}
      </Paper>
    </Stack>
  );
}

function describe(entry: WalletEntry, names: Map<string, string>): string {
  const pet = entry.pet ? (names.get(entry.pet) ?? `a pet (${truncateAddress(entry.pet)})`) : "a pet";
  const words = entry.kinds.map((kind) => {
    switch (kind) {
      case "open":
        return "Opened";
      case "deposit":
        return entry.amount ? `Put in ${sol(entry.amount)}` : "Put in";
      case "withdraw":
        return entry.amount ? `Took out ${sol(entry.amount)}` : "Took out";
      case "link":
        return entry.toDevice ? `Linked a device, ${sol(entry.toDevice)} to it for fees` : "Linked a device";
      case "unlink":
        return entry.change > 0n ? `Unlinked a device, ${sol(entry.change)} back from it` : "Unlinked a device";
      case "close":
        return "Closed, the balance back to you";
      case "care":
        return entry.action ? `${CARE_DONE_LABEL[entry.action]} ${pet}` : `Cared for ${pet}`;
      case "round":
        return `A round with ${pet}`;
      case "dress": {
        const piece = entry.wearing ? findWearable(entry.wearing) : undefined;
        return piece ? `Put the ${piece.name.toLowerCase()} on ${pet}` : `Dressed ${pet}`;
      }
      case "adopt":
        return `Kept ${pet} on Solana`;
      case "found":
        return `${pet} founded a guild`;
      case "join":
        return `${pet} joined a guild`;
      case "leave":
        return `${pet} left a guild`;
      case "event":
        return "Planned an event";
      case "rsvp":
        return `${pet} is going to an event`;
      case "check-in":
        return `${pet} checked in`;
      case "poll":
        return "Asked a poll";
      case "vote":
        return "Voted";
      case "wave":
        return `Waved at ${pet}`;
      case "purchase":
        return "Bought a Market item";
      case "coin":
        return "Guild coin transaction";
      case "card":
        return "Made a keepsake card";
    }
  });
  return words.join(" · ");
}

function CloseWallet({ state, owner }: { state: PawketWalletState; owner: Address }) {
  const wallet = state.wallet!;
  const sender = usePawketSend();
  const [asking, setAsking] = useState(false);
  const here = state.device && wallet.device === state.device.address ? state.device : null;

  async function close() {
    const result = await sender.send("Close your Pawket Wallet", ({ owner: signer }) => [
      ...(wallet.device
        ? [
            getUnlinkDeviceInstruction({
              authority: signer,
              wallet: wallet.address,
              device: here ?? wallet.device,
              deviceSigns: Boolean(here),
            }),
          ]
        : []),
      getCloseWalletInstruction({ owner: signer, wallet: wallet.address, rentPayer: wallet.rentPayer }),
    ]);
    if (result?.outcome === "confirmed") {
      if (here) await forgetDevice(owner);
      await refreshPawketWallet(owner);
    }
  }

  return (
    <Card variant="quiet">
      <div className="pk-spread">
        <h2 className="title">Close it</h2>
        {asking ? null : <Button label="Close my Pawket Wallet" tone="ghost" size="sm" onClick={() => setAsking(true)} />}
      </div>
      <p className="body-sm pk-muted" style={{ marginTop: "var(--space-2)" }}>
        Everything in it comes back to your wallet, and the rent to whoever paid it.
        {wallet.device && !here ? " The other linked device is unlinked first; what it holds for fees stays on it." : ""}
      </p>
      {asking ? (
        <Stack gap={3} style={{ marginTop: "var(--space-4)" }}>
          <p className="body-sm">
            Close it? {sol(state.balance + (here ? state.deviceLamports : 0n))} comes back to your wallet, and this device stops
            acting for you. You can open another any time.
          </p>
          <Row gap={2} wrap>
            <Button label="Close it" tone="alarm" size="sm" disabled={sender.busy} onClick={() => void close()} />
            <Button label="Keep it" tone="quiet" size="sm" onClick={() => setAsking(false)} />
          </Row>
        </Stack>
      ) : null}
    </Card>
  );
}
