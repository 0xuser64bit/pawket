"use client";

import { Button, Card, ICON_NAMES, type IconName } from "@/components/pk";
import { EMOTES, findMoment } from "@/lib/room/moments";

const glyph = (name: string): IconName | undefined => (ICON_NAMES as string[]).includes(name) ? (name as IconName) : undefined;

/**
 * Things to do together that are not care: a wave, a dance, a pat, a
 * treat. The room plays each one, and says so on its own line; nothing
 * here touches the record.
 */
export function EmoteRow({
  petName,
  playing,
  onEmote,
}: {
  petName: string;
  playing: string | null;
  onEmote: (id: string) => void;
}) {
  return (
    <Card>
      <div className="pk-spread">
        <h2 className="title">Say something</h2>
        <span className="caption pk-faint">{petName} is listening</span>
      </div>
      <div className="pk-emotes">
        {EMOTES.map((id) => {
          const moment = findMoment(id)!;
          return (
            <Button
              key={id}
              label={moment.label}
              icon={glyph(moment.icon)}
              size="sm"
              tone="quiet"
              aria-pressed={playing === id}
              onClick={() => onEmote(id)}
            />
          );
        })}
      </div>
      <p className="caption pk-faint" style={{ marginTop: "var(--space-3)" }}>
        Emotes are for the two of you. They do not change a vital, XP or the streak.
      </p>
    </Card>
  );
}
