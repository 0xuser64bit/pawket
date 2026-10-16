"use client";

import NextLink, { useLinkStatus } from "next/link";
import { useEffect, useSyncExternalStore, type ComponentProps } from "react";

/**
 * Every link in Pawket. Going somewhere commits at once to the place's own
 * placeholder (each `loading.tsx`), so most of the time there is nothing
 * more to say. When a place has not been fetched ahead — a slow network, a
 * tap before it could be — the bar at the top of the screen says it is on
 * its way. The link itself is left exactly as it was.
 */
export function NavLink({ children, ...props }: ComponentProps<typeof NextLink>) {
  return (
    <NextLink {...props}>
      {children}
      <Pending />
    </NextLink>
  );
}

let waits = 0;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((listener) => listener());

/** Say a navigation is on its way while `pending` holds: a link's, or a button's transition. */
export function useNavigationWait(pending: boolean) {
  useEffect(() => {
    if (!pending) return;
    waits += 1;
    notify();
    return () => {
      waits -= 1;
      notify();
    };
  }, [pending]);
}

function Pending() {
  useNavigationWait(useLinkStatus().pending);
  return null;
}

/** One line across the top of the screen while a place is on its way; drawn once, in the root layout. */
export function NavProgress() {
  const on = useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => waits > 0,
    () => false,
  );
  return <div className="pk-nav-progress" data-on={on ? "" : undefined} aria-hidden="true" />;
}
