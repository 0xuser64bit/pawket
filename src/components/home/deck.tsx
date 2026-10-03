"use client";

import Link from "next/link";
import { Icon, type IconName } from "@/components/pk";
import { CARE_ACTION_LABEL, MOOD_LABEL } from "@/lib/game/appearance";
import { CareActionType, type PetMood, type PetStats } from "@/lib/game/enums";
import { formatCountdown } from "@/lib/utils/format";

export const CARE_ICON: Record<CareActionType, IconName> = {
  [CareActionType.Feed]: "bowl",
  [CareActionType.Play]: "ball",
  [CareActionType.Groom]: "heart",
  [CareActionType.Rest]: "moon",
};

const VITALS: Array<{ key: keyof PetStats; label: string; icon: IconName }> = [
  { key: "hunger", label: "Fullness", icon: "bowl" },
  { key: "happiness", label: "Happiness", icon: "heart" },
  { key: "energy", label: "Energy", icon: "bolt" },
  { key: "hygiene", label: "Coat", icon: "spark" },
];

export type Panel = "say" | "today";

const TOOLS: Array<{ key: Panel; label: string; icon: IconName }> = [
  { key: "say", label: "Say", icon: "chat" },
  { key: "today", label: "Today", icon: "info" },
];

/**
 * Level as a ring of ten segments, the number inside: countable, like every
 * meter in Pawket, and small enough to sit beside the care buttons.
 */
function LevelRing({ level, into, of }: { level: number; into: number; of: number }) {
  const filled = Math.floor((into / of) * 10);
  const r = 19;
  const c = 2 * Math.PI * r;
  const seg = c / 10;
  return (
    <span className="pk-ring" role="img" aria-label={`Level ${level}, ${into} / ${of} XP`}>
      <svg viewBox="0 0 48 48" aria-hidden="true">
        {Array.from({ length: 10 }, (_, i) => (
          <circle
            key={i}
            cx="24"
            cy="24"
            r={r}
            className={i < filled ? "pk-ring__seg pk-ring__seg--on" : "pk-ring__seg"}
            strokeDasharray={`${seg - 3} ${c - seg + 3}`}
            strokeDashoffset={-i * seg}
            transform="rotate(-90 24 24)"
          />
        ))}
      </svg>
      <span className="pk-ring__n">{level}</span>
    </span>
  );
}

/** One vital, minimized: its glyph, five segments and the number. */
function MiniVital({ label, icon, value }: { label: string; icon: IconName; value: number }) {
  const filled = Math.round(value / 20);
  return (
    <span className={["pk-mini", value < 25 && "pk-mini--low"].filter(Boolean).join(" ")} role="img" aria-label={`${label} ${value} / 100`}>
      <Icon name={icon} size={14} />
      <span className="pk-mini__track" aria-hidden="true">
        {Array.from({ length: 5 }, (_, i) => (
          <span key={i} className={i < filled ? "pk-mini__seg pk-mini__seg--on" : "pk-mini__seg"} />
        ))}
      </span>
      <span className="pk-mini__n" aria-hidden="true">
        {value}
      </span>
    </span>
  );
}

/**
 * Everything you can do in the room, floating under it: how the pet is
 * (level, the four vitals, the mood in a word), the four cares as round
 * buttons — the one the pet most wants in sun, a resting one counting down
 * — and the tools: say something and today's numbers open a panel below,
 * and how you look opens in your profile. Nothing here sits over the animal.
 */
export function Deck({
  name,
  mood,
  level,
  xpInto,
  xpOf,
  stats,
  cooldowns,
  wanted,
  busy,
  streak,
  panel,
  onCare,
  onPanel,
  onSnap,
}: {
  name: string;
  mood: PetMood;
  level: number;
  xpInto: number;
  xpOf: number;
  stats: PetStats;
  cooldowns: Record<CareActionType, number>;
  wanted: CareActionType | null;
  busy: boolean;
  streak: number;
  panel: Panel | null;
  onCare: (action: CareActionType) => void;
  onPanel: (panel: Panel | null) => void;
  /** Take a photo of the room; absent where the room cannot be photographed (the flat room). */
  onSnap?: () => void;
}) {
  return (
    <section className="pk-deck" aria-label={`With ${name}`}>
      <div className="pk-deck__status">
        <LevelRing level={level} into={xpInto} of={xpOf} />
        <div className="pk-deck__who">
          <span className="pk-deck__mood">
            <span className="title">{MOOD_LABEL[mood]}</span>
            <span className="amount-sm pk-faint">
              {xpInto} / {xpOf} XP
            </span>
            {streak > 0 ? (
              <span className="pk-deck__streak caption">
                <Icon name="spark" size={12} />
                {streak} {streak === 1 ? "day" : "days"}
              </span>
            ) : null}
          </span>
          <span className="pk-deck__vitals">
            {VITALS.map((vital) => (
              <MiniVital key={vital.key} label={vital.label} icon={vital.icon} value={stats[vital.key]} />
            ))}
          </span>
        </div>
      </div>

      <div className="pk-deck__care" role="group" aria-label={`Care for ${name}`}>
        {(Object.keys(CARE_ICON) as CareActionType[]).map((action) => {
          const left = cooldowns[action];
          const label = CARE_ACTION_LABEL[action];
          return (
            <button
              key={action}
              type="button"
              className={["pk-care", action === wanted && "pk-care--wanted"].filter(Boolean).join(" ")}
              disabled={left > 0 || busy}
              aria-label={left > 0 ? `${label}, resting for ${formatCountdown(left)}` : label}
              onClick={() => onCare(action)}
            >
              <span className="pk-care__face">
                <Icon name={CARE_ICON[action]} size={20} />
              </span>
              <span className={left > 0 ? "pk-care__label pk-care__label--wait" : "pk-care__label"}>
                {left > 0 ? formatCountdown(left) : label}
              </span>
            </button>
          );
        })}
      </div>

      <div className="pk-deck__tools" role="group" aria-label="More">
        {TOOLS.map((tool) => {
          const on = panel === tool.key;
          return (
            <button
              key={tool.key}
              type="button"
              className="pk-tool"
              aria-expanded={on}
              aria-controls="pk-deck-panel"
              onClick={() => onPanel(on ? null : tool.key)}
            >
              <Icon name={tool.icon} size={18} />
              <span>{tool.label}</span>
            </button>
          );
        })}
        {onSnap ? (
          <button type="button" className="pk-tool" onClick={onSnap}>
            <Icon name="camera" size={18} />
            <span>Photo</span>
          </button>
        ) : null}
        <Link href="/profile#look" className="pk-tool">
          <Icon name="person" size={18} />
          <span>Look</span>
        </Link>
      </div>
    </section>
  );
}
