"use client";

import { useEffect, useId, useState, useSyncExternalStore, type KeyboardEvent } from "react";
import { localMinute, parseLocalMinute } from "@/lib/utils/local-datetime";
import { Choice } from "./choice";
import { Button } from "./controls";
import { Icon } from "./icon";
import { Sheet } from "./sheet";

const never = () => () => {};
/** True once in the browser: the server knows neither this device's clock nor how it writes a time. */
const useInBrowser = () => useSyncExternalStore(never, () => true, () => false);

/** This device's clock: twelve hours and AM or PM, or twenty-four. */
const twelveHour = () => /h1[12]/.test(new Intl.DateTimeFormat(undefined, { hour: "numeric" }).resolvedOptions().hourCycle ?? "h23");
const zone = () => Intl.DateTimeFormat().resolvedOptions().timeZone;
const pad = (n: number) => String(n).padStart(2, "0");
const QUARTERS = ["00", "15", "30", "45"] as const;

/** "19:00" as this device says it: "7:00 PM", or "19:00". */
const timeLabel = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return new Date(2000, 0, 1, h, m).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
};
const dayLabel = (date: Date) => date.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" });
/** Noon of a day: a date that no clock change can push into the next or the last. */
const noon = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12);
/** The next whole hour from now: a time worth suggesting. */
const nextHour = (now: number) => {
  const at = new Date(now);
  at.setHours(at.getHours() + 1, 0, 0, 0);
  return at;
};

/**
 * A time of day as choices — the hour, the quarter hour, and AM or PM where
 * this device uses them. Nothing to type and nothing to get wrong.
 */
function TimeChoice({ value, onPick }: { value: string; onPick: (value: string) => void }) {
  const [h, m] = value.split(":").map(Number);
  const twelve = twelveHour();
  const minute = QUARTERS.find((q) => Number(q) === m) ?? "00";
  const pm = h >= 12;
  const at = (hour: number, quarter: string = minute) => onPick(`${pad(hour)}:${quarter}`);
  const hours = twelve ? [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] : Array.from({ length: 24 }, (_, i) => i);
  return (
    <div className="pk-clock">
      <Choice
        label="Hour"
        className="pk-clock__hours"
        value={twelve ? h % 12 || 12 : h}
        options={hours.map((hour) => ({ value: hour, label: twelve ? String(hour) : pad(hour) }))}
        onPick={(hour) => at(twelve ? (hour % 12) + (pm ? 12 : 0) : hour)}
      />
      <div className="pk-clock__row">
        <Choice label="Minutes" className="pk-clock__quarters" value={minute} options={QUARTERS.map((q) => ({ value: q, label: `:${q}` }))} onPick={(q) => at(h, q)} />
        {twelve ? (
          <Choice
            label="Morning or afternoon"
            hideLabel
            className="pk-clock__half"
            value={pm ? "pm" : "am"}
            options={[
              { value: "am", label: "AM" },
              { value: "pm", label: "PM" },
            ]}
            onPick={(half) => at((h % 12) + (half === "pm" ? 12 : 0))}
          />
        ) : null}
      </div>
    </div>
  );
}

/** A local event time, picked in the room's own calendar and confirmed as one change. */
export function DateTimeField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  const [open, setOpen] = useState(false);
  const inBrowser = useInBrowser();
  const id = useId();
  const chosen = parseLocalMinute(value);
  return (
    <div className="pk-stack">
      <span id={id} className="label pk-faint">
        {label}
      </span>
      <button type="button" className="pk-date-trigger" aria-labelledby={`${id} ${id}-value`} aria-haspopup="dialog" aria-expanded={open} onClick={() => setOpen(true)}>
        <Icon name="clock" size={18} />
        <span id={`${id}-value`} className={chosen ? undefined : "pk-faint"}>
          {!chosen ? "Choose a day and time" : inBrowser ? `${dayLabel(chosen)} · ${timeLabel(value.slice(11))}` : value.replace("T", " · ")}
        </span>
        <Icon name="right" size={14} />
      </button>
      <span className="caption pk-faint">Your local time{inBrowser ? ` · ${zone()}` : ""}</span>
      {open ? (
        <Calendar
          value={value}
          label={label}
          onClose={() => setOpen(false)}
          onApply={(next) => {
            onChange(next);
            setOpen(false);
          }}
        />
      ) : null}
    </div>
  );
}

function Calendar({ value, label, onClose, onApply }: { value: string; label: string; onClose: () => void; onApply: (value: string) => void }) {
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, []);
  const [day, setDay] = useState(() => noon(parseLocalMinute(value) ?? nextHour(Date.now())));
  const [time, setTime] = useState(() => localMinute(parseLocalMinute(value) ?? nextHour(Date.now())).slice(11));
  const id = useId();
  const dateKey = localMinute(day).slice(0, 10);
  const candidate = parseLocalMinute(`${dateKey}T${time}`);
  const today = noon(new Date(now));
  const problem = !candidate
    ? "The clocks change at that hour on this day. Choose another."
    : candidate.getTime() <= now
      ? "That time has passed. Choose a later one."
      : undefined;
  const first = new Date(day.getFullYear(), day.getMonth(), 1, 12);
  const offset = (first.getDay() + 6) % 7;
  const dates = Array.from({ length: 42 }, (_, i) => new Date(first.getFullYear(), first.getMonth(), i - offset + 1, 12));
  const past = (date: Date) => date.getTime() < today.getTime();
  const thisMonth = day.getFullYear() === today.getFullYear() && day.getMonth() === today.getMonth();

  useEffect(() => {
    document.getElementById(`${id}-${dateKey}`)?.focus();
  }, [id, dateKey]);

  /** To the same day of another month, or its last day if it is shorter; never before today. */
  function moveMonth(step: number) {
    const last = new Date(day.getFullYear(), day.getMonth() + step + 1, 0).getDate();
    const next = new Date(day.getFullYear(), day.getMonth() + step, Math.min(day.getDate(), last), 12);
    setDay(past(next) ? today : next);
  }
  function go(date: Date) {
    if (!past(date)) setDay(date);
  }
  function keys(event: KeyboardEvent, date: Date) {
    const step = ({ ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 } as Record<string, number>)[event.key];
    if (step) go(new Date(date.getFullYear(), date.getMonth(), date.getDate() + step, 12));
    else if (event.key === "PageUp" || event.key === "PageDown") moveMonth(event.key === "PageUp" ? -1 : 1);
    else if (event.key === "Home" || event.key === "End") {
      const weekday = (date.getDay() + 6) % 7;
      go(new Date(date.getFullYear(), date.getMonth(), date.getDate() + (event.key === "Home" ? -weekday : 6 - weekday), 12));
    } else return;
    event.preventDefault();
  }

  return (
    <Sheet
      title={label}
      meta="Your local time"
      register="room"
      onDismiss={onClose}
      foot={(dismiss) => (
        <div className="pk-spread">
          <Button label="Cancel" tone="ghost" onClick={dismiss} />
          <Button
            label="Use this time"
            icon="check"
            disabled={Boolean(problem)}
            onClick={() => (candidate && candidate.getTime() > Date.now() ? onApply(localMinute(candidate)) : setNow(Date.now()))}
          />
        </div>
      )}
    >
      <div className="pk-calendar">
        <div className="pk-calendar__month">
          <Button label="Previous month" icon="left" tone="ghost" size="sm" disabled={thisMonth} onClick={() => moveMonth(-1)} />
          <h3 className="title" aria-live="polite">
            {day.toLocaleDateString(undefined, { month: "long", year: "numeric" })}
          </h3>
          <Button label="Next month" icon="right" tone="ghost" size="sm" onClick={() => moveMonth(1)} />
        </div>
        <div className="pk-calendar__grid" role="grid" aria-label="Day" aria-describedby={`${id}-keys`}>
          <div role="row" className="pk-calendar__week">
            {dates.slice(0, 7).map((date) => (
              <span role="columnheader" key={date.getDay()} className="caption pk-faint">
                {date.toLocaleDateString(undefined, { weekday: "narrow" })}
              </span>
            ))}
          </div>
          {Array.from({ length: 6 }, (_, week) => (
            <div role="row" key={week} className="pk-calendar__week">
              {dates.slice(week * 7, week * 7 + 7).map((date) => {
                const key = localMinute(date).slice(0, 10);
                const selected = key === dateKey;
                return (
                  <div role="gridcell" key={key} aria-selected={selected}>
                    <button
                      type="button"
                      id={`${id}-${key}`}
                      className="pk-calendar__day"
                      data-outside={date.getMonth() !== day.getMonth() ? "" : undefined}
                      data-autofocus={selected ? "" : undefined}
                      aria-label={date.toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" })}
                      aria-current={date.getTime() === today.getTime() ? "date" : undefined}
                      disabled={past(date)}
                      tabIndex={selected ? 0 : -1}
                      onClick={() => go(date)}
                      onKeyDown={(event) => keys(event, date)}
                    >
                      {date.getDate()}
                    </button>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
        <p id={`${id}-keys`} className="pk-sr">
          Arrow keys move a day or a week; Page Up and Page Down move a month.
        </p>
      </div>
      <TimeChoice value={time} onPick={setTime} />
      <p className="pk-calendar__when" role="status">
        {problem ?? (candidate ? `${dayLabel(candidate)} · ${timeLabel(time)}` : null)}
      </p>
    </Sheet>
  );
}

/** A time of day, chosen the same way, for something that repeats daily. */
export function TimeField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  const [draft, setDraft] = useState<string | null>(null);
  const inBrowser = useInBrowser();
  const shown = inBrowser ? timeLabel(value) : value;
  return (
    <>
      <button type="button" className="pk-date-trigger pk-date-trigger--time" aria-haspopup="dialog" aria-label={`${label}: ${shown}`} onClick={() => setDraft(value)}>
        <Icon name="clock" size={16} />
        <span>{shown}</span>
        <Icon name="right" size={12} />
      </button>
      {draft !== null ? (
        <Sheet
          title={label}
          meta="Your local time"
          register="room"
          onDismiss={() => setDraft(null)}
          foot={(dismiss) => (
            <div className="pk-spread">
              <Button label="Cancel" tone="ghost" onClick={dismiss} />
              <Button
                label="Use this time"
                icon="check"
                onClick={() => {
                  onChange(draft);
                  setDraft(null);
                }}
              />
            </div>
          )}
        >
          <TimeChoice value={draft} onPick={setDraft} />
        </Sheet>
      ) : null}
    </>
  );
}
