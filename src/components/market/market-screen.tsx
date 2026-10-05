"use client";

import { useCallback, useState } from "react";
import { useConnectedWallet } from "@solana/kit-plugin-wallet/react";
import { useRequest } from "@solana/react";
import type { Address } from "@solana/kit";
import { Button, ItemTile, PetArt, Receipt, SectionLabel, Sheet, Stack, WearableArt, setTheme, useThemeChoice } from "@/components/pk";
import { WalletSheet } from "@/components/wallet/wallet-sheet";
import { AddressLine } from "@/components/wallet/address";
import { getPublicEnv } from "@/config/env";
import { THEMES, roomItem, type ThemeId } from "@/config/themes";
import { MARKET_WEARABLES, wearableItem } from "@/lib/closet/catalog";
import { useCompanion } from "@/lib/companion/use-companion";
import { petLook } from "@/lib/game/appearance";
import { projectGuestPet } from "@/lib/guest/pet";
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
 * everyone. The shelves are the screen; a tap on anything opens it as a
 * sheet — your own pet wearing it, or sitting in the room — with its price
 * and where the SOL goes, on Paper, and one button. A purchase is one signed
 * transaction: the price from the buyer's wallet straight to Pawket's
 * treasury, the item into their closet on Solana for good. Pawket's sponsor
 * pays the network fee and the closet's rent. Nothing here changes a vital,
 * XP, a cooldown or a score, and nothing is resold.
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
  line: "For any of your pets on Solana. Looks only.",
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
  const choice = useThemeChoice();
  const [picked, setPicked] = useState<Item | null>(null);
  const owned = new Set(closet.data?.items ?? []);

  const tile = (item: Item) => {
    const has = owned.has(item.id);
    return (
      <button key={item.id} type="button" className="pk-tile-hit" aria-haspopup="dialog" onClick={() => setPicked(item)}>
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
    <Stack gap={6}>
      <Stack gap={3}>
        <SectionLabel count={`${MARKET.wearables}`}>For your pets</SectionLabel>
        <div className="pk-tiles">{PIECES.map(tile)}</div>
      </Stack>
      <Stack gap={3}>
        <SectionLabel count={`${MARKET.rooms}`}>Rooms</SectionLabel>
        <div className="pk-tiles">{ROOMS.map(tile)}</div>
      </Stack>

      <details className="pk-fold">
        <summary>
          <span className="title">Where the SOL goes</span>
          <span className="caption pk-faint">Prices fixed in Pawket&apos;s program, the same for everyone</span>
        </summary>
        <Stack gap={3}>
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
          <p className="body-sm pk-muted">
            Every sale goes from the buyer&apos;s wallet straight to the treasury; only an upgrade of the program changes a
            price. The treasury pays the network fees Pawket covers for everyone&apos;s pets.
          </p>
        </Stack>
      </details>

      {picked ? (
        <ItemSheet
          item={picked}
          owner={owner}
          canSign={Boolean(connected?.signer)}
          has={owned.has(picked.id)}
          onBought={closet.refresh}
          onDismiss={() => setPicked(null)}
        />
      ) : null}
    </Stack>
  );
}

/** One thing in the Market, as a sheet: drawn on your own pet or as the room, its price on Paper, one button. */
function ItemSheet({
  item,
  owner,
  canSign,
  has,
  onBought,
  onDismiss,
}: {
  item: Item;
  owner: Address | null;
  canSign: boolean;
  has: boolean;
  onBought: () => void;
  onDismiss: () => void;
}) {
  const cluster = getPublicEnv().solanaCluster;
  const sender = usePawketSend();
  const sponsor = useSponsor();
  const { pet } = useCompanion();
  const [connecting, setConnecting] = useState(false);
  const readBalance = useCallback(async () => (await rpc.getBalance(owner!, { commitment: "confirmed" }).send()).value, [owner]);
  const balance = useRequest(owner ? readBalance : null);
  const price = marketPrice(item.id)!;
  const short = owner !== null && balance.data !== undefined && balance.data < price;
  // Your own pet, wearing it — or in the room — before anything is signed.
  const look = pet ? petLook(pet, projectGuestPet(pet).mood) : ({ form: "cat", temper: "curious", feeling: "happy", wearing: null, seed: item.name } as const);

  async function buy() {
    if (!owner) return;
    const address = (await deriveClosetPda(owner)).address;
    const result = await sender.send(`Buy the ${item.name.toLowerCase()}`, ({ owner: signer, payer }) => [
      getBuyInstruction({ owner: signer, payer, closet: address, item: item.id }),
    ]);
    if (result?.outcome === "confirmed") {
      onBought();
      balance.refresh();
    }
  }

  if (connecting) {
    return <WalletSheet why="Connect the wallet that pays. It signs each purchase; nothing else is asked of it." onDismiss={() => setConnecting(false)} />;
  }

  return (
    <Sheet
      title={item.name}
      meta={has ? "In your closet" : "Fixed price"}
      onDismiss={onDismiss}
      foot={
        <div className="pk-spread">
          <Button tone="ghost" size="sm" label={has ? "Done" : "Not now"} onClick={onDismiss} />
          {!owner ? (
            <Button label="Connect a wallet" icon="wallet" tone="paper" onClick={() => setConnecting(true)} />
          ) : has ? (
            item.room ? (
              <Button label={`Live in ${item.name}`} tone="paper" onClick={() => setTheme(item.room!)} />
            ) : null
          ) : (
            <Button label={`Buy for ${sol(price)}`} tone="paper" disabled={sender.busy || !canSign || short} onClick={() => void buy()} />
          )}
        </div>
      }
    >
      <Stack gap={4}>
        <div className="pk-market-try" data-theme-preview={item.room} aria-hidden="true">
          <PetArt {...look} wearing={item.piece ?? look.wearing} pose="full" />
        </div>
        <div>
          <h2 className="title">{item.name}</h2>
          <p className="body-sm pk-muted" style={{ marginTop: "var(--space-1)" }}>
            {item.kind === "room" ? `${item.line} For every device of this wallet, once bought.` : item.line}
            {pet && item.piece ? ` That is ${pet.name}, trying it on.` : ""}
          </p>
        </div>
        <Receipt
          rows={[
            { k: "Price", v: sol(price), tone: "warn" },
            { k: "Goes to", v: "Pawket's treasury" },
            { k: "Network fee", v: sponsor.data?.available ? "Paid by Pawket" : "A little devnet SOL" },
            { k: "Your closet's rent", v: sponsor.data?.available ? "Paid by Pawket, the first time" : "A little devnet SOL, the first time" },
          ]}
          note="Looks only: it changes no vital, XP, cooldown or score. It stays in your closet on Solana; Pawket does not buy it back."
        />
        {has && item.piece ? <p className="body-sm pk-muted">Yours. Put it on from the wardrobe in Profile.</p> : null}
        {short ? (
          <p role="alert" className="body-sm" style={{ color: "var(--alarm-text)" }}>
            This wallet holds {sol(balance.data!)}. {cluster === "devnet" ? "Devnet SOL is free at faucet.solana.com." : ""} Nothing was sent.
          </p>
        ) : null}
      </Stack>
    </Sheet>
  );
}
