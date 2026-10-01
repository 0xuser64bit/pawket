/**
 * The one icon set: 31 glyphs on a 24px grid at 1.9px, round caps and joins,
 * `currentColor`. The stroke weight matches `stroke-line`, which is why an
 * icon sits correctly inside a chip, a button and the dock.
 *
 * An icon that carries meaning always sits beside a word. The one exception
 * is the dock in compact mode, where each slot carries an accessible name.
 */

const ICONS = {
  home: "M4 11.2 12 4l8 7.2M6.4 9.6V20h11.2V9.6",
  market:
    "M4.5 8.5h15l-1.2 10a2 2 0 0 1-2 1.8H7.7a2 2 0 0 1-2-1.8zM8.6 8.5V7a3.4 3.4 0 0 1 6.8 0v1.5",
  star: "M12 3.8 14.6 9.4l6.1.8-4.5 4.3 1.2 6.1L12 17.7l-5.4 2.9 1.2-6.1-4.5-4.3 6.1-.8z",
  pocket:
    "M4.6 6.2a1.6 1.6 0 0 1 1.6-1.6h11.6a1.6 1.6 0 0 1 1.6 1.6v5.2a7.4 7.4 0 0 1-14.8 0zM8.6 11a3.4 3.4 0 0 0 6.8 0",
  guild: "M6 4h12v13.6L12 21 6 17.6zM12 8v6M9 11h6",
  paw: "M12 13.2c2.6 0 4.6 1.7 4.6 3.6S14.7 20 12 20s-4.6-1.3-4.6-3.2 2-3.6 4.6-3.6M7.2 8.4c.9 0 1.6 1 1.6 2.2S8.1 12.8 7.2 12.8s-1.6-1-1.6-2.2.7-2.2 1.6-2.2M16.8 8.4c.9 0 1.6 1 1.6 2.2s-.7 2.2-1.6 2.2-1.6-1-1.6-2.2.7-2.2 1.6-2.2M10.6 4.6c.9 0 1.6 1 1.6 2.2s-.7 2.2-1.6 2.2S9 8 9 6.8s.7-2.2 1.6-2.2",
  heart: "M12 19.4S4.6 15.2 4.6 10.1A3.9 3.9 0 0 1 12 8.2a3.9 3.9 0 0 1 7.4 1.9c0 5.1-7.4 9.3-7.4 9.3z",
  bowl: "M4 11.4h16a8 8 0 0 1-16 0zM9 8c0-1.4 1.3-1.6 1.3-3M13.4 8c0-1.4 1.3-1.6 1.3-3",
  spark:
    "M12 3.6 13.9 9l5.5 1.9-5.5 2L12 18.4 10.1 13 4.6 11l5.5-1.9zM18.4 16.4l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7z",
  wallet:
    "M4.4 7.6A2 2 0 0 1 6.4 5.6h11.2a2 2 0 0 1 2 2v9.2a2 2 0 0 1-2 2H6.4a2 2 0 0 1-2-2zM4.4 10.4h15.2M16 14.2h1.6",
  shield: "M12 3.6 19 6v5.4c0 4-2.9 7.4-7 9-4.1-1.6-7-5-7-9V6zM9.2 12l2 2 3.6-3.8",
  doc: "M6.4 3.6h7.2L18.4 8v12.4H6.4zM13.4 3.8V8.2h4.8M9 12h6M9 15.6h6",
  alert: "M12 4.4 21 19.6H3zM12 10v4M12 16.8v.2",
  check: "M5 12.6 9.8 17.4 19 6.6",
  info: "M12 3.8a8.2 8.2 0 1 0 0 16.4 8.2 8.2 0 0 0 0-16.4M12 11v5.4M12 7.6v.2",
  clock: "M12 3.8a8.2 8.2 0 1 0 0 16.4 8.2 8.2 0 0 0 0-16.4M12 7.2V12l3.2 2",
  swap: "M6 8.4h12l-3.2-3.4M18 15.6H6l3.2 3.4",
  out: "M13.4 4.6h6v6M19.4 4.6 10.6 13.4M17 13.6v5.8H5.2V7.6H11",
  lock: "M6.6 10.8h10.8v8.6H6.6zM9 10.8V8a3 3 0 0 1 6 0v2.8",
  search: "M10.8 4.6a6.2 6.2 0 1 0 0 12.4 6.2 6.2 0 0 0 0-12.4M15.4 15.4 19.6 19.6",
  plus: "M12 5.6v12.8M5.6 12h12.8",
  right: "M9.4 5.6 15.8 12l-6.4 6.4",
  left: "M14.6 5.6 8.2 12l6.4 6.4",
  users:
    "M9.4 4.8a3.2 3.2 0 1 0 0 6.4 3.2 3.2 0 0 0 0-6.4M3.4 19.8c0-3.2 2.7-5.4 6-5.4s6 2.2 6 5.4M16.2 5.4a3 3 0 0 1 0 5.8M17.4 14.8c2 .7 3.2 2.5 3.2 5",
  music:
    "M9.4 17.2V6l9.2-1.8v11M9.4 17.2a2.6 2.6 0 1 1-5.2 0 2.6 2.6 0 0 1 5.2 0M18.6 15.2a2.6 2.6 0 1 1-5.2 0 2.6 2.6 0 0 1 5.2 0",
  image: "M4.4 5.6h15.2v12.8H4.4zM4.4 15l4.2-4 4 3.6 3-2.6 4 3.6M9 9.4v.2",
  copy: "M8.6 8.6h10.8v10.8H8.6zM15.4 8.6V6a1.4 1.4 0 0 0-1.4-1.4H6a1.4 1.4 0 0 0-1.4 1.4v8a1.4 1.4 0 0 0 1.4 1.4h2.6",
  ball: "M9.4 12.2a5.8 5.8 0 1 0 0 11.6 5.8 5.8 0 0 0 0-11.6M5.2 14a5.8 5.8 0 0 0 8.4 8M3.2 10.4C4.6 5.6 8.4 3 12.8 3c3.6 0 6.4 1.8 8 5M20.8 8 21 4.2M20.8 8l-3.6-.6",
  vote: "M4.4 12.6h15.2v7.4H4.4zM8.4 12.6V4.8h7.2v7.8M10.4 8.4l1.4 1.4 2.4-2.6M10.2 16.2h3.6",
  scale: "M12 4.6v14.8M6 19.4h12M7 8.2h10M7 8.2 4 14.4h6zM17 8.2l-3 6.2h6z",
  pause: "M9 6.4v11.2M15 6.4v11.2",
  // the wardrobe: each piece drawn as itself, never borrowed from a mood
  scarf: "M4.4 6.8c5 2.8 10.2 2.8 15.2 0l.8 3.6c-5.6 3-11.2 3-16.8 0zM14.4 10.8c.9 2.9.9 5.8-.1 8.8l3.8-.5c.6-3 .3-5.8-.9-8.9M8.4 9.4v2.2M12 9.9v2.2",
  crown: "M5 17.2 3.8 7.8l4.6 3.8L12 5.4l3.6 6.2 4.6-3.8-1.2 9.4zM5.4 20h13.2",
  collar: "M12 4.4c4.4 0 7.6 1.7 7.6 3.8S16.4 12 12 12s-7.6-1.7-7.6-3.8S7.6 4.4 12 4.4M12 12v1.8M12 20.6c-2.3-1.6-3.5-2.7-3.5-3.9a1.75 1.75 0 0 1 3.5-.6 1.75 1.75 0 0 1 3.5.6c0 1.2-1.2 2.3-3.5 3.9z",
  cape: "M8.4 4.6C6.4 9.4 5 14.2 4.4 19.6h15.2c-.6-5.4-2-10.2-4-15-2.4 1.5-4.8 1.5-7.2 0zM12 7v.2",
  ribbon: "M12 10.6C9.4 6.8 4.6 6.8 4.6 10.6s4.8 3.8 7.4 0zm0 0c2.6-3.8 7.4-3.8 7.4 0s-4.8 3.8-7.4 0zM10.8 12.2 8.6 19l2.6-1.2 1 2.4M13.2 12.2l2.2 6.8-2.6-1.2-1 2.4",
} as const;

export type IconName = keyof typeof ICONS;

export const ICON_NAMES = Object.keys(ICONS) as IconName[];

export function Icon({
  name,
  size = 20,
  weight = 1.9,
  className,
}: {
  name: IconName;
  size?: number;
  weight?: number;
  className?: string;
}) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={weight}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d={ICONS[name]} />
    </svg>
  );
}
