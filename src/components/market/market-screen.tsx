"use client";

import { useCallback, useState } from "react";
import { useConnectedWallet } from "@solana/kit-plugin-wallet/react";
import { useRequest } from "@solana/react";
import type { Address } from "@solana/kit";
import { Banner, Button, Card, ItemTile, Paper, PetArt, Receipt, Row, SectionLabel, Stack, WearableArt, setTheme, useThemeChoice } from "@/components/pk";
import { WalletSheet } from "@/components/wallet/wallet-sheet";
import { AddressLine } from "@/components/wallet/address";
import { getPublicEnv } from "@/config/env";
import { THEMES, roomItem, type ThemeId } from "@/config/themes";
import { MARKET_WEARABLES, wearableItem } from "@/lib/closet/catalog";
import { useCloset } from "@/lib/market/use-closet";
import { rpc, wallet } from "@/lib/solana/browser-client";
import { explorerAddressUrl } from "@/lib/solana/cluster";
import { getBuyInstruction, marketPrice } from "@/lib/solana/instructions";
import { deriveClosetPda } from "@/lib/solana/pda";
import { MARKET } from "@/lib/solana/program";
import { usePawketSend, useSponsor } from "@/lib/solana/use-send";
import { formatUnits } from "@/lib/utils/format";

/**
 * The Market: looks for SOL, at the prices Pawket's program fixes for
 * everyone. A purchase is one signed transaction — the price from the
 * buyer's wallet straight to Pawket's treasury, and the item into their
 * closet on Solana for good. Pawket's sponsor pays the network fee and the
 * closet's rent; the buyer pays only the price. Nothing here changes a
 * vital, XP, a cooldown or a score, and nothing is resold.
 */

interface Item {
  id: number;
  name: string;
  line: string;
  kind: "piece" | "room";
  art: React.ReactNode;
  /** The catalog id of a piece, to try it on. */
  piece?: string;
  room?: ThemeId;
}

const PIECES: Item[] = MARKET_WEARABLES.map((piece) => ({
  id: wearableItem(piece.id),
  name: piece.name,
  line: "For any of your pets on Solana.",
  kind: "piece",
  piece: piece.id,
  art: <WearableArt id={piece.id} className="pk-tile__piece" />,
}));

const ROOMS: Item[] = THEMES.filter((theme) => roomItem(theme.id) !== null).map((theme) => ({
  id: roomItem(theme.id)!,
  name: theme.name,
  line: theme.line,
  kind: "room",
  room: theme.id,
  art: <span className="pk-market-room" data-theme-preview={theme.id} aria-hidden="true" />,
}));

const sol = (lamports: bigint | string) => `${formatUnits(lamports, 9, 4)} SOL`;

export function MarketScreen() {
  const cluster = getPublicEnv().solanaCluster;
  const connected = useConnectedWallet(wallet);
  const owner = (connected?.account.address as Address | undefined) ?? null;
  const closet = useCloset(owner);
  const sender = usePawketSend();
  const sponsor = useSponsor();
  const choice = useThemeChoice();
  const [picked, setPicked] = useState<Item | null>(null);
  const [connecting, setConnecting] = useState(false);
  const readBalance = useCallback(async () => (await rpc.getBalance(owner!, { commitment: "confirmed" }).send()).value, [owner]);
  const balance = useRequest(owner ? readBalance : null);
  const owned = new Set(closet.data?.items ?? []);
  const price = picked ? marketPrice(picked.id)! : null;
  const short = price !== null && balance.data !== undefined && owner !== null && balance.data < price;

  async function buy(item: Item) {
    if (!owner) return;
    const address = (await deriveClosetPda(owner)).address;
    const result = await sender.send(`Buy the ${item.name.toLowerCase()}`, ({ owner: signer, payer }) => [
      getBuyInstruction({ owner: signer, payer, closet: address, item: item.id }),
    ]);
    if (result?.outcome === "confirmed") {
      closet.refresh();
      balance.refresh();
    }
  }

  const tile = (item: Item) => {
    const has = owned.has(item.id);
    return (
      <button
        key={item.id}
        type="button"
        className="pk-tile-hit"
        aria-pressed={picked?.id === item.id}
        onClick={() => setPicked(item)}
      >
        <ItemTile
          name={item.name}
          kind={has ? "In your closet" : item.kind === "room" ? "Room" : "Piece"}
          rarity="foil"
          price={has ? undefined : sol(marketPrice(item.id)!)}
          art={item.art}
          equipped={has && item.room === choice}
        />
      </button>
    );
  };

  return (
    <Stack gap={5}>
      {cluster === "devnet" ? (
        <Banner
          tone="info"
          title="Devnet SOL"
          body="Prices are in devnet SOL, which is free from a faucet. Everything else works as it will on mainnet."
        />
      ) : null}

      <Stack gap={3}>
        <SectionLabel count={`${MARKET.wearables}`}>For your pets</SectionLabel>
        <div className="pk-tiles">{PIECES.map(tile)}</div>
      </Stack>
      <Stack gap={3}>
        <SectionLabel count={`${MARKET.rooms}`}>Rooms</SectionLabel>
        <div className="pk-tiles">{ROOMS.map(tile)}</div>
      </Stack>

      {picked ? (
        <Paper title={picked.name} meta={owned.has(picked.id) ? "In your closet" : "Fixed price"}>
          {/* What it looks like, before anything is signed: a pet wearing the piece, or the room itself. */}
          <div className="pk-market-try" data-theme-preview={picked.room} aria-hidden="true">
            <PetArt form="cat" temper="curious" feeling="happy" pose="full" wearing={picked.piece} seed={picked.name} />
          </div>
          <Receipt
            rows={[
              { k: "What it is", v: picked.kind === "room" ? "A room, for every device of this wallet" : "A piece, for any of your pets on Solana" },
              { k: "Price", v: sol(price!), tone: "warn" },
              { k: "Goes to", v: "Pawket's treasury" },
              { k: "Network fee", v: sponsor.data?.available ? "Paid by Pawket" : "A little devnet SOL" },
              { k: "Your closet's rent", v: sponsor.data?.available ? "Paid by Pawket, the first time" : "A little devnet SOL, the first time" },
            ]}
            note="Looks only: it changes no vital, XP, cooldown or score. It stays in your closet on Solana; Pawket does not buy it back."
          />
          <Row gap={3} wrap style={{ marginTop: "var(--space-4)" }}>
            {!owner ? (
              <Button label="Connect a wallet" tone="paper" onClick={() => setConnecting(true)} />
            ) : owned.has(picked.id) ? (
              picked.room ? (
                <Button label={`Live in ${picked.name}`} tone="paper" onClick={() => setTheme(picked.room!)} />
              ) : (
                <span className="body-sm pk-muted">Wear it from the wardrobe in Profile.</span>
              )
            ) : (
              <Button
                label={`Buy for ${sol(price!)}`}
                tone="paper"
                disabled={sender.busy || !connected?.signer || short}
                onClick={() => void buy(picked)}
              />
            )}
          </Row>
          {short ? (
            <p className="body-sm" style={{ marginTop: "var(--space-3)", color: "var(--alarm-text)" }}>
              This wallet holds {sol(balance.data!)}. {cluster === "devnet" ? "Devnet SOL is free at faucet.solana.com." : ""} Nothing was
              sent.
            </p>
          ) : null}
        </Paper>
      ) : (
        <Card variant="quiet">
          <p className="body-sm pk-muted">Choose a piece or a room to see its price and what it does.</p>
        </Card>
      )}


      <Paper title="Where the SOL goes" meta={`Solana ${cluster}`}>
        <div className="pk-receipt">
          <div className="pk-receipt__row">
            <span className="pk-receipt__k">Pawket&apos;s treasury</span>
            <AddressLine value={MARKET.treasury} label="treasury" href={explorerAddressUrl(MARKET.treasury, cluster)} />
          </div>
          {closet.data ? (
            <>
              <div className="pk-receipt__row">
                <span className="pk-receipt__k">In your closet</span>
                <span className="pk-receipt__v">{closet.data.count}</span>
              </div>
              <div className="pk-receipt__row">
                <span className="pk-receipt__k">You have paid in</span>
                <span className="pk-receipt__v">{sol(closet.data.spent)}</span>
              </div>
            </>
          ) : null}
        </div>
        <p className="body-sm pk-muted" style={{ marginTop: "var(--space-3)" }}>
          Prices are fixed in Pawket&apos;s program, the same for everyone; only an upgrade of the program changes
          them. The treasury pays the network fees Pawket covers for everyone&apos;s pets.
        </p>
      </Paper>

      {connecting ? (
        <WalletSheet why="Connect the wallet that pays. It signs each purchase; nothing else is asked of it." onDismiss={() => setConnecting(false)} />
      ) : null}
    </Stack>
  );
}
