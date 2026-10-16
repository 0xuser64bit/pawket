"use client";

import { useId, useRef, type KeyboardEvent } from "react";
import { Icon, type IconName } from "./icon";

/**
 * One choice from a short list, as a radio group: arrow keys move the
 * choice, Tab leaves the group, and the room changes as you go.
 */
export function Choice<T extends string | number>({
  label,
  options,
  value,
  onPick,
  swatch,
  className,
  hideLabel,
}: {
  label: string;
  /** An icon beside a word helps a row read at a glance; a swatch has none. */
  options: ReadonlyArray<{ value: T; label: string; icon?: IconName }>;
  value: T;
  onPick: (value: T) => void;
  /** Draw each option as a colour dot instead of a word. */
  swatch?: (value: T) => string;
  className?: string;
  /** Said to a screen reader only, when the choices already say what they are (AM, PM). */
  hideLabel?: boolean;
}) {
  const refs = useRef<Array<HTMLButtonElement | null>>([]);
  const id = useId();
  function onKeyDown(event: KeyboardEvent, index: number) {
    const step = event.key === "ArrowRight" || event.key === "ArrowDown" ? 1 : event.key === "ArrowLeft" || event.key === "ArrowUp" ? -1 : 0;
    const next = event.key === "Home" ? 0 : event.key === "End" ? options.length - 1 : step ? (index + step + options.length) % options.length : null;
    if (next === null) return;
    event.preventDefault();
    onPick(options[next].value);
    refs.current[next]?.focus();
  }
  return (
    <div className={["pk-look__row", className].filter(Boolean).join(" ")}>
      <span className={hideLabel ? "pk-sr" : "label pk-faint"} id={id}>
        {label}
      </span>
      <div role="radiogroup" aria-labelledby={id} className="pk-choices">
        {options.map((option, index) => {
          const on = option.value === value;
          return (
            <button
              key={String(option.value)}
              ref={(el) => {
                refs.current[index] = el;
              }}
              type="button"
              role="radio"
              aria-checked={on}
              aria-label={swatch ? option.label : undefined}
              title={swatch ? option.label : undefined}
              tabIndex={on ? 0 : -1}
              className={swatch ? "pk-swatch" : "pk-choice"}
              style={swatch ? { background: swatch(option.value) } : undefined}
              onClick={() => onPick(option.value)}
              onKeyDown={(event) => onKeyDown(event, index)}
            >
              {swatch ? null : (
                <>
                  {option.icon ? <Icon name={option.icon} size={16} /> : null}
                  {option.label}
                </>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
