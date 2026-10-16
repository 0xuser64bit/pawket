"use client";

import { Button } from "@/components/pk";
import { useRoomAmbience, useSound } from "@/lib/play/sound";

export function RoomSound() {
  const [on, setOn] = useSound();
  useRoomAmbience(on);
  return <Button label={on ? "Sound on" : "Sound off"} icon="music" tone="quiet" size="sm" aria-pressed={on} onClick={() => setOn(!on)} />;
}
