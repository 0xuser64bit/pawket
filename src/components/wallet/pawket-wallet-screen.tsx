"use client";

import { useCallback, useState } from "react";
import type { Address } from "@solana/kit";
import { useConnectedWallet, useIsWalletReady } from "@solana/kit-plugin-wallet/react";
import { useRequest } from "@solana/react";
import {
  Banner,
  Button,
  Card,
  Chip,
  Choice,
  Field,
  Icon,
  Paper,
  Receipt,
  Row,
  Screen,
  ScreenBar,
  SectionLabel,
  Stack,
  Waiting,
  type IconName,
} from "@/components/pk";
import { AddressLine } from "@/components/wallet/address";
import { TxReceipt } from "@/components/wallet/tx-receipt";
import { WalletSheet } from "@/components/wallet/wallet-sheet";
import { getPublicEnv } from "@/config/env";
import { findWearable } from "@/lib/closet/catalog";
import { useCompanion } from "@/lib/companion/use-companion";
import { CARE_DONE_LABEL } from "@/lib/game/appearance";
import { rpc, wallet as walletClient } from "@/lib/solana/browser-client";
import { explorerAddressUrl, explorerTxUrl } from "@/lib/solana/cluster";
import {
  getCloseWalletInstruction,
  getDepositInstruction,
  getLinkDeviceInstruction,
  getOpenWalletInstruction,
  getUnlinkDeviceInstruction,
  getWithdrawInstruction,
} from "@/lib/solana/instructions";
import { deriveWalletPda } from "@/lib/solana/pda";
import { WALLET_LIMITS } from "@/lib/solana/program";
import { usePawketSend, useSponsor } from "@/lib/solana/use-send";
import { formatAgo, formatSol, formatUtcDate, parseSolToLamports, truncateAddress } from "@/lib/utils/format";
import { useMounted } from "@/lib/utils/use-mounted";
import { forgetDevice, loadDevice, makeDevice } from "@/lib/wallet/device";
import { fetchWalletHistory, type WalletEntry } from "@/lib/wallet/history";
import { refreshPawketWallet, rentOfWallet, usePawketWallet, type PawketWalletState } from "@/lib/wallet/pawket-wallet";

/**
 * The Pawket Wallet: care without a prompt for every care. The player's own
 * wallet links this device once; from then on the device signs care, rounds
 * and clothes for their pets on Solana by itself, inside the limits they set,
 * and pays each fee from the balance they put in. Money moves only with the
 * wallet's own approval, and only ever back to it. Everything here is read
 * from Solana — the balance, the link, and every line of the history.
 *
 * Money is Paper: statements, not celebrations, and nothing moves on it.
 */

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
/** The least a first deposit can be: the device's float and a good many fees. */
const MIN_FIRST = 2_000_000n;
const sol = (lamports: bigint) => `${formatSol(lamports)} SOL`;

/** A link's end: a few minutes inside the program's 30 days, so a clock running ahead is not refused. */
const expiresIn = (days: number) => Math.floor(Date.now() / 1000) + Math.min(days * 86_400, WALLET_LIMITS.maxDeviceSeconds) - 600;

export function PawketWalletScreen() {
  // The wallet is only known in the browser, after hydration.
  const mounted = useMounted();
  const walletReady = useIsWalletReady(walletClient);
  const ready = mounted && walletReady;
  const connected = useConnectedWallet(walletClient);
  const owner = (connected?.account.address as Address | undefined) ?? null;
  const state = usePawketWallet(owner);
  const [connecting, setConnecting] = useState(false);

  return (
    <Screen>
      <ScreenBar>
        <div>
          <h1 className="display-l">Pawket Wallet</h1>
          <p className="caption pk-faint">Care without a prompt for every care. Yours, on Solana {getPublicEnv().solanaCluster}.</p>
        </div>
        {state?.linked ? <Chip label="This device is linked" tone="sprout" icon="check" /> : null}
      </ScreenBar>

      {!ready ? (
        <Waiting label="Opening your Pawket Wallet" />
      ) : !owner ? (
        <Stack gap={5}>
          <Intro />
          <Card>
            <h2 className="title">Connect the wallet that keeps your pets</h2>
            <p className="body-sm pk-muted" style={{ marginTop: "var(--space-2)" }}>
              A Pawket Wallet belongs to a wallet. Connecting signs nothing.
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
        <Stack gap={5}>
          <Intro />
          <SetUp owner={owner} />
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

/** What it is, in three lines. */
function Intro() {
  const points: Array<{ icon: IconName; title: string; body: string }> = [
    {
      icon: "bolt",
      title: "One approval, then no prompts",
      body: "Your wallet links this device once. After that, caring, playing and dressing your pets on Solana is signed here — no pop-up each time.",
    },
    {
      icon: "wallet",
      title: "Fees from a balance you fill",
      body: "Each thing the device does costs one network fee, paid from what you put in. Nothing else can be spent from it.",
    },
    {
      icon: "check",
      title: "Only ever back to you",
      body: "Withdraw or close it whenever you like. Money moves only with your wallet's approval, and only to your wallet.",
    },
  ];
  return (
    <div className="pk-wallet-intro">
      {points.map((point) => (
        <Card key={point.title} variant="quiet">
          <span className="pk-wallet-intro__icon" aria-hidden="true">
            <Icon name={point.icon} size={18} />
          </span>
          <h2 className="title" style={{ marginTop: "var(--space-3)" }}>
            {point.title}
          </h2>
          <p className="body-sm pk-muted" style={{ marginTop: "var(--space-2)" }}>
            {point.body}
          </p>
        </Card>
      ))}
    </div>
  );
}

/** The rule every device lives inside. The program holds it to every line. */
function Rules() {
  const can = [
    "Care for, play with and dress your pets on Solana, from this browser only",
    "Pay its own network fee, refilled from your balance by that fee and no more",
    "Act until the date you choose — 30 days at most — up to the times a day you choose",
  ];
  const cannot = [
    "Move your balance anywhere: only your wallet withdraws, and only to itself",
    "Adopt, found or join a guild, or touch a pet that is not yours",
    "Act once its link runs out, or past today's limit",
    "Be read: its key is made in this browser and cannot be exported — by Pawket either",
  ];
  return (
    <Stack gap={3}>
      <SectionLabel>The rule a linked device lives inside</SectionLabel>
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
    </Stack>
  );
}

/** Opening one: the first deposit and this device's link, in one approval. */
function SetUp({ owner }: { owner: Address }) {
  const sender = usePawketSend();
  const sponsor = useSponsor();
  const rent = useRequest(rentOfWallet);
  const cluster = getPublicEnv().solanaCluster;
  const [amount, setAmount] = useState("0.02");
  const [days, setDays] = useState<number>(7);
  const [daily, setDaily] = useState<number>(100);
  const [problem, setProblem] = useState<string>();
  const lamports = parseSolToLamports(amount);
  const tooLittle = lamports !== null && lamports < MIN_FIRST;

  async function open() {
    if (!lamports || tooLittle) return;
    setProblem(undefined);
    let device;
    try {
      device = (await loadDevice(owner)) ?? (await makeDevice(owner));
    } catch (error) {
      setProblem(error instanceof Error ? error.message : "This browser cannot keep a device key. Nothing was linked.");
      return;
    }
    const wallet = (await deriveWalletPda(owner)).address;
    const result = await sender.send("Open your Pawket Wallet and link this device", ({ owner: signer }) => [
      getOpenWalletInstruction({ owner: signer, payer: signer, wallet }),
      getDepositInstruction({ owner: signer, wallet, amount: lamports }),
      getLinkDeviceInstruction({ owner: signer, wallet, device, expiresAt: expiresIn(days), dailyActions: daily }),
    ]);
    if (result) await refreshPawketWallet(owner);
  }

  return (
    <Card>
      <h2 className="title">Open your Pawket Wallet</h2>
      <p className="body-sm pk-muted" style={{ marginTop: "var(--space-2)" }}>
        One approval opens it, puts in your first balance and links this device.
      </p>
      <Stack gap={4} style={{ marginTop: "var(--space-4)" }}>
        <Field
          label="First deposit"
          icon="wallet"
          suffix="SOL"
          amount
          inputMode="decimal"
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
          error={
            lamports === null
              ? "An amount in SOL, like 0.02."
              : tooLittle
                ? `At least ${sol(MIN_FIRST)}: the device keeps ${sol(WALLET_LIMITS.deviceFloat)} for its fees.`
                : undefined
          }
          helper={`About ${lamports ? (lamports / WALLET_LIMITS.feePerSignature).toLocaleString() : 0} actions' worth of fees.`}
        />
        <Choice label="Link this device for" options={DAYS} value={days} onPick={setDays} />
        <Choice label="At most" options={DAILY} value={daily} onPick={setDaily} />
        <Paper title="What this approval does" meta={`Solana ${cluster}`}>
          <Receipt
            rows={[
              { k: "From your wallet", v: lamports ? sol(lamports) : "—" },
              { k: "Kept as your balance", v: lamports && !tooLittle ? sol(lamports - WALLET_LIMITS.deviceFloat) : "—" },
              { k: "On this device, for fees", v: sol(WALLET_LIMITS.deviceFloat) },
              { k: "Rent for the wallet", v: rent.data ? `${sol(rent.data)}, back when you close it` : "Back when you close it" },
              { k: "Network fee", v: sponsor.data?.available ? "Paid by Pawket" : "Paid by you" },
            ]}
            note="Your wallet approves this once. The device's key is made in this browser and cannot be read or exported."
          />
        </Paper>
        {problem ? <Banner tone="risk" title="Nothing was linked" body={problem} /> : null}
        <div>
          <Button
            label="Open it and link this device"
            icon="bolt"
            tone="sun"
            disabled={!lamports || tooLittle || sender.busy}
            onClick={() => void open()}
          />
        </div>
        <TxReceipt tx={sender.tx} cluster={cluster} />
      </Stack>
    </Card>
  );
}

/** A Pawket Wallet that is open: what it holds, this device, moving money, and the history. */
function Opened({ state, owner }: { state: PawketWalletState; owner: Address }) {
  const wallet = state.wallet!;
  const cluster = getPublicEnv().solanaCluster;
  // When this screen was opened: what a link's end and a line's age are counted from.
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
              { k: "Moved to devices for fees", v: sol(wallet.spent) },
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

/** This device: linked or not, until when, how much of today is left, and the way out. */
function ThisDevice({ state, owner, now }: { state: PawketWalletState; owner: Address; now: number }) {
  const wallet = state.wallet!;
  const sender = usePawketSend();
  const cluster = getPublicEnv().solanaCluster;
  const [days, setDays] = useState<number>(7);
  const [daily, setDaily] = useState<number>(wallet.dailyActions || 100);
  const [problem, setProblem] = useState<string>();
  const here = state.device && wallet.device === state.device.address;
  const elsewhere = wallet.device && !here;
  const expired = here && wallet.deviceExpiresAt <= now;
  const until = formatUtcDate(new Date(wallet.deviceExpiresAt * 1000));
  const left = Math.max(0, wallet.dailyActions - wallet.actionsToday);

  async function link() {
    setProblem(undefined);
    let device;
    try {
      device = (here ? state.device : null) ?? (await makeDevice(owner));
    } catch (error) {
      setProblem(error instanceof Error ? error.message : "This browser cannot keep a device key. Nothing was linked.");
      return;
    }
    const result = await sender.send(here ? "Link this device again" : "Link this device", ({ owner: signer }) => [
      getLinkDeviceInstruction({ owner: signer, wallet: wallet.address, device, expiresAt: expiresIn(days), dailyActions: daily }),
    ]);
    if (result) await refreshPawketWallet(owner);
  }

  async function unlinkHere() {
    if (!state.device) return;
    // The device lets go of itself: it signs and pays, and what it holds comes home. No prompt.
    const result = await sender.asDevice("Unlink this device", state.device, [
      getUnlinkDeviceInstruction({ authority: state.device, wallet: wallet.address, device: state.device, deviceSigns: true }),
    ]);
    if (result?.outcome === "confirmed") {
      await forgetDevice(owner);
      await refreshPawketWallet(owner);
    }
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
        <h2 className="title">This device</h2>
        {here && !expired ? <Chip label="Linked" tone="sprout" icon="check" /> : <Chip label={expired ? "Link ran out" : "Not linked"} />}
      </div>
      <Stack gap={4} style={{ marginTop: "var(--space-3)" }}>
        {here && !expired ? (
          <>
            <p className="body-sm">
              Caring, playing and dressing your pets on Solana is signed here, with no prompt — until {until}, up to{" "}
              {wallet.dailyActions} times a day.
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
                body="Until midnight UTC your wallet signs each care again, as before. Nothing else changed."
              />
            ) : null}
            <Row gap={2} wrap>
              <Button label="Unlink this device" tone="quiet" size="sm" disabled={sender.busy} onClick={() => void unlinkHere()} />
            </Row>
            <details className="pk-wallet-more">
              <summary className="body-sm">Change how long, or how much a day</summary>
              <Stack gap={3} style={{ marginTop: "var(--space-3)" }}>
                {limits}
                <div>
                  <Button label="Link again with these" tone="quiet" size="sm" disabled={sender.busy} onClick={() => void link()} />
                </div>
              </Stack>
            </details>
          </>
        ) : (
          <>
            <p className="body-sm pk-muted">
              {expired
                ? `Its link ran out on ${until}. Your wallet signs each care again until you link it once more.`
                : elsewhere
                  ? `Another device (${truncateAddress(wallet.device!)}) is linked. Linking this one takes its place; the other keeps what it holds for fees until it unlinks itself.`
                  : "Link it, and caring for your pets on Solana stops asking your wallet every time."}
            </p>
            {limits}
            <Row gap={2} wrap>
              <Button
                label={expired ? "Link it again" : "Link this device"}
                icon="bolt"
                tone="sun"
                disabled={sender.busy || state.balance + state.deviceLamports < WALLET_LIMITS.deviceFloat}
                onClick={() => void link()}
              />
              {elsewhere ? <Button label="Unlink the other device" tone="ghost" size="sm" disabled={sender.busy} onClick={() => void unlinkElsewhere()} /> : null}
            </Row>
            {state.balance + state.deviceLamports < WALLET_LIMITS.deviceFloat ? (
              <p className="body-sm pk-faint">A device keeps {sol(WALLET_LIMITS.deviceFloat)} for its fees: put that much in first.</p>
            ) : null}
          </>
        )}
        {problem ? <Banner tone="risk" title="Nothing was linked" body={problem} /> : null}
        <TxReceipt tx={sender.tx} cluster={cluster} />
      </Stack>
    </Card>
  );
}

/** Putting money in and taking it out: always the wallet's own approval, and out only to the wallet. */
function MoveMoney({ state, owner }: { state: PawketWalletState; owner: Address }) {
  const wallet = state.wallet!;
  const sender = usePawketSend();
  const cluster = getPublicEnv().solanaCluster;
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
    <Card>
      <h2 className="title">Put in, take out</h2>
      <p className="body-sm pk-muted" style={{ marginTop: "var(--space-2)" }}>
        Either way your wallet approves it. What comes out goes to your wallet ({truncateAddress(owner)}) and nowhere else.
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
        <TxReceipt tx={sender.tx} cluster={cluster} />
      </Stack>
    </Card>
  );
}

/** Every line of the statement, read from Solana, newest first. */
function History({ state, owner, now }: { state: PawketWalletState; owner: Address; now: number }) {
  const wallet = state.wallet!;
  const cluster = getPublicEnv().solanaCluster;
  const companion = useCompanion();
  const sponsor = useSponsor();
  const names = new Map(companion.owned.map((entry) => [entry.pet.address as string, entry.pet.name]));
  const paidBy = (entry: WalletEntry) =>
    entry.feePayer === owner ? "paid by you" : entry.feePayer === sponsor.data?.address ? "paid by Pawket" : "paid by a device, from your balance";
  const rent = useRequest(rentOfWallet);
  // Read again whenever the wallet moves; the rent first, since it is never the balance.
  const version = `${wallet.address}:${wallet.actions}:${wallet.deposited}:${wallet.withdrawn}:${wallet.device}`;
  const first = useCallback(
    () => fetchWalletHistory(rpc, wallet.address, { rent: rent.data }),
    [wallet.address, version, rent.data], // eslint-disable-line react-hooks/exhaustive-deps
  );
  const page = useRequest(rent.data === undefined ? null : first);
  const [older, setOlder] = useState<{ version: string; entries: WalletEntry[]; next: string | null } | null>(null);
  const [loading, setLoading] = useState(false);
  const extra = older?.version === version ? older : null;
  const entries = [...(page.data?.entries ?? []), ...(extra?.entries ?? [])];
  const next = extra ? extra.next : (page.data?.next ?? null);

  async function more() {
    if (!next) return;
    setLoading(true);
    try {
      const read = await fetchWalletHistory(rpc, wallet.address, { before: next, rent: rent.data });
      setOlder({ version, entries: [...(extra?.entries ?? []), ...read.entries], next: read.next });
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
                    {entry.at ? formatAgo(now - entry.at) : "time unknown"} · fee {paidBy(entry)}
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
          </div>
        ) : null}
      </Paper>
    </Stack>
  );
}

/** One line of the history, in words. */
export function describe(entry: WalletEntry, names: Map<string, string>): string {
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
        return "Closed, everything back to you";
      case "care":
        return entry.action ? `${CARE_DONE_LABEL[entry.action]} ${pet}` : `Cared for ${pet}`;
      case "round":
        return `A round with ${pet}`;
      case "dress": {
        const piece = entry.wearing ? findWearable(entry.wearing) : undefined;
        return piece ? `Put the ${piece.name.toLowerCase()} on ${pet}` : `Took ${pet}'s things off`;
      }
    }
  });
  return words.join(" · ");
}

/** Closing it: the balance back to the wallet, the rent to whoever paid it. */
function CloseWallet({ state, owner }: { state: PawketWalletState; owner: Address }) {
  const wallet = state.wallet!;
  const sender = usePawketSend();
  const cluster = getPublicEnv().solanaCluster;
  const [asking, setAsking] = useState(false);
  const here = state.device && wallet.device === state.device.address ? state.device : null;

  async function close() {
    const result = await sender.send("Close your Pawket Wallet", ({ owner: signer }) => [
      ...(wallet.device
        ? [
            getUnlinkDeviceInstruction({
              authority: signer,
              wallet: wallet.address,
              // This device signs too, so what it holds comes home before the wallet closes.
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
          <TxReceipt tx={sender.tx} cluster={cluster} />
        </Stack>
      ) : null}
    </Card>
  );
}
