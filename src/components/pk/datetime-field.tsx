"use client";

import { useEffect, useId, useState, type KeyboardEvent } from "react";
import { localMinute, parseLocalMinute } from "@/lib/utils/local-datetime";
import { Button, Field } from "./controls";
import { Icon } from "./icon";
import { Sheet } from "./sheet";

const dateLabel = (date: Date) => date.toLocaleDateString(undefined, { weekday: "long", year: "numeric", month: "long", day: "numeric" });
const clockLabel = (date: Date) => date.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });

/** A local event time, picked in the room's own calendar and confirmed as one change. */
export function DateTimeField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const chosen = parseLocalMinute(value);
  return <div className="pk-stack">
    <span id={id} className="label pk-faint">{label}</span>
    <button type="button" className="pk-date-trigger" aria-labelledby={`${id} ${id}-value`} aria-haspopup="dialog" aria-expanded={open} onClick={() => setOpen(true)}>
      <Icon name="clock" size={18} />
      <span id={`${id}-value`}>{chosen ? clockLabel(chosen) : "Choose a date and time"}</span>
      <Icon name="right" size={14} />
    </button>
    <span className="caption pk-faint">Your local time · {Intl.DateTimeFormat().resolvedOptions().timeZone}</span>
    {open ? <Calendar value={value} label={label} onClose={() => setOpen(false)} onApply={(next) => { onChange(next); setOpen(false); }} /> : null}
  </div>;
}

function Calendar({ value, label, onClose, onApply }: { value: string; label: string; onClose: () => void; onApply: (value: string) => void }) {
  const [now, setNow] = useState(Date.now);
  useEffect(() => { const timer = window.setInterval(() => setNow(Date.now()), 30_000); return () => window.clearInterval(timer); }, []);
  const [day, setDay] = useState(() => parseLocalMinute(value) ?? new Date(Date.now() + 3_600_000));
  const [hour, setHour] = useState(() => String(day.getHours()));
  const [minute, setMinute] = useState(() => String(day.getMinutes()).padStart(2, "0"));
  const id = useId();
  const dateKey = localMinute(day).slice(0, 10);
  const candidate = /^\d{1,2}$/.test(hour) && /^\d{1,2}$/.test(minute)
    ? parseLocalMinute(`${dateKey}T${hour.padStart(2, "0")}:${minute.padStart(2, "0")}`) : null;
  const problem = !candidate ? "Choose a valid time. If the clocks change that day, try another hour." : candidate.getTime() <= now ? "Choose a time in the future." : undefined;
  const first = new Date(day.getFullYear(), day.getMonth(), 1, 12);
  const offset = (first.getDay() + 6) % 7;
  const dates = Array.from({ length: 42 }, (_, i) => new Date(first.getFullYear(), first.getMonth(), i - offset + 1, 12));

  useEffect(() => { document.getElementById(`${id}-${dateKey}`)?.focus(); }, [id, dateKey]);

  function moveMonth(step: number) {
    const last = new Date(day.getFullYear(), day.getMonth() + step + 1, 0).getDate();
    setDay(new Date(day.getFullYear(), day.getMonth() + step, Math.min(day.getDate(), last), 12));
  }
  function keys(event: KeyboardEvent, date: Date) {
    const step = ({ ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 } as Record<string, number>)[event.key];
    if (step) { event.preventDefault(); setDay(new Date(date.getFullYear(), date.getMonth(), date.getDate() + step, 12)); }
    else if (event.key === "PageUp" || event.key === "PageDown") { event.preventDefault(); moveMonth(event.key === "PageUp" ? -1 : 1); }
    else if (event.key === "Home" || event.key === "End") {
      event.preventDefault();
      const weekday = (date.getDay() + 6) % 7;
      setDay(new Date(date.getFullYear(), date.getMonth(), date.getDate() + (event.key === "Home" ? -weekday : 6 - weekday), 12));
    }
  }
  return <Sheet title={`Choose ${label.toLowerCase()}`} register="room" onDismiss={onClose}
    foot={(dismiss) => <div className="pk-spread"><Button label="Cancel" tone="ghost" onClick={dismiss} /><Button label="Use this time" icon="check" disabled={Boolean(problem)} onClick={() => { if (candidate && candidate.getTime() > Date.now()) onApply(localMinute(candidate)); else setNow(Date.now()); }} /></div>}>
    <div className="pk-calendar">
      <div className="pk-spread">
        <Button label="Previous month" aria-label="Previous month" icon="left" tone="ghost" size="sm" onClick={() => moveMonth(-1)} />
        <h3 className="title" aria-live="polite">{day.toLocaleDateString(undefined, { month: "long", year: "numeric" })}</h3>
        <Button label="Next month" aria-label="Next month" icon="right" tone="ghost" size="sm" onClick={() => moveMonth(1)} />
      </div>
      <div className="pk-calendar__grid" role="grid" aria-label="Event date">
        <div role="row" className="pk-calendar__week">
          {dates.slice(0, 7).map((date) => <span role="columnheader" key={date.getDay()} className="caption pk-faint">{date.toLocaleDateString(undefined, { weekday: "short" })}</span>)}
        </div>
        {Array.from({ length: 6 }, (_, week) => <div role="row" key={week} className="pk-calendar__week">
          {dates.slice(week * 7, week * 7 + 7).map((date) => {
            const key = localMinute(date).slice(0, 10);
            const selected = key === dateKey;
            return <div role="gridcell" key={key} aria-selected={selected}>
              <button type="button" id={`${id}-${key}`} className="pk-calendar__day" data-outside={date.getMonth() !== day.getMonth() ? "" : undefined}
                data-autofocus={selected ? "" : undefined} aria-label={dateLabel(date)} aria-current={date.toDateString() === new Date(now).toDateString() ? "date" : undefined}
                tabIndex={selected ? 0 : -1} onClick={() => setDay(date)} onKeyDown={(event) => keys(event, date)}>{date.getDate()}</button>
            </div>;
          })}
        </div>)}
      </div>
      <div className="pk-calendar__clock">
        <Field label="Hour (0–23)" icon="clock" type="number" inputMode="numeric" min={0} max={23} value={hour} onChange={(event) => setHour(event.target.value)} />
        <Field label="Minute (0–59)" icon="clock" type="number" inputMode="numeric" min={0} max={59} value={minute} onChange={(event) => setMinute(event.target.value)} />
      </div>
      <p className="body-sm" role="status">{problem ?? (candidate ? clockLabel(candidate) : "")}</p>
      <p className="caption pk-faint">Local time in {Intl.DateTimeFormat().resolvedOptions().timeZone}. Arrow keys move days; Page Up and Page Down change months.</p>
    </div>
  </Sheet>;
}
