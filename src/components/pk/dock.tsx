"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon, type IconName } from "./icon";

/**
 * The places in Pawket, and the only persistent navigation. Order is fixed.
 * It floats at the foot of the view at every width — over the page while it
 * scrolls, simply at the bottom when it does not. On a phone only the lit
 * slot shows its name; wider, every slot is named.
 *
 * The Park is where pets kept on Solana are seen by everyone. The Market
 * sells looks — pieces and rooms, never power — and comes after play.
 */
const PLACES: Array<{ key: string; label: string; icon: IconName; href: string }> = [
  { key: "home", label: "Home", icon: "home", href: "/home" },
  { key: "park", label: "Park", icon: "users", href: "/park" },
  { key: "playground", label: "Playground", icon: "ball", href: "/playground" },
  { key: "market", label: "Market", icon: "market", href: "/market" },
  { key: "profile", label: "Profile", icon: "person", href: "/profile" },
  { key: "guilds", label: "Guilds", icon: "guild", href: "/guilds" },
];

/**
 * A detail screen still belongs to its place: a pet kept on Solana (its id
 * is an address) and Pawket's pulse to the Park, a pet in this browser to
 * the profile that keeps it. The old shelf's address belongs to the profile
 * too.
 */
export function activePlace(pathname: string): string {
  const place = PLACES.find((p) => pathname === p.href || pathname.startsWith(`${p.href}/`))?.key;
  if (place) return place;
  if (/^\/pet\/[1-9A-HJ-NP-Za-km-z]{32,44}(\/visit)?$/.test(pathname) || pathname === "/pulse") return "park";
  return pathname.startsWith("/pet") || pathname.startsWith("/inventory") || pathname.startsWith("/wallet") ? "profile" : "home";
}

export function Dock() {
  const active = activePlace(usePathname());

  return (
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
            <span className="pk-dock__label">{place.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
