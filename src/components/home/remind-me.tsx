"use client";

import { useState } from "react";
import { Button, Row } from "@/components/pk";
import { getPublicEnv } from "@/config/env";
import { reminderIcs } from "@/lib/reminders/ics";

/**
 * A daily nudge, kept in the player's own calendar: one repeating event at
 * the time they choose, linking back home. Pawket keeps no list of who
 * wants reminding and sends nothing.
 */
export function RemindMe({ name }: { name: string }) {
  const [time, setTime] = useState("19:00");
  const [saved, setSaved] = useState(false);

  function save() {
    const [hours, minutes] = time.split(":").map(Number);
    const at = new Date();
    at.setHours(hours, minutes, 0, 0);
    if (at.getTime() < Date.now()) at.setDate(at.getDate() + 1);
    const ics = reminderIcs({ name, url: new URL("/home", getPublicEnv().appUrl).toString(), at });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob([ics], { type: "text/calendar;charset=utf-8" }));
    link.download = `pawket-${name.toLowerCase().replace(/[^a-z0-9]+/g, "-") || "pet"}.ics`;
    link.click();
    URL.revokeObjectURL(link.href);
    setSaved(true);
  }

  return (
    <div className="pk-foot">
      <Row gap={2} wrap style={{ alignItems: "center" }}>
        <label className="caption pk-faint" htmlFor="pk-remind-time">
          Remind me daily at
        </label>
        <input
          id="pk-remind-time"
          type="time"
          className="pk-time"
          value={time}
          onChange={(event) => {
            setTime(event.target.value);
            setSaved(false);
          }}
        />
        <Button label={saved ? "Added — open the file" : "Add to my calendar"} icon="clock" tone="quiet" size="sm" disabled={!time} onClick={save} />
      </Row>
      <p className="caption pk-faint" style={{ marginTop: "var(--space-2)" }}>
        A repeating event in your own calendar for the next 30 days. Pawket keeps no list and sends nothing.
      </p>
    </div>
  );
}
