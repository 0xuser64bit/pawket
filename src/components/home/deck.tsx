"use client";

import { NavLink as Link } from "@/components/pk/nav-link";
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

export type Panel = "say" | "today" | "decor";

/** XP a care just earned, shown once where the thumb is; a new `at` replays it. */
export type Gain = { action: CareActionType; xp: number; at: number };

const TOOLS: Array<{ key: Panel; label: string; icon: IconName }> = [
  { key: "say", label: "Say", icon: "chat" },
  { key: "today", label: "Today", icon: "info" },
  { key: "decor", label: "Decor", icon: "sofa" },
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
      <span className="pk-ring__label" aria-hidden="true">Level</span>
    </span>
  );
}

/** One vital, minimized: its glyph, its name and the number, then five segments across the column. */
function MiniVital({ label, icon, value }: { label: string; icon: IconName; value: number }) {
  const filled = Math.round(value / 20);
  return (
    <span className={["pk-mini", value < 25 && "pk-mini--low"].filter(Boolean).join(" ")} role="img" aria-label={`${label} ${value} / 100`}>
      <span className="pk-mini__head" aria-hidden="true">
        <Icon name={icon} size={14} />
        <span className="pk-mini__label">{label}</span>
        <span className="pk-mini__n">{value}</span>
      </span>
      <span className="pk-mini__track" aria-hidden="true">
        {Array.from({ length: 5 }, (_, i) => (
          <span key={i} className={i < filled ? "pk-mini__seg pk-mini__seg--on" : "pk-mini__seg"} />
        ))}
      </span>
    </span>
  );
}

/**
 * Everything you can do in the room, floating under it: how the pet is
 * (level, the four vitals, the mood in a word), the four cares as round
 * buttons — the one the pet most wants in sun, a resting one counting down
 * inside its face, its name kept beneath — and the tools: say something and
 * today's numbers open a panel below, and how you look opens in your
 * profile. Nothing here sits over the animal.
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
  gain,
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
  gain?: Gain | null;
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
              // Resting or busy, it keeps focus (aria-disabled, not disabled): the countdown is read in place.
              aria-disabled={left > 0 || busy || undefined}
              aria-label={left > 0 ? `${label}, resting for ${formatCountdown(left)}` : label}
              onClick={() => {
                if (left <= 0 && !busy) onCare(action);
              }}
            >
              <span className="pk-care__face">
                {left > 0 ? (
                  <span className="pk-care__wait" aria-hidden="true">{formatCountdown(left)}</span>
                ) : (
                  <Icon name={CARE_ICON[action]} size={22} />
                )}
              </span>
              <span className="pk-care__label">{label}</span>
              {gain && gain.action === action && gain.xp > 0 ? (
                <span key={gain.at} className="pk-care__gain" aria-hidden="true">
                  +{gain.xp} XP
                </span>
              ) : null}
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
