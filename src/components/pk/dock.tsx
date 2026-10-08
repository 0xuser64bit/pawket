"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLayoutEffect, useRef } from "react";
import { Icon, type IconName } from "./icon";

/**
 * The places in Pawket, and the only persistent navigation. Order is fixed.
 * It floats at the foot of the view at every width — over the page while it
 * scrolls, simply at the bottom when it does not. Every place stays named;
 * a phone stacks each name below its icon and gives every slot equal room.
 *
 * The Park is where pets kept on Solana are seen by everyone. The Market
 * sells looks — pieces and rooms, never power — and comes after play.
 */
const PLACES: Array<{ key: string; label: string; short?: string; icon: IconName; href: string }> = [
  { key: "home", label: "Home", icon: "home", href: "/home" },
  { key: "park", label: "Park", icon: "users", href: "/park" },
  { key: "playground", label: "Playground", short: "Play", icon: "ball", href: "/playground" },
  { key: "market", label: "Market", icon: "market", href: "/market" },
  { key: "guilds", label: "Guilds", icon: "guild", href: "/guilds" },
  { key: "profile", label: "Profile", icon: "person", href: "/profile" },
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
  const pathname = usePathname();
  const active = activePlace(pathname);
  const dock = useRef<HTMLElement>(null);
  const pill = useRef<HTMLSpanElement>(null);

  // The lit slot is one pill that slides from the place you left to the
  // place you chose, so going somewhere is seen happening. It is measured,
  // not guessed: slots are equal on a phone and as wide as their names
  // wider up. Until it is measured (and with no script) the slot lights
  // itself.
  useLayoutEffect(() => {
    const nav = dock.current;
    const shape = pill.current;
    if (!nav || !shape) return;
    const place = () => {
      const on = nav.querySelector<HTMLElement>('[aria-current="page"]');
      if (!on) return;
      shape.style.width = `${on.offsetWidth}px`;
      shape.style.height = `${on.offsetHeight}px`;
      shape.style.transform = `translate(${on.offsetLeft}px, ${on.offsetTop}px)`;
    };
    const first = !nav.hasAttribute("data-pill");
    if (first) shape.style.transition = "none";
    place();
    nav.setAttribute("data-pill", "");
    if (first) {
      void shape.offsetWidth;
      shape.style.transition = "";
    }
    const watch = new ResizeObserver(() => {
      shape.style.transition = "none";
      place();
      void shape.offsetWidth;
      shape.style.transition = "";
    });
    watch.observe(nav);
    return () => watch.disconnect();
  }, [active]);

  return (
    <nav ref={dock} className="pk-dock" aria-label="Pawket">
      <span ref={pill} className={["pk-dock__pill", active === "guilds" && "pk-dock__pill--guild"].filter(Boolean).join(" ")} aria-hidden="true" />
      {PLACES.map((place) => {
        const on = place.key === active;
        return (
          <Link
            key={place.key}
            href={place.href}
            transitionTypes={["nav-place"]}
            aria-current={on ? "page" : undefined}
            // The place you are on, pressed again, goes back to its top — as
            // a phone's own tab bar does — rather than doing nothing.
            onClick={(event) => {
              if (pathname !== place.href) return;
              event.preventDefault();
              const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
              window.scrollTo({ top: 0, behavior: reduce ? "instant" : "smooth" });
            }}
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
            <Icon name={place.icon} size={20} />
            <span className="pk-dock__label">
              {place.short ? <><span className="pk-dock__short">{place.short}</span><span className="pk-dock__long">{place.label}</span></> : place.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
