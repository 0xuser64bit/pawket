"use client";

import { useSyncExternalStore } from "react";
import { dayTurnsAt } from "@/lib/utils/format";

const still = () => () => {};

export function DayTurns() {
  const at = useSyncExternalStore(still, () => dayTurnsAt(), () => null);
  return at ? ` A day turns ${at}.` : null;
}
