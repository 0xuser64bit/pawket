"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon, type IconName } from "./icon";

/**
 * The five places in Pawket, and the only persistent navigation. Order is
 * fixed in the product. In compact mode — which is how it ships on a phone —
 * inactive slots show only their icon, so five slots fit at 390px.
 */
const PLACES: Array<{ key: string; label: string; icon: IconName; href: string }> = [
  { key: "home", label: "Home", icon: "home", href: "/home" },
  { key: "market", label: "Market", icon: "market", href: "/market" },
  { key: "playground", label: "Playground", icon: "ball", href: "/playground" },
  { key: "inventory", label: "Inventory", icon: "pocket", href: "/inventory" },
  { key: "guilds", label: "Guilds", icon: "guild", href: "/guilds" },
];

export function Dock() {
  const pathname = usePathname();
  // A detail screen still belongs to its place: /pet/* and /market/* keep
  // the slot they were reached from lit.
  const active =
    PLACES.find((p) => pathname === p.href || pathname.startsWith(`${p.href}/`))?.key ??
    (pathname.startsWith("/pet") ? "inventory" : "home");

  return (
    <div className="pk-dockbar">
      <nav className="pk-dock" aria-label="Pawket">
        {PLACES.map((place) => {
          const on = place.key === active;
          return (
            <Link
              key={place.key}
              href={place.href}
              aria-current={on ? "page" : undefined}
              // The dock is the one place an icon may stand alone, so each
              // slot carries its name whether or not the label is drawn.
              aria-label={place.label}
              className={[
                "pk-dock__item",
                // Guilds is the one slot that changes hue when active.
                place.key === "guilds" && "pk-dock__item--guild",
                on && "pk-dock__item--on",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              <Icon name={place.icon} size={17} />
              <span className={on ? undefined : "pk-dock__label--hide"}>{place.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
