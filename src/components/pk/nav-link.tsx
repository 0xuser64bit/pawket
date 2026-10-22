"use client";

import NextLink, { useLinkStatus } from "next/link";
import { useOffline } from "next/offline";
import { useEffect, useRef, useSyncExternalStore, type ComponentProps } from "react";
import { useHere } from "@/lib/native/android";
import { showToast } from "./toast";

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

export function OfflineNote() {
  const offline = useOffline();
  const { here } = useHere();
  const told = useRef(false);
  useEffect(() => {
    if (offline) {
      const wait = setTimeout(() => {
        told.current = true;
        showToast({
          id: "offline",
          tone: "wait",
          title: "You are offline",
          body: `Your pets in ${here} still work. A place read from Solana opens once you are back.`,
        });
      }, 1_000);
      return () => clearTimeout(wait);
    }
    if (!told.current) return;
    told.current = false;
    showToast({ id: "offline", tone: "done", title: "Back online", ttl: 3_000 });
  }, [offline, here]);
  return null;
}
