"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useRequest } from "@solana/react";
import type { Address } from "@solana/kit";
import { Banner, Button, ButtonLink, Card, Choice, Field, Paper, Receipt, Row, Stack, type ReceiptRow } from "@/components/pk";
import { WalletSheet } from "@/components/wallet/wallet-sheet";
import type { SolanaCluster } from "@/config/env";
import { COIN_RISKS } from "@/lib/coins/copy";
import { COIN_PRESETS, COIN_TERMS, feeSplitBps, type PresetId } from "@/lib/coins/presets";
import { canTrade } from "@/lib/coins/stage";
import { rpc, useConnected } from "@/lib/solana/browser-client";
import { usePawketSend, type PawketSender } from "@/lib/solana/use-send";
import { usePawketWallet } from "@/lib/wallet/pawket-wallet";
import { formatUnits, parseUnits } from "@/lib/utils/format";
import type { CoinQuote, CoinState } from "@/server/coins/meteora";

export interface CoinDeskProps {
  guild: { slug: string; name: string; founder: string; memberCount: number };
  coin: CoinState;
  thresholds: Record<PresetId, string>;
  cluster: SolanaCluster;
}

const QUOTE_SECONDS = 20;
const SOL = 9;
const sol = (lamports: bigint | string, places = 4) => `${formatUnits(lamports, SOL, places)} SOL`;

export function CoinDesk({ guild, coin, thresholds, cluster }: CoinDeskProps) {
  const connected = useConnected();
  const owner = (connected?.account.address as Address | undefined) ?? null;
  const sender = usePawketSend();
  const router = useRouter();
  const [connecting, setConnecting] = useState(false);
  const balances = useBalances(owner, coin.stage === "none" ? null : coin.mint);

  const done = useCallback(() => {
    router.refresh();
    balances.refresh();
  }, [router, balances]);

  const isFounder = owner !== null && owner === guild.founder;
  const isCreator = owner !== null && owner === coin.creator;

  return (
    <Stack gap={4}>
      {owner && (!sender.pawketWallet?.linked || (sender.pawketWallet?.balance ?? 0n) <= 0n) ? (
        <Banner tone="wait" title="Link and fund Pawket Wallet" body="Coin activity uses your Pawket Wallet balance." action={<ButtonLink label="Open Pawket Wallet" tone="quiet" size="sm" href="/wallet" />} />
      ) : null}
      {coin.stage === "none" ? (
        isFounder ? (
          <LaunchPanel guild={guild} thresholds={thresholds} sender={sender} onDone={done} />
        ) : (
          <Banner
            tone="guild"
            title={`${guild.name} has no coin`}
            body={`It is a social guild, as every guild starts. Its founder can launch a coin once ${COIN_TERMS.minMembers} pets are in it — optional, like the guild.`}
          />
        )
      ) : null}

      {coin.stage === "pending" ? <GraduatePanel guild={guild} cluster={cluster} sender={sender} canSign={Boolean(owner)} onConnect={() => setConnecting(true)} onDone={done} /> : null}

      {canTrade(coin.stage) ? (
        owner ? (
          <TradeTicket guild={guild} coin={coin} balances={balances.data ?? null} sender={sender} onDone={done} />
        ) : (
          <Card>
            <h2 className="title">Trade {coin.symbol}</h2>
            <p className="body-sm pk-muted" style={{ marginTop: "var(--space-2)" }}>
              Connect a wallet to see a quote. Connecting signs nothing; a trade asks your wallet each time.
            </p>
            <div style={{ marginTop: "var(--space-4)" }}>
              <Button label="Connect a wallet" icon="wallet" tone="quiet" size="sm" onClick={() => setConnecting(true)} />
            </div>
          </Card>
        )
      ) : null}

      {isCreator && BigInt(coin.fees.founderUnclaimed) > 0n ? <FounderFees guild={guild} coin={coin} sender={sender} onDone={done} /> : null}

      {coin.stage === "damm" && owner ? <PoolFees guild={guild} coin={coin} owner={owner} sender={sender} onDone={done} /> : null}


      {connecting ? (
        <WalletSheet
          why={`Connect the wallet you trade ${coin.symbol} with. It signs each trade; nothing else is asked of it.`}
          onDismiss={() => setConnecting(false)}
        />
      ) : null}
    </Stack>
  );
}

function useBalances(owner: Address | null, mint: string | null) {
  const walletState = usePawketWallet(owner);
  const fetcher = useCallback(async () => {
    const [{ value: lamports }, coin] = await Promise.all([
      Promise.resolve({ value: walletState?.balance ?? 0n }),
      mint
        ? rpc
            .getTokenAccountsByOwner(owner!, { mint: mint as Address }, { encoding: "jsonParsed", commitment: "confirmed" })
            .send()
        : null,
    ]);
    const units = (coin?.value ?? []).reduce(
      (sum, entry) => sum + BigInt((entry.account.data as { parsed: { info: { tokenAmount: { amount: string } } } }).parsed.info.tokenAmount.amount),
      0n,
    );
    return { lamports, units };
  }, [owner, mint, walletState?.balance]);
  return useRequest(owner ? fetcher : null);
}

const consentKey = (mint: string) => `pawket.coin-risk.${mint}`;
const consentListeners = new Set<() => void>();

function readConsent(mint: string): boolean {
  try {
    return window.localStorage.getItem(consentKey(mint)) === "read";
  } catch {
    return false;
  }
}

function useConsent(mint: string): [boolean, () => void] {
  const [thisVisit, setThisVisit] = useState(false);
  const stored = useSyncExternalStore(
    (listener) => {
      consentListeners.add(listener);
      return () => consentListeners.delete(listener);
    },
    () => readConsent(mint),
    () => false,
  );
  const agree = useCallback(() => {
    try {
      window.localStorage.setItem(consentKey(mint), "read");
    } catch {}
    setThisVisit(true);
    for (const listener of consentListeners) listener();
  }, [mint]);
  return [stored || thisVisit, agree];
}

function RiskGate({ agreed, onAgree }: { agreed: boolean; onAgree: () => void }) {
  if (agreed) {
    return (
      <details className="pk-more body-sm">
        <summary>What can go wrong</summary>
        <ol className="pk-risks">
          {COIN_RISKS.map((risk) => (
            <li key={risk}>{risk}</li>
          ))}
        </ol>
      </details>
    );
  }
  return (
    <Paper title="Before your first trade" meta="Read this" torn>
      <ol className="pk-risks body-sm">
        {COIN_RISKS.map((risk) => (
          <li key={risk}>{risk}</li>
        ))}
      </ol>
      <label className="pk-consent body-sm">
        <input
          type="checkbox"
          onChange={(event) => {
            if (event.target.checked) onAgree();
          }}
        />
        <span>I have read what can go wrong, and I am trading devnet coins I would be fine losing.</span>
      </label>
    </Paper>
  );
}

function LaunchPanel({
  guild,
  thresholds,
  sender,
  onDone,
}: {
  guild: CoinDeskProps["guild"];
  thresholds: CoinDeskProps["thresholds"];
  sender: PawketSender;
  onDone: () => void;
}) {
  const [preset, setPreset] = useState<PresetId>("gentle");
  const [firstBuy, setFirstBuy] = useState("0.1");
  const [agreed, agree] = useConsent(`launch-${guild.slug}`);
  const chosen = COIN_PRESETS.find((option) => option.id === preset)!;
  const lamports = firstBuy.trim() === "" ? 0n : parseUnits(firstBuy, SOL);
  const ready = guild.memberCount >= COIN_TERMS.minMembers;
  const split = feeSplitBps();

  async function launch() {
    if (lamports === null) return;
    const result = await sender.sendFromServer(
      `Launch ${guild.name}'s coin`,
      `/api/coins/${guild.slug}/launch`,
      { preset, firstBuy: lamports.toString() },
      { sponsored: false },
    );
    if (result?.outcome === "confirmed") onDone();
  }

  return (
    <Card>
      <h2 className="title">Launch {guild.name}&apos;s coin</h2>
      <p className="body-sm pk-muted" style={{ marginTop: "var(--space-2)" }}>
        Optional, like the guild. A coin trades on a bonding curve until it raises its threshold, then graduates into a
        pool on Meteora with its liquidity locked for good. It never touches a pet.
      </p>
      {!ready ? (
        <Banner
          tone="info"
          title={`Once ${COIN_TERMS.minMembers} pets are in ${guild.name}`}
          body={`${guild.name} has ${guild.memberCount}. A guild is a community first; the coin can come after.`}
          className="pk-foot"
        />
      ) : (
        <Stack gap={4} className="pk-foot">
          <Choice
            label="Its curve"
            options={COIN_PRESETS.map((option) => ({ value: option.id, label: option.name }))}
            value={preset}
            onPick={setPreset}
          />
          <p className="body-sm pk-muted">{chosen.line}</p>
          <Field
            label="Your first buy, in SOL"
            icon="wallet"
            amount
            inputMode="decimal"
            suffix="SOL"
            value={firstBuy}
            onChange={(event) => setFirstBuy(event.target.value)}
            error={lamports === null ? "An amount in SOL, or leave it empty for none." : undefined}
            helper="Bought in the same transaction that makes the coin, before anyone else can. Optional."
          />
          <Paper title="The terms" meta={chosen.name}>
            <Receipt
              rows={[
                { k: "Supply", v: `${formatUnits(BigInt(COIN_TERMS.supply), 0)}, fixed` },
                { k: "Price rises along the curve", v: `${chosen.rise}×` },
                { k: "Graduates at", v: `${sol(thresholds[preset], 2)} raised` },
                { k: "Trading fee", v: `${split.total / 100}%` },
                { k: "· to you", v: `${split.founder / 100}%` },
                { k: "· to Pawket", v: `${split.pawket / 100}%` },
                { k: "· to Meteora", v: `${split.meteora / 100}%` },
                { k: "Liquidity at graduation", v: "Locked for good", tone: "ok" },
                { k: "Allocations", v: "None — you buy like everyone" },
                { k: "Launch fee", v: sol(COIN_TERMS.launchFeeLamports) },
                ...(lamports && lamports > 0n ? [{ k: "Your first buy", v: sol(lamports), tone: "warn" as const }] : []),
              ]}
              note="You also pay the coin's rent and the network fee, about 0.03 SOL. Pawket's sponsor pays for pets, never for coins."
            />
          </Paper>
          <RiskGate agreed={agreed} onAgree={agree} />
          <div>
            <Button
              label="Launch the coin"
              tone="paper"
              disabled={!agreed || lamports === null || sender.busy}
              onClick={() => void launch()}
            />
          </div>
        </Stack>
      )}
    </Card>
  );
}

type Side = "buy" | "sell";

export function TradeTicket({
  guild,
  coin,
  balances,
  sender,
  onDone,
}: {
  guild: CoinDeskProps["guild"];
  coin: CoinState;
  balances: { lamports: bigint; units: bigint } | null;
  sender: PawketSender;
  onDone: () => void;
}) {
  const [side, setSide] = useState<Side>("buy");
  const [amount, setAmount] = useState("");
  const [slippage, setSlippage] = useState(100);
  const [answer, setQuote] = useState<CoinQuote | null>(null);
  const [quoting, setQuoting] = useState(false);
  const [problem, setProblem] = useState<string>();
  const [agreed, agree] = useConsent(coin.mint);
  const [now, setNow] = useState(() => Date.now());
  const asked = useRef(0);
  const decimals = side === "buy" ? SOL : COIN_TERMS.decimals;
  const units = amount.trim() ? parseUnits(amount, decimals) : null;
  const quote =
    answer && answer.side === side && units !== null && answer.amountIn === units.toString() && answer.slippageBps === slippage
      ? answer
      : null;
  const age = quote ? Math.floor((now - quote.quotedAt) / 1000) : 0;
  const stale = age >= QUOTE_SECONDS;
  const route = coin.stage === "damm" ? "Meteora DAMM v2 pool" : "Meteora bonding curve";

  useEffect(() => {
    if (!quote) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [quote]);

  function change(next: () => void) {
    asked.current += 1;
    next();
    setQuote(null);
    setQuoting(false);
    setProblem(undefined);
  }

  async function ask() {
    if (!units) return;
    const ticket = ++asked.current;
    setQuoting(true);
    setProblem(undefined);
    try {
      const response = await fetch(`/api/coins/${guild.slug}/quote?side=${side}&amount=${units}&slippage=${slippage}`, { cache: "no-store" });
      const body = (await response.json()) as CoinQuote & { message?: string };
      if (ticket !== asked.current) return;
      if (!response.ok) throw new Error(body.message ?? "No quote came back. Nothing was sent.");
      setQuote(body);
      setNow(Date.now());
    } catch (error) {
      if (ticket !== asked.current) return;
      setQuote(null);
      setProblem(error instanceof Error ? error.message : "No quote came back. Nothing was sent.");
    } finally {
      if (ticket === asked.current) setQuoting(false);
    }
  }

  async function sign() {
    if (!quote) return;
    const result = await sender.sendFromServer(
      `${quote.side === "buy" ? "Buy" : "Sell"} ${coin.symbol}`,
      `/api/coins/${guild.slug}/trade`,
      { side: quote.side, amount: quote.amountIn, minimumOut: quote.minimumOut },
      { sponsored: false },
    );
    if (result?.outcome === "confirmed") {
      setQuote(null);
      setAmount("");
      onDone();
    }
  }

  const held = balances ? (side === "buy" ? balances.lamports : balances.units) : null;
  const over = units !== null && held !== null && units > held;
  const rows: ReceiptRow[] = quote
    ? [
        { k: "You pay", v: quote.side === "buy" ? sol(quote.amountUsed) : `${formatUnits(quote.amountUsed, COIN_TERMS.decimals, 2)} ${coin.symbol}` },
        ...(BigInt(quote.amountIn) > BigInt(quote.amountUsed)
          ? [{ k: "Comes back", v: quote.side === "buy" ? sol(BigInt(quote.amountIn) - BigInt(quote.amountUsed)) : `${formatUnits(BigInt(quote.amountIn) - BigInt(quote.amountUsed), COIN_TERMS.decimals, 2)} ${coin.symbol}` }]
          : []),
        {
          k: "You get, about",
          v: quote.side === "buy" ? `${formatUnits(quote.amountOut, COIN_TERMS.decimals, 2)} ${coin.symbol}` : sol(quote.amountOut),
        },
        {
          k: "At least",
          v: quote.side === "buy" ? `${formatUnits(quote.minimumOut, COIN_TERMS.decimals, 2)} ${coin.symbol}` : sol(quote.minimumOut),
          tone: "warn",
        },
        { k: "Fee", v: sol(quote.fee, 6) },
        { k: "Moves the price by", v: `${quote.priceImpact.toFixed(2)}%`, ...(quote.priceImpact >= 5 ? { tone: "warn" as const } : {}) },
        { k: "Route", v: route },
      ]
    : [];

  return (
    <Card className="pk-ticket">
      <h2 className="title">Trade {coin.symbol}</h2>
      <Stack gap={4} className="pk-foot">
        <Choice
          label="I want to"
          options={[
            { value: "buy" as const, label: `Buy ${coin.symbol}` },
            { value: "sell" as const, label: `Sell ${coin.symbol}` },
          ]}
          value={side}
          onPick={(next) => change(() => setSide(next))}
        />
        <Field
          label={side === "buy" ? "How much SOL to spend" : `How much ${coin.symbol} to sell`}
          icon={side === "buy" ? "wallet" : "swap"}
          amount
          inputMode="decimal"
          suffix={side === "buy" ? "SOL" : coin.symbol}
          placeholder={side === "buy" ? "SOL to spend, like 0.05" : `${coin.symbol} to sell`}
          value={amount}
          onChange={(event) => change(() => setAmount(event.target.value))}
          error={amount.trim() && units === null ? "An amount above nothing." : over ? "More than your available balance." : undefined}
          helper={
            balances
              ? `Pawket Wallet: ${sol(balances.lamports)} · Your tokens: ${formatUnits(balances.units, COIN_TERMS.decimals, 2)} ${coin.symbol}`
              : "Reading Pawket Wallet and your tokens…"
          }
        />
        <Choice
          label="Accept a price worse by up to"
          options={[
            { value: 50, label: "0.5%" },
            { value: 100, label: "1%" },
            { value: 300, label: "3%" },
          ]}
          value={slippage}
          onPick={(next) => change(() => setSlippage(next))}
        />
        {problem ? <Banner tone="risk" title="No quote" body={problem} /> : null}
        {quote ? (
          <Paper title={stale ? "This quote is old" : `Quoted ${age}s ago`} meta={`${quote.side === "buy" ? "Buy" : "Sell"} · ${coin.symbol}`}>
            <Receipt
              rows={rows}
              note={
                stale
                  ? "Prices move with every trade. Quote again before signing."
                  : "If the price moves past what you accept before Solana records it, the trade fails and only the network fee is spent."
              }
            />
          </Paper>
        ) : null}
        <RiskGate agreed={agreed} onAgree={agree} />
        <Row gap={3} wrap>
          <Button
            label={quote && !stale ? "Quote again" : quoting ? "Quoting…" : "See the quote"}
            tone="quiet"
            disabled={!units || over || quoting || sender.busy}
            onClick={() => void ask()}
          />
          {quote ? (
            <Button
              label={`Sign: ${quote.side === "buy" ? "buy" : "sell"} ${coin.symbol}`}
              tone="paper"
              disabled={stale || !agreed || sender.busy}
              onClick={() => void sign()}
            />
          ) : null}
        </Row>
        <p className="caption pk-faint">Pawket Wallet covers this transaction and its network fee. Unspent SOL and sale proceeds return there. Your external wallet approves; its existing SOL stays untouched.</p>
      </Stack>
    </Card>
  );
}

function GraduatePanel({
  guild,
  cluster,
  sender,
  canSign,
  onConnect,
  onDone,
}: {
  guild: CoinDeskProps["guild"];
  cluster: SolanaCluster;
  sender: PawketSender;
  canSign: boolean;
  onConnect: () => void;
  onDone: () => void;
}) {
  async function graduate() {
    const result = await sender.sendFromServer(
      `Graduate ${guild.name}'s coin`,
      `/api/coins/${guild.slug}/graduate`,
      {},
      { sponsored: false },
    );
    if (result?.outcome === "confirmed") onDone();
  }
  return (
    <Banner
      tone="wait"
      title="Graduating"
      body={
        cluster === "devnet"
          ? "The curve raised its threshold, so it takes no more trades. Graduation moves it into its DAMM v2 pool with the liquidity locked for good. On devnet anyone may do it, paying the pool's rent; what you hold is untouched either way."
          : "The curve raised its threshold, so it takes no more trades. Meteora's keepers move it into its DAMM v2 pool; trading reopens there once Pawket has checked the pool. What you hold is untouched."
      }
      action={
        cluster === "devnet" ? (
          canSign ? (
            <Button label="Graduate it" tone="paper" size="sm" disabled={sender.busy} onClick={() => void graduate()} />
          ) : (
            <Button label="Connect a wallet" tone="quiet" size="sm" icon="wallet" onClick={onConnect} />
          )
        ) : undefined
      }
    />
  );
}

function FounderFees({ guild, coin, sender, onDone }: { guild: CoinDeskProps["guild"]; coin: CoinState; sender: PawketSender; onDone: () => void }) {
  async function claim() {
    const result = await sender.sendFromServer(`Claim ${guild.name}'s coin fees`, `/api/coins/${guild.slug}/claim`, {}, { sponsored: false });
    if (result?.outcome === "confirmed") onDone();
  }
  return (
    <Paper title="Your share of the fees" meta="Founder">
      <Receipt rows={[{ k: "Waiting to be claimed", v: sol(coin.fees.founderUnclaimed, 6) }]} />
      <div style={{ marginTop: "var(--space-3)" }}>
        <Button label="Claim it to this wallet" tone="paper" size="sm" disabled={sender.busy} onClick={() => void claim()} />
      </div>
    </Paper>
  );
}

function PoolFees({
  guild,
  coin,
  owner,
  sender,
  onDone,
}: {
  guild: CoinDeskProps["guild"];
  coin: CoinState;
  owner: Address;
  sender: PawketSender;
  onDone: () => void;
}) {
  const read = useCallback(async () => {
    const response = await fetch(`/api/coins/${guild.slug}/position?account=${owner}`, { cache: "no-store" });
    return response.ok ? ((await response.json()) as { positions: number; feeSol: string; feeCoin: string } | null) : null;
  }, [guild.slug, owner]);
  const fees = useRequest(read);
  if (!fees.data || fees.data.positions === 0) return null;
  const { feeSol, feeCoin } = fees.data;
  const waiting = BigInt(feeSol) > 0n || BigInt(feeCoin) > 0n;

  async function claim() {
    const result = await sender.sendFromServer(
      `Claim ${guild.name}'s pool fees`,
      `/api/coins/${guild.slug}/claim`,
      { from: "pool" },
      { sponsored: false },
    );
    if (result?.outcome === "confirmed") {
      fees.refresh();
      onDone();
    }
  }

  return (
    <Paper title="Your locked liquidity" meta="DAMM v2">
      <Receipt
        rows={[
          { k: "Earned in SOL", v: sol(feeSol, 6) },
          { k: `Earned in ${coin.symbol}`, v: formatUnits(feeCoin, COIN_TERMS.decimals, 2) },
          { k: "The liquidity itself", v: "Locked for good", tone: "ok" },
        ]}
      />
      <div style={{ marginTop: "var(--space-3)" }}>
        <Button label="Claim it to this wallet" tone="paper" size="sm" disabled={!waiting || sender.busy} onClick={() => void claim()} />
      </div>
    </Paper>
  );
}
