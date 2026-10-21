"use client";

import NextLink, { useLinkStatus } from "next/link";
import { useEffect, useSyncExternalStore, type ComponentProps } from "react";

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
