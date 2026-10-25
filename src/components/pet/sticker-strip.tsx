import { Card, Icon } from "@/components/pk";
import { BADGES, badgesFor, type BadgeContext, type BadgeRecord } from "@/lib/game/badges";

export function StickerStrip({ name, record, context }: { name: string; record: BadgeRecord; context: BadgeContext }) {
  const earned = new Set(badgesFor(record, context));
  const shown = BADGES.filter((badge) => earned.has(badge.id));
  return (
    <Card>
      <div className="pk-spread">
        <h2 className="title">Stickers</h2>
        <span className="amount-sm pk-faint">
          {shown.length} / {BADGES.length}
        </span>
      </div>
      {shown.length === 0 ? (
        <p className="body-sm pk-muted" style={{ marginTop: "var(--space-3)" }}>
          None yet. The first meal is the first sticker.
        </p>
      ) : (
        <ul className="pk-strip">
          {shown.map((badge) => (
            <li key={badge.id} className={`pk-sticker pk-sticker--${badge.tone} pk-strip__item`} title={badge.how}>
              <span className="pk-sticker__art" aria-hidden="true">
                <Icon name={badge.icon} size={20} />
              </span>
              <span className="caption">{badge.name}</span>
            </li>
          ))}
        </ul>
      )}
      <p className="caption pk-faint" style={{ marginTop: "var(--space-3)" }}>
        Read from {name}&apos;s record: earned by care, showing up and playing, never bought.
      </p>
    </Card>
  );
}
