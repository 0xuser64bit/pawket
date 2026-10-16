"use client";

import { useRef, useState } from "react";

/**
 * Local panels that keep their deep links without asking the server to
 * render again. The tab pressed lights at once, even while a heavy panel
 * is still being drawn; Back and Forward move them as the address does.
 */
export function Tabs({ items, active, label }: {
  items: Array<{ key: string; label: string; href: string }>;
  active: string;
  label: string;
}) {
  const refs = useRef<Array<HTMLButtonElement | null>>([]);
  // A press holds until the address moves — to the tab pressed, or anywhere by Back — and then the address wins.
  const [pressed, setPressed] = useState<{ key: string; from: string } | null>(null);
  if (pressed && pressed.from !== active) setPressed(null);
  const lit = pressed && pressed.from === active ? pressed.key : active;
  function pick(index: number) {
    const item = items[index];
    if (item.key === lit) return;
    setPressed({ key: item.key, from: active });
    refs.current[index]?.focus();
    window.history.pushState(null, "", item.href);
  }
  return (
    <div className="pk-tabs" role="tablist" aria-label={label}>
      {items.map((item, index) => (
        <button key={item.key} ref={(el) => { refs.current[index] = el; }} type="button"
          id={`pk-tab-${item.key}`} role="tab" aria-selected={item.key === lit}
          aria-controls={`pk-panel-${item.key}`} tabIndex={item.key === lit ? 0 : -1}
          className={`pk-tabs__t${item.key === lit ? " pk-tabs__t--on" : ""}`}
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
