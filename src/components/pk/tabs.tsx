"use client";

import { useRef } from "react";

/** Local panels keep their deep links without asking the server to render again. */
export function Tabs({ items, active, label }: {
  items: Array<{ key: string; label: string; href: string }>;
  active: string;
  label: string;
}) {
  const refs = useRef<Array<HTMLButtonElement | null>>([]);
  function pick(index: number) {
    window.history.pushState(null, "", items[index].href);
    refs.current[index]?.focus();
  }
  return (
    <div className="pk-tabs" role="tablist" aria-label={label}>
      {items.map((item, index) => (
        <button key={item.key} ref={(el) => { refs.current[index] = el; }} type="button"
          id={`pk-tab-${item.key}`} role="tab" aria-selected={item.key === active}
          aria-controls={`pk-panel-${item.key}`} tabIndex={item.key === active ? 0 : -1}
          className={`pk-tabs__t${item.key === active ? " pk-tabs__t--on" : ""}`}
          onClick={() => pick(index)}
          onKeyDown={(event) => {
            const step = event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
            const next = event.key === "Home" ? 0 : event.key === "End" ? items.length - 1 : step ? (index + step + items.length) % items.length : null;
            if (next !== null) { event.preventDefault(); pick(next); }
          }}>
          {item.label}
        </button>
      ))}
    </div>
  );
}
