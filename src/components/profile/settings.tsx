"use client";

import { Button, ButtonLink, Card, Row, ThemePicker } from "@/components/pk";
import { useRoomMode } from "@/components/home/room";
import { useSound } from "@/lib/play/sound";
import type { PetForm } from "@/components/pk";

/**
 * The room you live in and how this device plays: the rooms, 3D or flat,
 * and the playground's sound. All of it is saved here, and none of it
 * changes a pet.
 */
export function Settings({ form }: { form?: PetForm }) {
  const [mode, setMode] = useRoomMode();
  const [sound, setSound] = useSound();
  return (
    <div className="pk-stack" style={{ gap: "var(--space-5)" }}>
      <Card>
        <h2 className="title">Rooms</h2>
        <p className="body-sm pk-muted" style={{ margin: "var(--space-2) 0 var(--space-4)" }}>
          The whole of Pawket, in another room. Every colour still means what it meant.
        </p>
        <ThemePicker form={form} />
      </Card>
      <Card>
        <h2 className="title">Pawket Wallet</h2>
        <p className="body-sm pk-muted" style={{ marginTop: "var(--space-2)" }}>
          Link this device once, and caring for your pets on Solana stops asking your wallet each time. Fees come
          from a balance only you can fill or empty.
        </p>
        <div style={{ marginTop: "var(--space-4)" }}>
          <ButtonLink label="Open the Pawket Wallet" href="/wallet" icon="bolt" tone="quiet" size="sm" />
        </div>
      </Card>
      <Card>
        <h2 className="title">On this device</h2>
        <Row gap={3} wrap style={{ marginTop: "var(--space-4)" }}>
          <Button
            label={mode === "3d" ? "The room is 3D" : "The room is flat"}
            icon="home"
            tone="quiet"
            size="sm"
            aria-pressed={mode === "3d"}
            onClick={() => setMode(mode === "3d" ? "flat" : "3d")}
          />
          <Button
            label={sound ? "Playground sound on" : "Playground sound off"}
            icon="music"
            tone="quiet"
            size="sm"
            aria-pressed={sound}
            onClick={() => setSound(!sound)}
          />
        </Row>
        <p className="caption pk-faint" style={{ marginTop: "var(--space-4)" }}>
          Your name, your look, your outfits, your room and the pets in this browser are saved on this device and
          nowhere else. Pets on Solana are read from your wallet&apos;s accounts each time.
        </p>
      </Card>
    </div>
  );
}
