"use client";

import { Icon } from "@/components/pk";
import { useRoomMusic, useSound } from "@/lib/play/sound";

/**
 * The room's sound, in its corner beside the view switch: a speaker, on or
 * muted, that plays the music box while it is on. The same switch as the
 * playground's and Settings'.
 */
export function RoomSound() {
  const [on, setOn] = useSound();
  useRoomMusic(on);
  return (
    <button type="button" className="pk-soundswitch" aria-pressed={on} aria-label="Room sound" title={on ? "Sound on" : "Sound off"} onClick={() => setOn(!on)}>
      <Icon name={on ? "sound" : "mute"} size={18} />
    </button>
  );
}
