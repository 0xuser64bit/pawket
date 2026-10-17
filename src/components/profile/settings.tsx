"use client";

import type { Address } from "@solana/kit";
import { NavLink as Link } from "@/components/pk/nav-link";
import { Button, ButtonLink, Card, Choice, Row, ThemePicker } from "@/components/pk";
import { useCounting } from "@/lib/analytics/events";
import { useCloset } from "@/lib/market/use-closet";
import { useConnected } from "@/lib/solana/browser-client";
import { useSponsor } from "@/lib/solana/use-send";
import { useRoomMode } from "@/components/home/room";
import { useSound } from "@/lib/play/sound";
import type { PetForm } from "@/components/pk";
import { useAndroidApp, useHaptics, useHere } from "@/lib/native/android";
import { CareReminderSetting } from "@/components/home/remind-me";

/**
 * The room you live in and how this device plays: the rooms, 3D or flat,
 * and Pawket's sound. All of it is saved here, and none of it
 * changes a pet.
 */
export function Settings({ form }: { form?: PetForm }) {
  const [mode, setMode] = useRoomMode();
  const [sound, setSound] = useSound();
  const connected = useConnected();
  const closet = useCloset((connected?.account.address as Address | undefined) ?? null);
  const { here } = useHere();
  const inApp = useAndroidApp();
  const [haptics, setHaptics] = useHaptics();
  const sponsor = useSponsor();
  const counts = useCounting();
  return (
    <div className="pk-stack" style={{ gap: "var(--space-5)" }}>
      <Card>
        <h2 className="title">Rooms</h2>
        <p className="body-sm pk-muted" style={{ margin: "var(--space-2) 0 var(--space-4)" }}>
          The whole of Pawket, in another room. Every colour still means what it meant.
        </p>
        <ThemePicker form={form} owned={new Set(closet.data?.items ?? [])} />
        <ButtonLink label="Find more rooms in the Market" href="/market" tone="quiet" size="sm" />
      </Card>
      <Card>
        <h2 className="title">Pawket Wallet</h2>
        <p className="body-sm pk-muted" style={{ marginTop: "var(--space-2)" }}>
          Everything your pets do on Solana goes through it. Link {here} once, and your pets act inside the limits you
          set without asking your wallet each time.{" "}
          {sponsor.data?.available ? "Pawket pays the fees right now, so it can start empty." : "A little SOL in it covers fees while sponsorship is unavailable."}{" "}
          Market looks and coins spend the balance when your wallet approves.
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
            label={sound ? "Pawket sound on" : "Pawket sound off"}
            icon="music"
            tone="quiet"
            size="sm"
            aria-pressed={sound}
            onClick={() => setSound(!sound)}
          />
          {inApp ? (
            <Button
              label={haptics ? "Haptics on" : "Haptics off"}
              icon="spark"
              tone="quiet"
              size="sm"
              aria-pressed={haptics}
              onClick={() => setHaptics(!haptics)}
            />
          ) : null}
        </Row>
        {inApp ? (
          <div style={{ marginTop: "var(--space-4)" }}>
            <CareReminderSetting />
          </div>
        ) : null}
        <div style={{ marginTop: "var(--space-4)" }}>
          {counts.browserDeclines ? (
            <p className="caption pk-faint">
              This browser asks sites not to track it, so Pawket counts nothing here.
            </p>
          ) : (
            <Choice
              label="Anonymous counts"
              options={[
                { value: "on", label: "Counted" },
                { value: "off", label: "Not counted" },
              ]}
              value={counts.on ? "on" : "off"}
              onPick={(next) => counts.set(next === "on")}
            />
          )}
        </div>
        <p className="caption pk-faint" style={{ marginTop: "var(--space-4)" }}>
          Pawket counts how its own loop is used — adoptions, cares, rounds, returns and the steps onto Solana — to
          learn what to make better. A count carries a few fixed words and never a name, a wallet, an address or a
          score; there is no cookie and no profile of anyone. Your name, your look, your outfits, your room and the
          pets in {here} are saved on this device and nowhere else.
          {inApp ? " Uninstalling Pawket or clearing its storage takes them with it, and a browser on this phone keeps its own." : ""}{" "}
          Pets on Solana are read from your wallet&apos;s accounts each time. <Link href="/privacy">Privacy</Link>
        </p>
      </Card>
    </div>
  );
}
