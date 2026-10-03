"use client";

import { useId, useRef, useState, type KeyboardEvent } from "react";
import { Button, Card, Row, Stack } from "@/components/pk";
import { clothHex } from "@/components/room3d/palette";
import {
  BODIES,
  BOTTOMS,
  CLOTH_COLOURS,
  HAIR_COLOURS,
  HAIRSTYLES,
  LOOK_LABEL,
  SHOES,
  SKIN_TONES,
  TOPS,
  withLook,
  type PlayerLook,
} from "@/lib/player/look";
import { OUTFIT_SLOTS, saveProfile, usePlayerProfile, withOutfit } from "@/lib/player/profile";
import { saveLook } from "@/lib/player/storage";

/**
 * One choice from a short list, as a radio group: arrow keys move the
 * choice, Tab leaves the group, and the room changes as you go.
 */
function Choice<T extends string | number>({
  label,
  options,
  value,
  onPick,
  swatch,
}: {
  label: string;
  options: ReadonlyArray<{ value: T; label: string }>;
  value: T;
  onPick: (value: T) => void;
  /** Draw each option as a colour dot instead of a word. */
  swatch?: (value: T) => string;
}) {
  const refs = useRef<Array<HTMLButtonElement | null>>([]);
  const id = useId();
  function onKeyDown(event: KeyboardEvent, index: number) {
    const step = event.key === "ArrowRight" || event.key === "ArrowDown" ? 1 : event.key === "ArrowLeft" || event.key === "ArrowUp" ? -1 : 0;
    if (!step) return;
    event.preventDefault();
    const next = (index + step + options.length) % options.length;
    onPick(options[next].value);
    refs.current[next]?.focus();
  }
  return (
    <div className="pk-look__row">
      <span className="label pk-faint" id={id}>
        {label}
      </span>
      <div role="radiogroup" aria-labelledby={id} className="pk-choices">
        {options.map((option, index) => {
          const on = option.value === value;
          return (
            <button
              key={String(option.value)}
              ref={(el) => {
                refs.current[index] = el;
              }}
              type="button"
              role="radio"
              aria-checked={on}
              aria-label={swatch ? option.label : undefined}
              title={swatch ? option.label : undefined}
              tabIndex={on ? 0 : -1}
              className={swatch ? "pk-swatch" : "pk-choice"}
              style={swatch ? { background: swatch(option.value) } : undefined}
              onClick={() => onPick(option.value)}
              onKeyDown={(event) => onKeyDown(event, index)}
            >
              {swatch ? null : option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

const words = <T extends string>(values: readonly T[], names: Record<T, string>) =>
  values.map((value) => ({ value, label: names[value] }));

const cloth = words(CLOTH_COLOURS, LOOK_LABEL.cloth);

const PARTS = [
  { key: "body", label: "Body" },
  { key: "hair", label: "Hair" },
  { key: "clothes", label: "Clothes" },
  { key: "shoes", label: "Shoes" },
] as const;

/** A look in a sentence, for a summary line. */
export function lookSummary(look: PlayerLook): string {
  return [
    look.hair === "none" ? "Shaved" : `${LOOK_LABEL.hairColour[look.hairColour]} ${LOOK_LABEL.hair[look.hair].toLowerCase()}`,
    `${LOOK_LABEL.cloth[look.topColour].toLowerCase()} ${LOOK_LABEL.top[look.top].toLowerCase()}`,
    `${LOOK_LABEL.cloth[look.bottomColour].toLowerCase()} ${LOOK_LABEL.bottom[look.bottom].toLowerCase()}`,
    look.shoes === "none" ? "barefoot" : `${LOOK_LABEL.cloth[look.shoeColour].toLowerCase()} ${LOOK_LABEL.shoes[look.shoes].toLowerCase()}`,
  ].join(", ");
}

/** An outfit, drawn as the colours it is made of. */
function OutfitDots({ look }: { look: PlayerLook }) {
  const dots = [
    HAIR_COLOURS[look.hairColour],
    clothHex(look.topColour),
    clothHex(look.bottomColour),
    look.shoes === "none" ? SKIN_TONES[look.skin] : clothHex(look.shoeColour),
  ];
  return (
    <span className="pk-outfit__dots" aria-hidden="true">
      {dots.map((colour, i) => (
        <span key={i} className="pk-outfit__dot" style={{ background: colour }} />
      ))}
    </span>
  );
}

const SAVE_FAILED = "This browser did not store that. Your look is as it was.";

/**
 * How the player looks in the room, in full: the four parts as tabs, three
 * outfits to keep and put back on, and a surprise. Saved on this device;
 * like the pet's wardrobe it is expression only. The room above it changes
 * as you go.
 */
export function LookEditor({ look, shown }: { look: PlayerLook; shown: boolean }) {
  const [part, setPart] = useState<(typeof PARTS)[number]["key"]>("body");
  const [notice, setNotice] = useState<string>();
  const profile = usePlayerProfile();
  const tabsId = useId();

  function set<K extends Exclude<keyof PlayerLook, "version">>(key: K, value: PlayerLook[K]) {
    const next = withLook(look, key, value);
    if (next === look) return;
    setNotice(saveLook(next) ? undefined : SAVE_FAILED);
  }

  function surprise() {
    const pick = <T,>(values: readonly T[]) => values[Math.floor(Math.random() * values.length)];
    const next: PlayerLook = {
      ...look,
      hair: pick(HAIRSTYLES),
      hairColour: pick(Object.keys(HAIR_COLOURS) as Array<keyof typeof HAIR_COLOURS>),
      top: pick(TOPS),
      topColour: pick(CLOTH_COLOURS),
      bottom: pick(BOTTOMS),
      bottomColour: pick(CLOTH_COLOURS),
      shoes: pick(SHOES.filter((s) => s !== "none")),
      shoeColour: pick(CLOTH_COLOURS),
    };
    setNotice(saveLook(next) ? undefined : SAVE_FAILED);
  }

  function keep(slot: number) {
    setNotice(saveProfile(withOutfit(profile, slot, look)) ? `Kept as outfit ${slot + 1}.` : SAVE_FAILED);
  }

  function wear(slot: number) {
    const outfit = profile.outfits[slot];
    if (outfit) setNotice(saveLook(outfit) ? `Wearing outfit ${slot + 1}.` : SAVE_FAILED);
  }

  return (
    <Card>
      <div className="pk-spread">
        <h2 className="title">How you look</h2>
        <Button label="Surprise me" icon="spark" tone="quiet" size="sm" onClick={surprise} />
      </div>
      <p className="body-sm pk-muted" style={{ marginTop: "var(--space-2)" }}>
        {lookSummary(look)}.{" "}
        {shown
          ? "Saved on this device. It changes how you look, nothing else."
          : "You wear it in the 3D room; the flat room shows your top colour."}
      </p>
      <div className="pk-look">
        {/* Four facets, one at a time, so the room stays in view above. */}
        <div role="tablist" aria-label="Parts of your look" className="pk-look__tabs">
          {PARTS.map((p) => (
            <button
              key={p.key}
              type="button"
              role="tab"
              id={`${tabsId}-${p.key}`}
              aria-selected={part === p.key}
              aria-controls={`${tabsId}-panel`}
              className="pk-choice"
              data-tab
              onClick={() => setPart(p.key)}
            >
              {p.label}
            </button>
          ))}
        </div>
        <div role="tabpanel" id={`${tabsId}-panel`} aria-labelledby={`${tabsId}-${part}`} className="pk-stack pk-look__panel" style={{ gap: "var(--space-4)" }}>
          {part === "body" ? (
            <>
              <Choice label="Build" options={words(BODIES, LOOK_LABEL.body)} value={look.body} onPick={(v) => set("body", v)} />
              <Choice
                label="Skin"
                options={SKIN_TONES.map((_, i) => ({ value: i, label: LOOK_LABEL.skin[i] }))}
                value={look.skin}
                onPick={(v) => set("skin", v)}
                swatch={(i) => SKIN_TONES[i]}
              />
            </>
          ) : null}
          {part === "hair" ? (
            <>
              <Choice label="Style" options={words(HAIRSTYLES, LOOK_LABEL.hair)} value={look.hair} onPick={(v) => set("hair", v)} />
              <Choice
                label="Colour"
                options={words(Object.keys(HAIR_COLOURS) as Array<keyof typeof HAIR_COLOURS>, LOOK_LABEL.hairColour)}
                value={look.hairColour}
                onPick={(v) => set("hairColour", v)}
                swatch={(v) => HAIR_COLOURS[v]}
              />
              <Choice
                label="Beard"
                options={[
                  { value: "no", label: "None" },
                  { value: "yes", label: "Beard" },
                ]}
                value={look.beard ? "yes" : "no"}
                onPick={(v) => set("beard", v === "yes")}
              />
            </>
          ) : null}
          {part === "clothes" ? (
            <>
              <Choice label="Top" options={words(TOPS, LOOK_LABEL.top)} value={look.top} onPick={(v) => set("top", v)} />
              <Choice label="Top colour" options={cloth} value={look.topColour} onPick={(v) => set("topColour", v)} swatch={clothHex} />
              <Choice label="Bottoms" options={words(BOTTOMS, LOOK_LABEL.bottom)} value={look.bottom} onPick={(v) => set("bottom", v)} />
              <Choice label="Bottoms colour" options={cloth} value={look.bottomColour} onPick={(v) => set("bottomColour", v)} swatch={clothHex} />
            </>
          ) : null}
          {part === "shoes" ? (
            <>
              <Choice label="Shoes" options={words(SHOES, LOOK_LABEL.shoes)} value={look.shoes} onPick={(v) => set("shoes", v)} />
              {look.shoes === "none" ? null : (
                <Choice label="Shoe colour" options={cloth} value={look.shoeColour} onPick={(v) => set("shoeColour", v)} swatch={clothHex} />
              )}
            </>
          ) : null}
        </div>
      </div>

      <Stack gap={3} style={{ marginTop: "var(--space-6)" }}>
        <div className="pk-spread">
          <span className="label pk-faint">Outfits</span>
          <span className="caption pk-faint">Three, on this device</span>
        </div>
        <div className="pk-outfits">
          {Array.from({ length: OUTFIT_SLOTS }, (_, slot) => {
            const outfit = profile.outfits[slot];
            return (
              <div key={slot} className={outfit ? "pk-outfit" : "pk-outfit pk-outfit--empty"}>
                <div className="pk-spread">
                  <span className="title">Outfit {slot + 1}</span>
                  {outfit ? <OutfitDots look={outfit} /> : null}
                </div>
                <p className="caption pk-faint">{outfit ? lookSummary(outfit) : "Empty. Keep the look you have on here."}</p>
                <Row gap={2} wrap>
                  {outfit ? <Button label="Wear" tone="quiet" size="sm" onClick={() => wear(slot)} /> : null}
                  <Button label={outfit ? "Replace" : "Keep this look"} tone={outfit ? "ghost" : "quiet"} size="sm" onClick={() => keep(slot)} />
                </Row>
              </div>
            );
          })}
        </div>
      </Stack>
      <p role="status" className="body-sm" style={{ color: notice === SAVE_FAILED ? "var(--alarm-text)" : "var(--ink-soft)", marginTop: notice ? "var(--space-3)" : 0 }}>
        {notice}
      </p>
    </Card>
  );
}
