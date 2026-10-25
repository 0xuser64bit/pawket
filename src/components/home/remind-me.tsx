"use client";

import { useEffect, useRef, useState } from "react";
import { Button, Choice, Row, TimeField, Problem } from "@/components/pk";
import { getPublicEnv } from "@/config/env";
import { useCompanion } from "@/lib/companion/use-companion";
import { remindDaily, setCareReminder, useAndroidApp, useCareReminders, type Answer } from "@/lib/native/android";
import { careReminder } from "@/lib/reminders/care";
import { reminderIcs, reminderNotes, reminderTitle } from "@/lib/reminders/ics";
import { record } from "@/lib/analytics/events";

const DAYS = 30;

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
      if (answer.ok) {
        setSaved(true);
        record({ name: "reminder_added", platform: "android", how: "calendar" });
      }
      else setProblem(answer.reason === "no-calendar" ? "No calendar app on this phone took it. Nothing was added." : "The calendar did not open. Nothing was added.");
      return;
    }
    const ics = reminderIcs({ name, url, at, days: DAYS });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob([ics], { type: "text/calendar;charset=utf-8" }));
    link.download = `pawket-${name.toLowerCase().replace(/[^a-z0-9]+/g, "-") || "pet"}.ics`;
    document.body.append(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(link.href), 60_000);
    setSaved(true);
    record({ name: "reminder_added", platform: "web", how: "calendar" });
  }

  return (
    <div className="pk-foot">
      {inApp ? <CareReminderOffer name={name} /> : null}
      <Row gap={2} wrap style={{ alignItems: "center" }}>
        <span className="caption pk-faint" aria-hidden="true">
          Remind me daily at
        </span>
        <TimeField
          label="Remind me daily at"
          value={time}
          onChange={(next) => {
            setTime(next);
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
        <Problem small style={{ marginTop: "var(--space-2)" }}>
          {problem}
        </Problem>
      ) : null}
    </div>
  );
}

function refusal(answer: Answer): string {
  if (answer.reason === "denied") return "Your phone did not allow Pawket's notifications. Allow them for Pawket in the phone's settings, then try again.";
  if (answer.reason === "unknown") return "This version of the app cannot remind you yet. Update Pawket, then try again.";
  return "The app did not answer. Nothing was turned on.";
}

function useCareReminderSwitch(): { on: boolean; turn: (on: boolean) => Promise<void>; problem?: string } {
  const [on, set] = useCareReminders();
  const [problem, setProblem] = useState<string>();
  async function turn(next: boolean) {
    setProblem(undefined);
    const answer = await set(next);
    if (!next) return;
    if (answer.ok) record({ name: "reminder_added", platform: "android", how: "care" });
    else setProblem(refusal(answer));
  }
  return { on, turn, problem };
}

const CARE_REMINDER_ABOUT =
  "The phone says once, at a waking hour, when a pet will first need care. It is worked out on the phone from your pets' records, so Pawket keeps no list and sends nothing.";

function CareReminderOffer({ name }: { name: string }) {
  const { on, turn, problem } = useCareReminderSwitch();
  return (
    <div style={{ marginBottom: "var(--space-3)" }}>
      {on ? (
        <p className="caption pk-faint">This app will tell you when {name} needs care. Settings turns it off.</p>
      ) : (
        <>
          <Button label={`Tell me when ${name} needs care`} icon="bell" tone="quiet" size="sm" onClick={() => void turn(true)} />
          <p className="caption pk-faint" style={{ marginTop: "var(--space-2)" }}>
            {CARE_REMINDER_ABOUT}
          </p>
        </>
      )}
      {problem ? (
        <Problem small style={{ marginTop: "var(--space-2)" }}>
          {problem}
        </Problem>
      ) : null}
    </div>
  );
}

export function CareReminderSetting() {
  const { on, turn, problem } = useCareReminderSwitch();
  return (
    <div className="pk-stack" style={{ gap: "var(--space-2)" }}>
      <Choice
        label="Care reminders"
        options={[
          { value: "on", label: "On" },
          { value: "off", label: "Off" },
        ]}
        value={on ? "on" : "off"}
        onPick={(next) => void turn(next === "on")}
      />
      <p className="caption pk-faint">{CARE_REMINDER_ABOUT}</p>
      {problem ? (
        <Problem small>
          {problem}
        </Problem>
      ) : null}
    </div>
  );
}

export function CareReminderSync() {
  const inApp = useAndroidApp();
  const [on] = useCareReminders();
  return inApp && on ? <KeepCareReminder /> : null;
}

function KeepCareReminder() {
  const { ready, all } = useCompanion();
  const pets = useRef(all);
  useEffect(() => {
    pets.current = all;
  });
  const records = all.map((pet) => `${pet.id}@${pet.statsUpdatedAt}`).join(" ");
  useEffect(() => {
    if (ready) void setCareReminder(careReminder(pets.current, new Date()));
  }, [ready, records]);
  return null;
}
