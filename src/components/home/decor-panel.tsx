"use client";

import { useState } from "react";
import { NavLink as Link } from "@/components/pk/nav-link";
import { Choice, Icon, type IconName } from "@/components/pk";
import { THEMES } from "@/config/themes";
import { DECOR, MAY_BE_EMPTY, SLOT_LABEL, decorOpen, placeDecor, type DecorSlot, type RoomDecor } from "@/lib/room/decor";
import { useHere } from "@/lib/native/android";
import { DecorArt } from "./decor-art";

const SLOTS: ReadonlyArray<{ value: DecorSlot; label: string; icon: IconName }> = [
  { value: "wall", label: SLOT_LABEL.wall, icon: "frame" },
  { value: "corner", label: SLOT_LABEL.corner, icon: "sprout" },
  { value: "rug", label: SLOT_LABEL.rug, icon: "rug" },
  { value: "bed", label: SLOT_LABEL.bed, icon: "moon" },
  { value: "side", label: SLOT_LABEL.side, icon: "lamp" },
];

const roomName = (id: string) => THEMES.find((theme) => theme.id === id)?.name ?? id;

/**
 * Decorating, under the deck: a place in the room, then what stands there.
 * A tap puts it in the room above at once; nothing is bought here. A thing
 * that comes with a Market room says which, and where to find it.
 */
export function DecorPanel({ shown, owned }: { shown: RoomDecor; owned: ReadonlySet<number> }) {
  const [slot, setSlot] = useState<DecorSlot>("wall");
  const [said, setSaid] = useState<string>();
  const { here } = useHere();
  const pieces = DECOR.filter((piece) => piece.slot === slot);

  function place(id: string | null) {
    setSaid(placeDecor(slot, id) ? undefined : `${here === "this app" ? "This app" : "This browser"} did not keep it, so the room is as it was.`);
  }

  return (
    <div className="pk-decor">
      <Choice label="Place in the room" hideLabel className="pk-decor__slots" options={SLOTS} value={slot} onPick={setSlot} />
      <div className="pk-decor__things" role="group" aria-label={`${SLOT_LABEL[slot]}: what stands there`}>
        {MAY_BE_EMPTY[slot] ? (
          <button type="button" aria-pressed={shown[slot] === null} className="pk-decor__thing" onClick={() => place(null)}>
            <span className="pk-decor__art pk-decor__art--none" aria-hidden="true">
              <Icon name="close" size={22} />
            </span>
            <span className="pk-decor__name">Nothing</span>
          </button>
        ) : null}
        {pieces.map((piece) => {
          const open = decorOpen(piece, owned);
          return (
            <button
              key={piece.id}
              type="button"
              aria-pressed={shown[slot] === piece.id}
              className={open ? "pk-decor__thing" : "pk-decor__thing pk-decor__thing--locked"}
              title={piece.line}
              onClick={() => (open ? place(piece.id) : setSaid(`The ${piece.name.toLowerCase()} comes with the ${roomName(piece.room!)} room, in the Market.`))}
            >
              <span className="pk-decor__art">
                <DecorArt id={piece.id} />
                {open ? null : (
                  <span className="pk-decor__lock">
                    <Icon name="lock" size={13} />
                  </span>
                )}
              </span>
              <span className="pk-decor__name">{piece.name}</span>
              {open ? null : (
                <span className="pk-decor__with">
                  {roomName(piece.room!)}
                  <span className="pk-sr">: comes with this Market room</span>
                </span>
              )}
            </button>
          );
        })}
      </div>
      <p role="status" className="caption pk-faint">
        {said ? (
          <>
            {said}{" "}
            {said.includes("Market") ? <Link href="/market#decor">See the room&apos;s things</Link> : null}
          </>
        ) : (
          `Kept in ${here}. Looks only: nothing here changes a vital, XP or a score.`
        )}
      </p>
    </div>
  );
}
