"use client";

import { useState } from "react";
import { Button, Row } from "@/components/pk";
import { getPublicEnv } from "@/config/env";
import { remindDaily, useAndroidApp } from "@/lib/native/android";
import { reminderIcs, reminderNotes, reminderTitle } from "@/lib/reminders/ics";

const DAYS = 30;

/**
 * A daily nudge, kept in the player's own calendar: one repeating event at
 * the time they choose, linking back home. In a browser it is a calendar
 * file; in the Android app, the phone's calendar opens with the event filled
 * in, to save there. Pawket keeps no list of who wants reminding and sends
 * nothing.
 */
export function RemindMe({ name }: { name: string }) {
  const [time, setTime] = useState("19:00");
  const [saved, setSaved] = useState(false);
  const [problem, setProblem] = useState<string>();
  const inApp = useAndroidApp();

  async function save() {
    const [hours, minutes] = time.split(":").map(Number);
    const at = new Date();
    at.setHours(hours, minutes, 0, 0);
    if (at.getTime() < Date.now()) at.setDate(at.getDate() + 1);
    const url = new URL("/home", getPublicEnv().appUrl).toString();
    setProblem(undefined);
    if (inApp) {
      const answer = await remindDaily({ title: reminderTitle(name), notes: reminderNotes(name, url), url, at, days: DAYS });
      if (answer.ok) setSaved(true);
      else setProblem(answer.reason === "no-calendar" ? "No calendar app on this phone took it. Nothing was added." : "The calendar did not open. Nothing was added.");
      return;
    }
    const ics = reminderIcs({ name, url, at, days: DAYS });
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
        <Button
          label={saved ? (inApp ? "Opened in your calendar" : "Added — open the file") : "Add to my calendar"}
          icon="clock"
          tone="quiet"
          size="sm"
          disabled={!time}
          onClick={() => void save()}
        />
      </Row>
      <p className="caption pk-faint" style={{ marginTop: "var(--space-2)" }}>
        {inApp
          ? `A repeating event in your phone's calendar for the next ${DAYS} days, saved there when you say so. Pawket keeps no list and sends nothing.`
          : `A repeating event in your own calendar for the next ${DAYS} days. Pawket keeps no list and sends nothing.`}
      </p>
      {problem ? (
        <p role="alert" className="caption" style={{ color: "var(--alarm-text)", marginTop: "var(--space-2)" }}>
          {problem}
        </p>
      ) : null}
    </div>
  );
}
