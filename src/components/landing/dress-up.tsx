"use client";

import { useState } from "react";
import { Icon, PetArt, WearableArt } from "@/components/pk";
import { wearableItem } from "@/lib/closet/catalog";
import { marketPrice } from "@/lib/solana/instructions";
import { formatUnits } from "@/lib/utils/format";

const PIECES = [
  { id: "paper-crown", name: "Paper crown" },
  { id: "wool-scarf", name: "Wool scarf" },
  { id: "star-pin", name: "Star pin" },
  { id: "halo", name: "Halo" },
  { id: "wizard-hat", name: "Wizard hat" },
] as const;

function priceLabel(id: string) {
  const price = marketPrice(wearableItem(id));
  return price === null ? "Free" : `${formatUnits(price, 9, 3)} SOL`;
}

export function DressUp() {
  const [worn, setWorn] = useState<string | null>("paper-crown");
  const piece = PIECES.find((choice) => choice.id === worn);
  return (
    <div className="pk-dressup">
      <div className="pk-dressup__mirror">
        <span className="pk-dressup__shine" aria-hidden="true" />
        <div className="pk-dressup__pet" key={worn ?? "bare"}>
          <PetArt form="bun" temper="cozy" feeling="happy" wearing={worn} pose="full" seed="Clover" />
        </div>
        <span className="pk-dressup__plaque">Clover</span>
      </div>
      <div className="pk-dressup__panel">
        <p className="label">The mirror</p>
        <p className="body-sm pk-muted">
          Tap a piece to try it on. One at a time; tap it again to take it off.
        </p>
        <div className="pk-dressup__picks" role="group" aria-label="Try a piece on Clover">
          {PIECES.map((choice) => {
            const on = choice.id === worn;
            return (
              <button
                key={choice.id}
                type="button"
                className="pk-dressup__pick"
                aria-pressed={on}
                onClick={() => setWorn(on ? null : choice.id)}
              >
                <span className="pk-dressup__art" aria-hidden="true">
                  <WearableArt id={choice.id} />
                </span>
                <span className="pk-dressup__name">{choice.name}</span>
                <span className="pk-dressup__price">{priceLabel(choice.id)}</span>
              </button>
            );
          })}
        </div>
        <p className="body-sm pk-dressup__status" aria-live="polite">
          {piece ? `Clover is trying on the ${piece.name.toLowerCase()}.` : "Clover is just in their coat."}
        </p>
        <p className="body-sm pk-faint pk-dressup__note">
          <Icon name="spark" size={14} />
          Trying on is free. Buying is a separate step in the Market, at the price on the tag.
        </p>
      </div>
    </div>
  );
}
